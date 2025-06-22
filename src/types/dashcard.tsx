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
}

// Filter value types
export type FilterValue = string | string[] | boolean | null;

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
  options?: FilterOption[];
  icon?: ReactNode;
}

// Dashcard configuration
export interface DashcardConfig {
  id: string;
  name: string;
  backgroundColor: string;
  filters: DashcardFilter[];
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
      { label: "any", value: FilterOperator.ANY },
      { label: "starts with", value: FilterOperator.STARTS_WITH },
      { label: "matches with", value: FilterOperator.MATCHES_WITH },
    ],
  },
  {
    id: "list",
    label: "List",
    groupType: "primary",
    type: EnumCardAttributeType.LIST,
    operator: FilterOperator.ANY,
    options: [
      { label: "any", value: FilterOperator.ANY },
      { label: "starts with", value: FilterOperator.STARTS_WITH },
      { label: "matches with", value: FilterOperator.MATCHES_WITH },
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
      { label: "select", value: "select" },
      { label: "is within", value: "is_within" },
      { label: "is empty", value: "is_empty" },
    ],
  },
  {
    id: "labels",
    label: "Labels",
    groupType: "primary",
    type: EnumCardAttributeType.LABELS,
    options: [
      { label: "select", value: "select" },
      { label: "includes", value: "includes" },
      { label: "does not include", value: "does_not_include" },
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
];
