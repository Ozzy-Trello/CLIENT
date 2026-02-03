/**
 * Interface for a single checklist item
 */
export interface ChecklistItem {
  id?: string;
  label: string;
  checked: boolean;
  dueDate?: string; // ISO date string format
  assigneeId?: string; // User ID of the assignee
  assigneeName?: string; // Optional name of the assignee for display purposes
  due_date?: string;
  assignee_name?: string;
  assignee_id?: string;
  assigfnee_id?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Data required to create a new checklist
 */
export interface CreateChecklistDTO {
  card_id: string;
  title: string;
  data: ChecklistItem[];
  order_index?: number;
}

/**
 * Data required to update an existing checklist
 */
export interface UpdateChecklistDTO {
  title?: string;
  data: ChecklistItem[];
  order_index?: number;
}

/**
 * Full checklist data structure
 */
export interface ChecklistDTO {
  id: string;
  card_id: string;
  title: string;
  data: ChecklistItem[];
  order_index?: number;
  created_at?: Date;
  updated_at?: Date;
}
