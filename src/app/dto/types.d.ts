import { Action } from "@reduxjs/toolkit";

export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  paginate: Pagination;
}

export interface Pagination {
  limit: number;
  page: number;
  totalData: number;
  totalPage: number;
  nextPage: number;
  prevPage: number;
}

export interface User {
  id: string;
  username: string;
  fullname: string;
  email: string;
  phone: string;
  refreshToken?: string;
  accessToken?: string;
  avatar?: string;
  roleName?: string;
}

export interface Board {
  id: string;
  workspaceId?: string;
  name?: string;
  cover?: string;
  background?: string;
  isStarred?: boolean;
  description?: string;
  visibility?: string;
  createdBy?: User;
  createdAt: string;
  updatedBy?: User;
  upatedAt?: string;
}

export interface Color {
  color: string;
  percent: number;
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  slug: string;
}

// Basic types for card elements
export interface Attachment {
  id: string;
  filename: string;
  url: string;
  type?: string;
  addedAt: string;
  isCover?: boolean;
}

export interface Label {
  id: string;
  title: string;
  color: string;
}

export interface CardTime {
  inList: string; // Duration in list (e.g., "1 second", "22 hours")
  onBoard: string; // Duration on board (e.g., "1 month", "3 months")
  lastActivity?: string; // ISO date string
}

// export interface ActivityItem {
//   id: string;
//   type: string; // "comment", "update", "attachment", "move", etc.
//   content: string;
//   user: User;
//   timestamp: string;
//   via?: string; // e.g., "Butler"
//   attachments?: Attachment[];
//   referencedCardId?: string; // For @card mentions
// }
export interface CardActivity {
  id: string;
  senderUsername: string; // "comment", "update", "attachment", "move", etc.
  senderUserId: string;
  type: "text" | "action";
  text: string;
  source: AcitivitySource;
}

export interface AcitivitySource {
  actionType: string;
  fromId: string;
  from: string;
  destination: string;
  destinationId: string;
  tagId: string;
  tagName: string;
}

// For custom fields
export type CustomFieldValueType =
  | "text"
  | "number"
  | "date"
  | "checkbox"
  | "dropdown";

export interface CustomField {
  id: string;
  boardId: string;
  name: string;
  description: string;
  source: string | CustomOption;
  type?: CustomFieldValueType;
  trigger: Trigger;
  value?: string;
}

export interface CustomOption {
  value: string;
  label: string;
}

export interface Trigger {
  id?: string;
  name?: string;
  conditionValue?: string;
  workspaceId?: string;
  action?: TriggerAction;
}

export interface TriggerAction {
  targetListId?: string;
  messageTelegram: string;
  labelCardId?: string;
}

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

// Checklist item
export interface ChecklistItem {
  id: string;
  title: string;
  isComplete: boolean;
  assignedTo?: User[];
  dueDate?: string;
}

// Checklist
export interface Checklist {
  id: string;
  title: string;
  items: ChecklistItem[];
  progress: number; // Percentage 0-100
}

// Define the core Card type
export interface Card {
  id: string;
  listId: string;
  name: string;
  description?: string;
  cover?: Attachment | null;
  attachments?: Attachment[];
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
  location?: string;
  createdAt?: string;
  updatedAt?: string;
  requests?: CardRequest[];
}

// Counter Card (used in filter columns)
export interface CounterCard extends Card {
  isCounter: true;
  count: number;
  filterCriteria?: any; // Define specific filter criteria structure
}

// Regular List/Column
export interface List {
  id: string;
  boardId: string;
  name?: string;
  cover?: string;
  type?: "regular";
  cardIds?: string[];
  cards?: Card[];
  position?: number;
  type?: string;
}

// Filter List/Column
export interface FilterList {
  id: string;
  boardId: string;
  name?: string;
  type?: "filter";
  cardIds?: string[];
  cards?: Card[];
  position?: number;
  filterCriteria?: any; // Define specific filter criteria structure
}

export interface CardRequest {
  id: number;
  cardId: string;
  requestType: string;
  requestedItemId: string;
  requestAmount: number;
  requestAmount: number;
  is_verified: boolean;
  isVerified: boolean;
  adjustment_no: string;
  adjustmentNo: string;
  description: string;
  itemName: string;
  adjustment_name: string;
  adjustmentName: string;
  createdAt: string;
  updatedAt: string;
  cardName: string;
  requestReceived?: number;
  requestSent?: number;
  satuan?: string;
}

export type AnyList = List | FilterList;
