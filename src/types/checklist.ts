/**
 * Interface for a single checklist item
 */
export interface ChecklistItem {
  label: string;
  checked: boolean;
  dueDate?: string; // ISO date string format
  assigneeId?: string; // User ID of the assignee
  assigneeName?: string; // Optional name of the assignee for display purposes
  due_date?: string;
  assignee_name?: string;
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
}

/**
 * Data required to update an existing checklist
 */
export interface UpdateChecklistDTO {
  title?: string;
  data: ChecklistItem[];
}

/**
 * Full checklist data structure
 */
export interface ChecklistDTO {
  id: string;
  card_id: string;
  title: string;
  data: ChecklistItem[];
  created_at?: Date;
  updated_at?: Date;
}
