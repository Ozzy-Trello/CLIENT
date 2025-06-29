export enum EnumCustomFieldType {
  Checkbox = "checkbox",
  Dropdown = "dropdown",
  Number = "number",
  Text = "text",
  Date = "date",
}
export enum EnumCustomFieldSource {
  User = "user",
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
}

export interface CustomOption {
  value: string;
  label: string;
}
