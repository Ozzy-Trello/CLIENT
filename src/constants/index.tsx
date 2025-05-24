// Define the possible attribute types
export enum CardAttributeType {
  TEXT = "text",
  DATE = "date",
  BOOLEAN = "boolean",
  USER = "user",
  LABEL = "label",
  DROPDOWN = "dropdown",
  CUSTOM = "custom"
}

// Define the possible operators for filtering
export enum FilterOperator {
  EQUALS = "equals",
  CONTAINS = "contains", 
  STARTS_WITH = "starts_with",
  IS_ONE_OF = "is_one_of",
  INCLUDES_ANY_OF = "includes_any_of",
  IS_BEFORE = "is_before",
  IS_AFTER = "is_after",
  IS_BETWEEN = "is_between",
  IS_EMPTY = "is_empty",
  IS_NOT_EMPTY = "is_not_empty"
}

// Interface for card attribute definitions
export interface CardAttribute {
  id: string;
  name: string;
  type: CardAttributeType;
  allowedOperators: FilterOperator[];
  defaultOperator?: FilterOperator;
}

// Define all your card attributes
export const CARD_ATTRIBUTES: Record<string, CardAttribute> = {
  ASSIGNED: {
    id: "assigned",
    name: "Assigned",
    type: CardAttributeType.USER,
    allowedOperators: [FilterOperator.INCLUDES_ANY_OF, FilterOperator.IS_EMPTY, FilterOperator.IS_NOT_EMPTY]
  },
  IS_COMPLETED: {
    id: "is_completed",
    name: "Complete",
    type: CardAttributeType.BOOLEAN,
    allowedOperators: [FilterOperator.EQUALS]
  },
  CREATED_AT: {
    id: "created_at",
    name: "Created at",
    type: CardAttributeType.DATE,
    allowedOperators: [FilterOperator.IS_BEFORE, FilterOperator.IS_AFTER, FilterOperator.IS_BETWEEN]
  },
  LABELS: {
    id: "labels",
    name: "Labels",
    type: CardAttributeType.LABEL,
    allowedOperators: [FilterOperator.INCLUDES_ANY_OF, FilterOperator.IS_EMPTY, FilterOperator.IS_NOT_EMPTY]
  },
  LAST_MODIFIED: {
    id: "last_modified",
    name: "Last modified",
    type: CardAttributeType.DATE,
    allowedOperators: [FilterOperator.IS_BEFORE, FilterOperator.IS_AFTER, FilterOperator.IS_BETWEEN]
  },
  START_DATE: {
    id: "start_date",
    name: "Start date",
    type: CardAttributeType.DATE,
    allowedOperators: [FilterOperator.IS_BEFORE, FilterOperator.IS_AFTER, FilterOperator.IS_BETWEEN]
  },
  DUE_DATE: {
    id: "due_date",
    name: "Due date",
    type: CardAttributeType.DATE,
    allowedOperators: [FilterOperator.IS_BEFORE, FilterOperator.IS_AFTER, FilterOperator.IS_BETWEEN]
  },
  BOARD: {
    id: "board",
    name: "Board",
    type: CardAttributeType.DROPDOWN,
    allowedOperators: [FilterOperator.IS_ONE_OF]
  },
  LIST: {
    id: "list",
    name: "List",
    type: CardAttributeType.TEXT,
    allowedOperators: [FilterOperator.STARTS_WITH, FilterOperator.CONTAINS, FilterOperator.EQUALS]
  }
};

// Filter configuration interface
export interface FilterConfig {
  attribute: string;
  operator: FilterOperator;
  value: any;
}

// Complete dashboard configuration
export interface DashcardConfig {
  name: string;
  filters: FilterConfig[];
  appearance: {
    backgroundColor: string;
    // Other appearance settings
  };
}