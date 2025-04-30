import { Action } from "@reduxjs/toolkit";

export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  paginate?: Pagination;
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

export interface CardAttachment {
  id: string;
  isCover: boolean;
  cardId: string;
  fileId: string;
  createdBy: string;
  createdAt: string;
  file?: FileAttachment;
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


export interface CardActivity {
  id: string;
  senderUsername: string; // "comment", "update", "attachment", "move", etc.
  senderId: string;
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
  triggerId?: string;
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


// Automation Rule interface to accomodate selection state of automation rule setting
export interface AutomationRule {
  triggerType: string;
  triggerItem?: SelectedTriggerItem;
  actions?: SelectedAction[];
}

export interface SelectedTriggerItem {
  type?: string;
  label?: string;
  filter?: SelectedCardFilter;
  [key: string]: GeneralOptions | string | undefined;
}

export interface SelectedCardFilter {
  type?: string;
  selectedItem?: SelectedCardFilterItem;
}

export interface SelectedCardFilterItem {
  type: string;
  label: string;
  [key: string]: GeneralOptions  | string | undefined;
}

export interface SelectedAction {
  type?: string;
  selectedActionItem?: SelectedActionItem;
}
export interface SelectedActionItem {
  type: string;
  label?: string;
  [key: string]: GeneralOptions  | string | undefined;
}

// Trigger interface to accomodate the static trigger data use to construct trigger UI
export interface TriggerType {
  type: string;
  icon: any;
  label: any;
  items?: TriggerItems[];
}

export interface TriggerItems {
  type: string;
  label: string;
  [key: string]: TriggerItemSelection | string | undefined;
}

export interface TriggerItemSelection {
  options?: GeneralOptions[] // to store the options
  value?: GeneralOptions | null | undefined // to store selected option
}

// Action interface to accomodate the static action data to construct acttionUI
export interface ActionType {
  type: string;
  icon: any;
  label: any;
  items?: ActionItems[];
}

export interface ActionItems {
  type: string;
  label: string;
  [key: string]: TriggerItemSelection  | string | undefined;
}

export interface GeneralOptions {
  value: string;
  label: React.ReactNode;
}

export interface TriggerAction {
  targetListId?: string;
  messageTelegram: string;
  labelCardId?: string;
}

// trigger card filter interface to accomodate the static card filter data use to construct the filter UI
export interface CardTriggerFilterType {
  type: string;
  icon: any;
  label: any;
  items: CardTriggerFilterItem[]
}

export interface CardTriggerFilterItem {
  type: string;
  label: string;
  [key: string]: TriggerItemSelection  | string | undefined;
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
  location?: string;
  cover?: CardAttachment | null;
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
  location?: string;
  createdAt?: string;
  updatedAt?: string;
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

export type AnyList = List | FilterList;

export interface FileAttachment {
  id: string;
  name: string;
  url: string;
  size: number;
  sizeUnit: string;
  mimeType: string;
  createdBy: string;
  createdAt: string;
}

export interface PostAutomationRule {
  groupType: string;
  type: string;
  condition: PostAutomationRuleCondition;
  filter?: any;
  workspaceId: string;
  action: PostAutomationRuleAction
}
export interface PostAutomationRuleCondition{
  [key: string]: any | undefined;
}
export interface PostAutomationRuleAction {
  groupType: string;
  type: string;
  condition: PostAutomationRuleCondition;
}