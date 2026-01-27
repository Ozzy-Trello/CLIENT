import { CardListSortBy, CardSortOrder } from "@api/card";

export type ListSortKey =
  | "manual"
  | "created_desc"
  | "created_asc"
  | "name_asc"
  | "name_desc";

export interface ListSortOption {
  key: ListSortKey;
  label: string;
  sortBy: CardListSortBy;
  sortOrder: CardSortOrder;
  description?: string;
  group?: string;
  showInFilter?: boolean;
}

export const LIST_SORT_OPTIONS: ListSortOption[] = [
  {
    key: "manual",
    label: "Manual order",
    sortBy: "order",
    sortOrder: "asc",
    description: "Maintain the order by dragging",
  },
  {
    key: "created_desc",
    label: "Newest first",
    sortBy: "created_at",
    sortOrder: "desc",
    group: "Created at",
    description: "Show newest cards on top",
    showInFilter: true,
  },
  {
    key: "created_asc",
    label: "Oldest first",
    sortBy: "created_at",
    sortOrder: "asc",
    group: "Created at",
    description: "Show oldest cards on top",
    showInFilter: true,
  },
  {
    key: "name_asc",
    label: "Name A → Z",
    sortBy: "name",
    sortOrder: "asc",
    group: "Name",
    description: "Alphabetical order",
    showInFilter: true,
  },
  {
    key: "name_desc",
    label: "Name Z → A",
    sortBy: "name",
    sortOrder: "desc",
    group: "Name",
    description: "Reverse alphabetical order",
    showInFilter: true,
  },
];
