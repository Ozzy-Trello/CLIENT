import { FileUpload } from "./file-upload";
import { AcitivitySource, Checklist, CustomField, Label } from "./type";
import { User } from "./user";

export interface Card {
  id: string;
  listId: string;
  name: string;
  description?: string;
  location?: string;
  cover?: string;
  attachments?: CardAttachment[];
  labels?: Label[];
  members?: User[];
  customFields?: CustomField[];
  time?: CardTime;
  activity?: CardActivity[];
  checklists?: Checklist[];
  isWatched?: boolean;
  isArchived?: boolean;
  position?: number;
  dueDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export enum AttachmentType {
  File = 'file',
  Card = 'card',
}
export type AttachableType = AttachmentType.File | AttachmentType.Card;
export interface CardAttachment {
  id: string;
  isCover: boolean;
  cardId: string;
  attachableType: AttachableType;
  attachableId: string;
  createdBy?: string;
  createdAt?: string;
  file?: FileUpload;
  card?: Card;
}

export interface CardTime {
  inList: string; // Duration in list (e.g., "1 second", "22 hours")
  onBoard: string; // Duration on board (e.g., "1 month", "3 months")
  lastActivity?: string; // ISO date string
}


export interface CardActivity {
  id: string;
  senderUsername: string; // "comment", "update", "attachment", "move", etc.
  senderId: string;
  type: "text" | "action";
  text: string;
  source: AcitivitySource;
}
