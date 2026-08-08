export enum EnumCustomFieldType {
  Checkbox = "checkbox",
  Dropdown = "dropdown",
  Number = "number",
  Text = "text",
  Date = "date",
}
export enum EnumCustomFieldSource {
  User = "user",
  Role = "role",
  Product = "product",
  Custom = "custom",
}
export interface CustomField {
  id: string;
  workspaceId?: string;
  boardId?: string;
  name: string;
  description: string;
  source: string; // Can be EnumCustomFieldSource values or "user-role:roleIds"
  type?: EnumCustomFieldType;
  options?: CustomOption[] | undefined;
  isShowAtFront?: boolean;
  value?: string;
  canView?: string[];
  canEdit?: string[];
  canViewBoards?: string[]; // Board UUIDs that can view this field
  canEditBoards?: string[]; // Board UUIDs that can edit this field
  order?: number;
}

export interface CustomOption {
  value: string;
  label: string;
}
