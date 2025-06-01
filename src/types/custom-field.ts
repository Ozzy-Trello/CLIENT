import { CustomOption } from "./type";

export type CustomFieldValueType =
  | "text"
  | "number"
  | "date"
  | "checkbox"
  | "dropdown";

export interface CardCustomField {
  customFieldId: string;
  cardId?: string;
  id?: string;
  name?: string;
  description?: string;
  source?: string | CustomOption[];
  type?: CustomFieldValueType;
  value?: string;
}