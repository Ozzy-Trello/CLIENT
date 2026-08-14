import {
  NotulensiListFilters,
  NotulensiPriority,
  NotulensiScope,
  NotulensiSortBy,
  NotulensiSortOrder,
  NotulensiStatus,
} from "@myTypes/notulensi";

const statuses: NotulensiStatus[] = ["new", "in_progress", "waiting_review", "revision", "completed", "cancelled"];
const priorities: NotulensiPriority[] = ["urgent", "reg", "minor"];
const scopes: NotulensiScope[] = ["related", "created", "assigned", "all"];
const sortFields: NotulensiSortBy[] = ["title", "status", "progress", "priority", "due_date", "creator", "created_at", "updated_at"];
const sortOrders: NotulensiSortOrder[] = ["asc", "desc"];
const strings = (value: unknown) => Array.isArray(value) && value.every((item) => typeof item === "string") ? value : undefined;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ids = (value: unknown) => strings(value)?.filter((item) => uuid.test(item));
const date = (value: unknown) => typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : undefined;

export const parseNotulensiFilters = (raw: string | null, allowAll: boolean): NotulensiListFilters => {
  const defaults: NotulensiListFilters = { scope: "related", page: 1, limit: 20 };
  if (!raw) return defaults;
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    const scope = scopes.includes(value.scope as NotulensiScope) ? value.scope as NotulensiScope : "related";
    return {
      search: typeof value.search === "string" ? value.search : undefined,
      status: strings(value.status)?.filter((item): item is NotulensiStatus => statuses.includes(item as NotulensiStatus)),
      priority: strings(value.priority)?.filter((item): item is NotulensiPriority => priorities.includes(item as NotulensiPriority)),
      assigneeIds: ids(value.assigneeIds),
      roleIds: ids(value.roleIds),
      dueFrom: date(value.dueFrom),
      dueTo: date(value.dueTo),
      scope: scope === "all" && !allowAll ? "related" : scope,
      sortBy: sortFields.includes(value.sortBy as NotulensiSortBy) ? value.sortBy as NotulensiSortBy : undefined,
      sortOrder: sortOrders.includes(value.sortOrder as NotulensiSortOrder) ? value.sortOrder as NotulensiSortOrder : undefined,
      page: 1,
      limit: typeof value.limit === "number" && value.limit > 0 ? value.limit : 20,
    };
  } catch {
    return defaults;
  }
};

export const persistedNotulensiFilters = ({ page: _page, ...filters }: NotulensiListFilters) => filters;
