import { useEffect, useState } from "react";
import { LookupCache, Kind } from "@utils/lookup-cache";
import { boardDetails } from "../api/board";
import { listDetails } from "../api/list";
import { customFieldDetails } from "../api/custom_field";
import { userDetails } from "../api/account";

interface RuleLike {
  condition: any;
  action?: { condition: any }[];
}

function collectIds(rules: RuleLike[]): Record<Kind, Set<string>> {
  const result: Record<Kind, Set<string>> = {
    board: new Set(),
    list: new Set(),
    user: new Set(),
    field: new Set(),
  } as any;

  const push = (kind: Kind, val?: any) => {
    if (typeof val === "string" && /^[0-9a-f]{8}-/i.test(val))
      result[kind].add(val);
  };

  rules.forEach((r) => {
    push("board", r.condition?.board);
    push("field", (r.condition?.fields as any)?.value ?? r.condition?.fields);
    push("field", r.condition?.fieldValue);
    push("user", r.condition?.fieldValue);
    push("list", r.condition?.list);
    push("user", r.condition?.user);
    if (Array.isArray(r.condition?.optionalBy?.data))
      r.condition.optionalBy.data.forEach((uid: string) => push("user", uid));

    // also inspect each action's condition
    if (Array.isArray(r.action)) {
      r.action.forEach((act) => {
        const c = act?.condition || {};
        push("board", c.board);
        push("field", (c?.fields as any)?.value ?? c?.fields);
        push("field", c.fieldValue);
        push("user", c.fieldValue);
        push("list", c.list);
        push("user", c.user);
        if (Array.isArray(c?.optionalBy?.data))
          c.optionalBy.data.forEach((uid: string) => push("user", uid));
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

    const fetchForSingle = async (
      kind: Kind,
      fn: (id: string) => Promise<any>,
      idSet: Set<string>
    ) => {
      const unknown = Array.from(idSet).filter(
        (id) => !LookupCache.label(kind, id)
      );
      console.log("[LOOKUP] unknown", unknown);
      await Promise.all(
        unknown.map(async (id) => {
          try {
            console.log(`[LOOKUP] fetching ${kind} ${id}`);
            const res = await fn(id);
            const row = res?.data;
            if (row && (row.name || row.username || row.label || row.title)) {
              const name = row.name || row.username || row.label || row.title;
              LookupCache.rememberMany(kind, [{ id, name }]);
              // if this is a custom field fetch, also store its options label for value lookup
              if (kind === "field" && Array.isArray(row.options)) {
                const opts = row.options.map((o: any) => ({
                  id: o.value,
                  name: o.label,
                }));
                LookupCache.rememberMany("field", opts as any);
              }
              console.log("[LOOKUP] result", kind, row);
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
      ]);
      setLoading(false);
      setVersion((v) => v + 1);
    })();
  }, [rules]);

  return { loading, version };
}
