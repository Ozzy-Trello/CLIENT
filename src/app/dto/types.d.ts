export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
}

export interface User {
  id: string;
  username: string;
  fullname: string;
  email: string;
  refreshToken?: string;
  accessToken?: string;
  avatar?: string;
  roleName?:string;
}

export interface Board {
  id: string;
  workspaceId: string;
  title: string;
  cover: string;
  backgroundColor: color[] | string;
  isStarred: boolean;
  visibility: string;
  createdBy?: User;
  createdAt: string;
  updatedBy?: User;
  upatedAt: string;
}

export interface Color {
  color: string;
  percent: number;
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
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

export interface ActivityItem {
  id: string;
  type: string; // "comment", "update", "attachment", "move", etc.
  content: string;
  user: User;
  timestamp: string;
  via?: string; // e.g., "Butler"
  attachments?: Attachment[];
  referencedCardId?: string; // For @card mentions
}

// For custom fields
export type CustomFieldValueType = 'text' | 'number' | 'date' | 'checkbox' | 'select' | 'user';

export interface CustomFieldValue {
  value: string | number | boolean | null;
  displayValue?: string;
  type: CustomFieldValueType;
  options?: { id: string; value: string; color?: string }[];
  selectedOption?: { id: string; value: string; color?: string };
}

export interface CustomField {
  id: string;
  name: string;
  type: CustomFieldValueType;
  value: CustomFieldValue | null;
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
  title: string;
  description?: string;
  cover?: Attachment | null;
  attachments: Attachment[];
  labels: Label[];
  members: User[];
  customFields: CustomField[];
  time: CardTime;
  activity: ActivityItem[];
  checklists: Checklist[];
  isWatched: boolean;
  isArchived: boolean;
  position: number;
  dueDate?: string;
  location?: string;
  createdAt: string;
  updatedAt: string;
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
  title: string;
  cover?: string;
  type: 'regular';
  cardIds: string[];
  position: number;
}

// Filter List/Column
export interface FilterList {
  id: string;
  title: string;
  type: 'filter';
  cardIds: string[];
  position: number;
  filterCriteria?: any; // Define specific filter criteria structure
}

export type AnyList = List | FilterList;
