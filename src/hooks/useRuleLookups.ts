import { useEffect, useState } from "react";
import { LookupCache, Kind } from "@utils/lookup-cache";
import { boardDetails } from "../api/board";
import { listDetails } from "../api/list";
import { customFieldDetails } from "../api/custom_field";
import { userDetails } from "../api/account";
import { api } from "../api";

// Simple role details function
const roleDetails = async (id: string) => {
  console.log(`[LOOKUP] Fetching role details for ID: ${id}`);
  try {
    const response = await api.get(`/roles/${id}`);
    console.log(`[LOOKUP] Role API response for ${id}:`, response.data);
    // The role API returns { data: { id, name, description, default } }
    return response.data.data || response.data;
  } catch (error) {
    console.error(`[LOOKUP] Error fetching role ${id}:`, error);
    throw error;
  }
};

interface RuleLike {
  condition: any;
  action?: { condition: any; type?: string }[];
  filter?: { condition: any }[];
}

function collectIds(rules: RuleLike[]): Record<Kind, Set<string>> {
  const result: Record<Kind, Set<string>> = {
    board: new Set(),
    list: new Set(),
    user: new Set(),
    field: new Set(),
    role: new Set(),
  } as any;

  const push = (kind: Kind, val?: any) => {
    if (typeof val === "string" && /^[0-9a-f]{8}-/i.test(val))
      result[kind].add(val);
  };

  // Helper to extract possible option UUIDs from a condition object
  const pushOptionValues = (cond: any) => {
    if (!cond) return;
    ["valueOption", "value_option", "optionValue", "option_value"].forEach(
      (k) => {
        if (cond[k]) {
          console.log("[LOOKUP] Pushing option UUID:", cond[k]);
          push("field", cond[k]);
        }
      }
    );
    if (cond.fields && typeof cond.fields === "object") {
      ["valueOption", "value_option"].forEach((k) => {
        if (cond.fields[k]) {
          console.log("[LOOKUP] Pushing option UUID (fields):", cond.fields[k]);
          push("field", cond.fields[k]);
        }
      });
    }
  };

  rules.forEach((r) => {
    console.log("[LOOKUP] Processing rule:", {
      hasAction: !!r.action,
      actionCount: r.action?.length || 0,
      hasFilter: !!r.filter,
      filterCount: r.filter?.length || 0,
    });

    push("board", r.condition?.board);
    push("field", (r.condition?.fields as any)?.value ?? r.condition?.fields);
    push("field", r.condition?.fieldValue);
    push("user", r.condition?.fieldValue);
    push("list", r.condition?.list);
    push("user", r.condition?.user);

    // Debug role collection
    console.log("[LOOKUP] Checking for roles in condition:", {
      hasOptionalBy: !!r.condition?.optionalBy,
      optionalByData: r.condition?.optionalBy?.data,
      isArray: Array.isArray(r.condition?.optionalBy?.data),
    });

    if (Array.isArray(r.condition?.optionalBy?.data)) {
      console.log(
        "[LOOKUP] Found role IDs in condition:",
        r.condition.optionalBy.data
      );
      r.condition.optionalBy.data.forEach((uid: string) => push("role", uid));
    }
    pushOptionValues(r.condition);

    // also inspect each action's condition
    if (Array.isArray(r.action)) {
      r.action.forEach((act, index) => {
        console.log(`[LOOKUP] Processing action ${index}:`, {
          type: act.type,
          condition: act.condition,
        });

        const c = act?.condition || {};
        push("board", c.board);
        push("field", (c?.fields as any)?.value ?? c?.fields);
        push("field", c.fieldValue);
        push("user", c.fieldValue);
        push("list", c.list);
        push("user", c.user);

        // Add cascade action properties
        push("list", c.optionalList);
        push("board", c.opationalBoard);

        // Debug list collection in actions
        if (c.list) {
          console.log(`[LOOKUP] Found list ID in action: ${c.list}`);
        }
        if (c.optionalList) {
          console.log(
            `[LOOKUP] Found optionalList ID in action: ${c.optionalList}`
          );
        }

        // Debug all properties in action condition
        if (c.list || c.board || c.optionalList || c.opationalBoard) {
          console.log(`[LOOKUP] Action condition properties:`, {
            list: c.list,
            board: c.board,
            optionalList: c.optionalList,
            opationalBoard: c.opationalBoard,
          });
        }

        // Debug role collection in actions
        console.log("[LOOKUP] Checking for roles in action:", {
          hasOptionalBy: !!c?.optionalBy,
          optionalByData: c?.optionalBy?.data,
          isArray: Array.isArray(c?.optionalBy?.data),
        });

        if (Array.isArray(c?.optionalBy?.data)) {
          console.log("[LOOKUP] Found role IDs in action:", c.optionalBy.data);
          c.optionalBy.data.forEach((uid: string) => push("role", uid));
        }
        pushOptionValues(c);
      });
    }

    // also inspect filter conditions
    if (Array.isArray(r.filter)) {
      r.filter.forEach((filter) => {
        const c = filter?.condition || {};
        push("list", c.list);
        push("board", c.board);

        if (c.list) {
          console.log(`[LOOKUP] Found list ID in filter: ${c.list}`);
        }
        if (c.board) {
          console.log(`[LOOKUP] Found board ID in filter: ${c.board}`);
        }
      });
    }
  });

  return result;
}

export function useRuleLookups(rules: RuleLike[]) {
  const [loading, setLoading] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!rules?.length) return;
    const ids = collectIds(rules);

    console.log("[LOOKUP] Collected IDs:", {
      boards: Array.from(ids.board),
      lists: Array.from(ids.list),
      users: Array.from(ids.user),
      fields: Array.from(ids.field),
      roles: Array.from(ids.role),
    });

    const fetchForSingle = async (
      kind: Kind,
      fn: (id: string) => Promise<any>,
      idSet: Set<string>
    ) => {
      const unknown = Array.from(idSet).filter(
        (id) => !LookupCache.label(kind, id)
      );
      console.log(`[LOOKUP] unknown ${kind}:`, unknown);
      await Promise.all(
        unknown.map(async (id) => {
          try {
            console.log(`[LOOKUP] fetching ${kind} ${id}`);
            const res = await fn(id);
            const row = res?.data;
            console.log(`[LOOKUP] ${kind} API response for ${id}:`, res);
            if (row && (row.name || row.username || row.label || row.title)) {
              const name = row.name || row.username || row.label || row.title;
              LookupCache.rememberMany(kind, [{ id, name }]);
              console.log(`[LOOKUP] Cached ${kind} ${id} -> ${name}`);
              if (kind === "field" && Array.isArray(row.options)) {
                const opts = row.options.map((o: any) => ({
                  id: o.value,
                  name: o.label,
                }));
                console.log("[LOOKUP] Caching options for field", id, opts);
                LookupCache.rememberMany("field", opts as any);
              }
              console.log("[LOOKUP] result", kind, row);
            } else {
              console.log(`[LOOKUP] No name found for ${kind} ${id}:`, row);
            }
          } catch (err) {
            console.error("[LOOKUP] failed", kind, id, err);
          }
        })
      );
    };

    (async () => {
      setLoading(true);
      await Promise.all([
        fetchForSingle("board", boardDetails as any, ids.board),
        fetchForSingle("list", listDetails as any, ids.list),
        fetchForSingle("field", customFieldDetails as any, ids.field),
        fetchForSingle("user", userDetails as any, ids.user),
        fetchForSingle("role", roleDetails as any, ids.role),
      ]);
      setLoading(false);
      setVersion((v) => v + 1);
    })();
  }, [rules]);

  return { loading, version };
}
