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

export interface Color {
  color: string;
  percent: number;
}

export interface Label {
  id: string;
  title: string;
  color: string;
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

export interface PostAutomationRule {
  groupType: string;
  type: string;
  condition: PostAutomationRuleCondition;
  filter?: any;
  workspaceId: string;
  action: PostAutomationRuleAction[];
}
export interface PostAutomationRuleCondition{
  [key: string]: any | undefined;
}
export interface PostAutomationRuleAction {
  groupType: string;
  type: string;
  condition: PostAutomationRuleCondition;
}