import { CustomOption } from "@dto/types";
import { EnumCustomFieldSource, EnumCustomFieldType } from "./custom-field";
import { DashcardConfig } from "./dashcard";
import { FileUpload } from "./file-upload";
import { AcitivitySource, Checklist } from "./type";
import { User } from "./user";
import { Label } from "./label";
import { EnumOptionPosition } from "./options";

export enum EnumCardType {
  Regular = "regular",
  Dashcard = "dashcard",
}
export type TCardType = EnumCardType.Regular | EnumCardType.Dashcard;
export interface Card {
  id: string;
  listName?: string;
  listId: string;
  boardId?: string;
  boardName?: string;
  workspaceId?: string;
  workspaceName?: string;
  type: TCardType;
  name: string;
  description?: string;
  location?: string;
  cover?: string;
  attachments?: CardAttachment[];
  labels?: Label[];
  members?: User[];
  customFields?: CardCustomField[];
  requests?: any[];
  timeInLists?: CardTimeInList[];
  formattedTimeInBoard?: string;
  formattedTimeInList?: string;
  activity?: CardActivity[];
  checklists?: Checklist[];
  isWatched?: boolean;
  isComplete?: boolean;
  completed_at?: string;
  archive?: boolean;
  position?: number;
  order?: number;
  startDate?: Date;
  dueDate?: Date;
  dueDateReminder?: string;
  dashConfig?: DashcardConfig | undefined;
  createdAt?: string;
  updatedAt?: string;
  itemDashcard?: IItemDashcard[] | null;
  mirrorId?: string;
  sourceCard?: any;
  poAmount?: number;
  bahan?: boolean; // Whether the card requires material/fabric
  shortId?: number; // Auto-increment short ID for QR codes
  // Allow null to explicitly clear relations via UpdateCard
  productId?: string | null; // Foreign key to Product
  productCodeId?: string | null; // Foreign key to ProductCode
  bahanId?: string | null; // Foreign key to Bahan
  warnaId?: string | null; // Foreign key to Warna
  productInfo?: {
    id: string;
    name: string;
  };
  bahanInfo?: {
    id: string;
    name: string;
  };
  warnaInfo?: {
    id: string;
    name: string;
  };
  productCodeInfo?: {
    id: string;
    code: string;
    description?: string;
  };
  jumlahDikirim?: number | string | null;
  jumlahProduksi?: number | string | null;
  
  // Backend API response properties (snake_case versions)
  list_id?: string;
  list_name?: string;
  board_id?: string;
  board_name?: string;
  workspace_id?: string;
  workspace_name?: string;
  short_id?: number;
  po_amount?: number;
}

export enum EnumAttachmentType {
  File = "file",
  Card = "card",
}

export enum EnumCardAttachmentType {
  Attachment = "attachment",
  Bukti = "bukti",
  PO = "PO",
}

export type TAttachableType = EnumAttachmentType.File | EnumAttachmentType.Card;
export type TCardAttachmentType = EnumCardAttachmentType.Attachment | EnumCardAttachmentType.Bukti | EnumCardAttachmentType.PO;

export interface CardAttachment {
  id: string;
  isCover: boolean;
  isPrinted?: boolean;
  cardId: string;
  attachableType: TAttachableType;
  attachableId: string;
  type: TCardAttachmentType;
  createdBy?: string;
  createdAt?: string;
  name?: string;
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

export enum EnumCardActivityType {
  Action = "action",
  Comment = "comment",
}

export interface CardActivity {
  id?: string;
  cardId?: string;
  senderUserUsername?: string; // "comment", "update", "attachment", "move", etc.
  senderUserId?: string;
  activityType?: EnumCardActivityType;
  triggeredBy?: string;
  action?: CardActivityAction;
  comment?: CardActivityComment;
  createdAt?: string;
}

export interface CardActivityAction {
  id?: string;
  activity_id?: string;
  action?: string;
  old_value?: any;
  new_value?: any;
  newValue?: any;
}

export interface CardActivityComment {
  id?: string;
  text: string;
}

export interface CardCustomField {
  cardId?: string;
  id?: string;
  name?: string;
  description?: string;
  source?: EnumCustomFieldSource;
  type?: EnumCustomFieldType;
  options?: CustomOption[];
  isShowAtFront?: boolean;
  valueString?: string;
  valueNumber?: number;
  valueOption?: string | null;
  valueCheckbox?: boolean;
  valueDate?: Date;
  valueUserId?: string;
  canView?: boolean;
  canEdit?: boolean;
  isPublic?: boolean;
}

export interface CardMember {
  id?: string;
  cardId?: string;
  userId?: string;
  created_at?: Date;
}

export type TDynamicColumnDashcard = {
  type: string;
  column: string;
  value: string;
};

export type TMemberDashcard = {
  id: string;
  name: string;
};

export interface IItemDashcard {
  id: string;
  name: string;
  member: TMemberDashcard[];
  description: string;
  boardId: string;
  listId: string;
  columns: TDynamicColumnDashcard[];
  dueDate?: Date | null;
  createdAt?: Date | string | null;
  listName?: string;
  productInfo?: {
    id: string;
    name: string;
  };
  bahanInfo?: {
    id: string;
    name: string;
  };
  warnaInfo?: {
    id: string;
    name: string;
  };
}

export interface CopycardPost {
  cardId: string;
  name: string;
  withLabels: boolean;
  withlabels?: boolean;
  withMembers?: boolean;
  withAttachments?: boolean;
  withCustomFields?: boolean;
  withComments?: boolean;
  withChecklists?: boolean;
  targetBoardId?: string;
  targetListId?: string;
  position?: string | number | EnumOptionPosition;
}

export interface ListDashcardDataResponse {
  dashConfig: DashcardConfig;
  items: IItemDashcard[];
}
