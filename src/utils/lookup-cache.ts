// Simple in-memory cache for friendly names of various entities (board, list, user, field).
// This is per-tab (cleared on refresh) – good enough for UI rendering.
export type Kind = "board" | "list" | "user" | "field";

class LookupCacheCls {
  private data: Record<Kind, Map<string, string>> = {
    board: new Map(),
    list: new Map(),
    user: new Map(),
    field: new Map(),
  } as any;

  rememberMany(kind: Kind, entries: Array<{ id: string; name: string }>) {
    entries.forEach(({ id, name }) => {
      if (id) this.data[kind].set(id, name);
    });
  }

  label(kind: Kind, id: string): string | undefined {
    return this.data[kind].get(id);
  }

  any(id: string): string | undefined {
    for (const kind of Object.keys(this.data) as Kind[]) {
      const hit = this.data[kind].get(id);
      if (hit) return hit;
    }
    return undefined;
  }
}

export const LookupCache = new LookupCacheCls();
