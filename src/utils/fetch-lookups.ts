import { LookupCache, Kind } from "./lookup-cache";

/**
 * Fetch and cache friendly names for unknown IDs of a given kind.
 * @param kind   The entity kind (board | list | user | field)
 * @param ids    Array of ids to ensure are cached
 * @param fetchFn Async function (id) => ApiResponse<Record<string, any>> or plain object
 */
export async function fetchLookups(
  kind: Kind,
  ids: string[],
  fetchFn: (id: string) => Promise<any>
) {
  const unknownIds = Array.from(new Set(ids)).filter(
    (id) => !LookupCache.label(kind, id)
  );
  if (!unknownIds.length) return;

  await Promise.all(
    unknownIds.map(async (id) => {
      try {
        const res = await fetchFn(id);
        const row = res?.data ?? res;
        if (!row) return;
        const name =
          row.name || row.fullname || row.username || row.label || row.title;
        if (name) {
          LookupCache.rememberMany(kind, [{ id, name }]);
        }

        // Special case: custom field => also cache its options for value lookup
        if (kind === "field" && Array.isArray(row.options)) {
          const opts = row.options.map((o: any) => ({
            id: o.value,
            name: o.label,
          }));
          LookupCache.rememberMany("field", opts as any);
        }
      } catch (err) {
        console.error(`[fetchLookups] failed ${kind} ${id}`, err);
      }
    })
  );
}
