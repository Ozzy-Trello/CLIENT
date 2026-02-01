import { useEffect, useState } from "react";
import { LookupCache, Kind } from "@utils/lookup-cache";
import { boardDetails } from "../api/board";
import { listDetails } from "../api/list";
import { customFieldDetails } from "../api/custom_field";
import { userDetails } from "../api/account";
import { labelDetails } from "../api/label";
import { api } from "../api";
import { getProduct } from "../api/product";

// Simple role details function
const roleDetails = async (id: string) => {
  try {
    const response = await api.get(`/roles/${id}`);
    // The role API returns { data: { id, name, description, default } }
    return response.data.data || response.data;
  } catch (error) {
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
    label: new Set(),
    role: new Set(),
    product: new Set(),
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
          push("field", cond[k]);
        }
      }
    );
    if (cond.fields && typeof cond.fields === "object") {
      ["valueOption", "value_option"].forEach((k) => {
        if (cond.fields[k]) {
          push("field", cond.fields[k]);
        }
      });
    }
  };

  rules.forEach((r) => {
    push("board", r.condition?.board);
    push("field", (r.condition?.fields as any)?.value ?? r.condition?.fields);
    push("field", r.condition?.fieldValue);
    push("user", r.condition?.fieldValue);
    push("list", r.condition?.list);
    push("user", r.condition?.user);
    push("product", r.condition?.product);

    if (Array.isArray(r.condition?.optionalBy?.data)) {
      r.condition.optionalBy.data.forEach((uid: string) => push("role", uid));
    }
    pushOptionValues(r.condition);

    // also inspect each action's condition
    if (Array.isArray(r.action)) {
      r.action.forEach((act, index) => {
        const c = act?.condition || {};
        push("board", c.board);
        push("field", (c?.fields as any)?.value ?? c?.fields);
        push("field", c.fieldValue);
        push("user", c.fieldValue);
        push("list", c.list);
        push("user", c.user);
        push("product", c.product);

        // Add cascade action properties
        push("list", c.optionalList);
        push("board", c.opationalBoard);

        // Add label ID collection (both snake_case and camelCase)
        push("label", c.card_label);
        push("label", c.cardLabel);

        if (Array.isArray(c?.optionalBy?.data)) {
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
      await Promise.all(
        unknown.map(async (id) => {
          try {
            const res = await fn(id);
            const row = res?.data;
            if (row && (row.name || row.username || row.label || row.title)) {
              const name = row.name || row.username || row.label || row.title;
              LookupCache.rememberMany(kind, [{ id, name }]);
              if (kind === "field" && Array.isArray(row.options)) {
                const opts = row.options.map((o: any) => ({
                  id: o.value,
                  name: o.label,
                }));
                LookupCache.rememberMany("field", opts as any);
              }
            }
          } catch (err) {
            // Error handling without logging
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
        fetchForSingle("label", labelDetails as any, ids.label),
        fetchForSingle("role", roleDetails as any, ids.role),
        fetchForSingle("product", productDetails as any, ids.product),
      ]);
      setLoading(false);
      setVersion((v) => v + 1);
    })();
  }, [rules]);

  return { loading, version };
}
const productDetails = async (id: string) => {
  const response = await getProduct(id);
  return response.data;
};
