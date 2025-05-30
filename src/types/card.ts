import { CustomOption } from "@dto/types";
import { EnumCustomFieldSource, EnumCustomFieldType } from "./custom-field";
import { DashcardConfig } from "./dashcard";
import { FileUpload } from "./file-upload";
import { AcitivitySource, Checklist, Label } from "./type";
import { User } from "./user";

export enum EnumCardType {
  Regular = 'regular',
  Dashcard = 'dashcard'
};
export type TCardType = EnumCardType.Regular | EnumCardType.Dashcard;
export interface Card {
  id: string;
  listId: string;
  type: TCardType;
  name: string;
  description?: string;
  location?: string;
  cover?: string;
  attachments?: CardAttachment[];
  labels?: Label[];
  members?: User[];
  customFields?: CardCustomField[];
  timeInLists?: CardTimeInList[];
  formattedTimeInBoard?: string;
  formattedTimeInList?: string;
  activity?: CardActivity[];
  checklists?: Checklist[];
  isWatched?: boolean;
  isArchived?: boolean;
  position?: number;
  order?: number;
  startDate?: Date;
  dueDate?: Date;
  dueDateReminder?: string;
  dashConfig?: DashcardConfig;
  createdAt?: string;
  updatedAt?: string;
}

export enum EnumAttachmentType {
  File = 'file',
  Card = 'card',
}
export type TAttachableType = EnumAttachmentType.File | EnumAttachmentType.Card;
export interface CardAttachment {
  id: string;
  isCover: boolean;
  cardId: string;
  attachableType: TAttachableType;
  attachableId: string;
  createdBy?: string;
  createdAt?: string;
  file?: FileUpload;
  targetCard?: Card;
}

export interface CardTimeInList {
  cardId: string;
  listId: string;
  listName: string;
  eneteredAt: string;
  exitedAt: string;
  totalSeconds: number;
  formattedTimeInList: string;
}


export interface CardActivity {
  id: string;
  senderUsername: string; // "comment", "update", "attachment", "move", etc.
  senderId: string;
  type: "text" | "action";
  text: string;
  source: AcitivitySource;
}

export interface CardCustomField {
  cardId?: string;
  id?: string;
  name?: string;
  description?: string;
  source?: EnumCustomFieldSource;
  type?: EnumCustomFieldType;
  options?: CustomOption[];
  valueString?: string;
  valueNumber?: number;
  valueOption?: string;
  valueCheckbox?:boolean;
  valueDate?: Date;
  valueUserId?: string;
}