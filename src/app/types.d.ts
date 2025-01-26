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

export interface Comment {
  id: string;
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
  attachment?: Attachment;
  dueDate?: string;
  assignment?: Assignment;
  createdBy?: User;
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: User;
  members?: User[];
  comments?: {
    list: Comment[];
    meta: Meta
  };
  customFields?: {
    list: CustomFields[];
  };
}
  
export interface Column {
  id: string;
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
  avatarUrl?: string;
}

export interface Board {
  id: string;
  title: string;
  cover: string;
  isStarred: boolean;
  visibility: string;
  createdBy?: User;
  createdAt: string;
  updatedBy?: User;
  upatedAt: string;
}
