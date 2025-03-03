export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
}

export interface Attachment{
  id: string;
  type?: string;
  url: string;
  filename: string;
}

export interface CustomFields {
  type?: string;
  key?: string;
  value?: any;
}

export interface Meta {
  currentPage?: number;
  sizePerPage?: number;
  actualCount?: number;
}

export const LOG_TYPE_COMMENT = "comment";
export const LOG_TYPE_MEMBER_ADDITION = "member addition";
export const LOG_TYPE_MEMBER_REMOVAL = "member removal";
export const LOG_TYPE_MEMBER_REMOVAL = "member removal";
export const LOG_TYPE_DUE_DATE_SETTELMENT = "due date settelement";
export const LOG_TYPE_FILE_ATTACHMENT = "file attachment";
export const LOG_TYPE_CARD_MOVEMENT = "card movement";
export const LOG_TYPE_CARD_ADDITION = "card addition";

export interface Logs {
  id: string;
  type: srting;
  content: string;
  attachments?: Attachment[];
  createdBy?: User;
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: User;
}

export interface Assignment {
  assignee?: User;
  assignedBy?: User;
  assignedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  type?:string;
  cover?: string;
  attachment?: Attachment;
  dueDate?: string;
  assignment?: Assignment;
  createdBy?: User;
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: User;
  members?: User[];
  logs?: {
    list: Logs[];
    meta: Meta
  };
  customFields?: {
    list: CustomFields[];
  };
}
  
export interface Column {
  id: string;
  type: string;
  title: string;
  taskIds: string[];
}

export interface BoardData {
  columns: { [key: string]: Column };
  tasks: { [key: string]: Task };
  columnOrder: string[];
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