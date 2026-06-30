import { ReactNode } from "react";

// Enum for card attribute types
export enum EnumCardAttributeType {
  ASSIGNED = "assigned",
  IS_COMPLETED = "is_completed",
  CREATED_AT = "created_at",
  LABELS = "labels",
  LAST_MODIFIED = "last_modified",
  START_DATE = "start_date",
  DUE_DATE = "due_date",
  CUSTOM_FIELD = "custom_field",
  BOARD = "board",
  LIST = "list",
  PRODUCT = "product",
  BAHAN = "bahan",
  WARNA = "warna",
  PRODUCE_CODE = "product_code",
}

// Filter operator types
export enum FilterOperator {
  ANY = "any",
  EQUALS = "equals",
  NOT_EQUALS = "not_equals",
  CONTAINS = "contains",
  NOT_CONTAINS = "not_contains",
  STARTS_WITH = "starts_with",
  MATCHES_WITH = "matches_with",
  INCLUDES_ANY_OF = "includes_any_of",
  IS_ONE_OF = "is_one_of",
  IS_NOT_ONE_OF = "is_not_one_of",
  IS_BETWEEN = "is_between",
  ANY_VALUE = "any_value",
  NO_VALUE = "no_value",
  CHECKED = "checked",
  UNCHECKED = "unchecked",
}

// Filter value types
export type FilterValue =
  | string
  | string[]
  | boolean
  | null
  | { from?: string; to?: string }
  | {
    type: string;
    number: number;
    unit: string;
    reference: string;
  };

// Base filter interface
export interface FilterOption {
  label: string;
  value: string;
}

// Definition for a dashcard filter
export interface DashcardFilter {
  id: string;
  label?: string;
  groupType?: string;
  type: EnumCardAttributeType;
  operator?: FilterOperator;
  value?: FilterValue;
  displayValue?: string; // Resolved name(s) from backend
  options?: FilterOption[];
  icon?: ReactNode;
}

// Display type for dashcard metrics
export enum DashcardDisplayType {
  CARD_COUNT = "card_count",
  CUSTOM_FIELD_SUM = "custom_field_sum",
}

// Display configuration for dashcard
export interface DashcardDisplayConfig {
  type: DashcardDisplayType;
  customFieldId?: string; // Required when type is CUSTOM_FIELD_SUM
  customFieldName?: string; // For display purposes
}

// Dashcard configuration
export interface DashcardConfig {
  id: string;
  name: string;
  backgroundColor: string;
  filters: DashcardFilter[];
  displayConfig?: DashcardDisplayConfig; // Optional, defaults to card count
  visibleColumns?: string[];
  columnOrder?: string[];
}

// Sample filters data
export const dashcardsFilter: DashcardFilter[] = [
  {
    id: "board",
    label: "Board",
    groupType: "primary",
    type: EnumCardAttributeType.BOARD,
    operator: FilterOperator.ANY,
    options: [
      { label: "any", value: "any" },
      { label: "on this board", value: "on_this_board" },
      { label: "is one of", value: "is_one_of" },
      { label: "is not one of", value: "is_not_one_of" },
      { label: "name starts with", value: "name_starts_with" },
      { label: "name matches", value: "name_matches" },
    ],
  },
  {
    id: "list",
    label: "List",
    groupType: "primary",
    type: EnumCardAttributeType.LIST,
    operator: FilterOperator.ANY,
    options: [
      { label: "any", value: "any" },
      { label: "on this list", value: "on_this_list" },
      { label: "is one of", value: "is_one_of" },
      { label: "is not one of", value: "is_not_one_of" },
      { label: "name starts with", value: "name_starts_with" },
      { label: "name matches", value: "name_matches" },
    ],
  },
  {
    id: "assigned",
    label: "Assigned",
    groupType: "primary",
    type: EnumCardAttributeType.ASSIGNED,
    operator: undefined,
    options: [
      { label: "includes any of", value: FilterOperator.INCLUDES_ANY_OF },
      { label: "does not include", value: FilterOperator.NOT_CONTAINS },
    ],
  },
  {
    id: "due",
    label: "Due",
    groupType: "primary",
    type: EnumCardAttributeType.DUE_DATE,
    options: [
      { label: "today", value: "today" },
      { label: "this week", value: "this_week" },
      { label: "this month", value: "this_month" },
      { label: "in the past", value: "in_the_past" },
      { label: "in the future", value: "in_the_future" },
      { label: "any time", value: "any_time" },
      { label: "no date", value: "no_date" },
      { label: "later than", value: "later_than" },
      { label: "earlier than", value: "earlier_than" },
    ],
  },
  {
    id: "created_at",
    label: "Created At",
    groupType: "primary",
    type: EnumCardAttributeType.CREATED_AT,
    options: [
      { label: "today", value: "today" },
      { label: "this week", value: "this_week" },
      { label: "this month", value: "this_month" },
      { label: "in the past", value: "in_the_past" },
      { label: "in the future", value: "in_the_future" },
      { label: "any time", value: "any_time" },
      { label: "no date", value: "no_date" },
      { label: "later than", value: "later_than" },
      { label: "earlier than", value: "earlier_than" },
    ],
  },
  {
    id: "labels",
    label: "Labels",
    groupType: "primary",
    type: EnumCardAttributeType.LABELS,
    options: [
      { label: "any", value: FilterOperator.ANY },
      { label: "is one of", value: FilterOperator.IS_ONE_OF },
      { label: "is not one of", value: FilterOperator.IS_NOT_ONE_OF },
      { label: "has a value", value: FilterOperator.ANY_VALUE },
      { label: "has no value", value: FilterOperator.NO_VALUE },
      { label: "name starts with", value: FilterOperator.STARTS_WITH },
      { label: "name matches", value: FilterOperator.MATCHES_WITH },
    ],
  },
  {
    id: "complete",
    label: "Complete",
    groupType: "primary",
    type: EnumCardAttributeType.IS_COMPLETED,
    options: [
      { label: "no", value: "false" },
      { label: "yes", value: "true" },
    ],
  },
  {
    id: "product",
    label: "Produk",
    groupType: "primary",
    type: EnumCardAttributeType.PRODUCT,
    options: [
      { label: "any", value: FilterOperator.ANY },
      { label: "is one of", value: FilterOperator.IS_ONE_OF },
      { label: "is not one of", value: FilterOperator.IS_NOT_ONE_OF },
      { label: "has a value", value: FilterOperator.ANY_VALUE },
      { label: "has no value", value: FilterOperator.NO_VALUE },
    ],
  },
  {
    id: "bahan",
    label: "Bahan",
    groupType: "primary",
    type: EnumCardAttributeType.BAHAN,
    options: [
      { label: "any", value: FilterOperator.ANY },
      { label: "is one of", value: FilterOperator.IS_ONE_OF },
      { label: "is not one of", value: FilterOperator.IS_NOT_ONE_OF },
      { label: "has a value", value: FilterOperator.ANY_VALUE },
      { label: "has no value", value: FilterOperator.NO_VALUE },
    ],
  },
  {
    id: "warna",
    label: "Warna",
    groupType: "primary",
    type: EnumCardAttributeType.WARNA,
    options: [
      { label: "any", value: FilterOperator.ANY },
      { label: "is one of", value: FilterOperator.IS_ONE_OF },
      { label: "is not one of", value: FilterOperator.IS_NOT_ONE_OF },
      { label: "has a value", value: FilterOperator.ANY_VALUE },
      { label: "has no value", value: FilterOperator.NO_VALUE },
    ],
  },
  {
    id: "product_code",
    label: "Kode Produk",
    groupType: "primary",
    type: EnumCardAttributeType.PRODUCE_CODE,
    options: [
      { label: "any", value: FilterOperator.ANY },
      { label: "is one of", value: FilterOperator.IS_ONE_OF },
      { label: "is not one of", value: FilterOperator.IS_NOT_ONE_OF },
      { label: "has a value", value: FilterOperator.ANY_VALUE },
      { label: "has no value", value: FilterOperator.NO_VALUE },
    ],
  },
];
