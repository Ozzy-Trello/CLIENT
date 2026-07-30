export type NotulensiStatus =
  | "draft"
  | "open"
  | "in_progress"
  | "completed"
  | "cancelled";

export type NotulensiPriority = "low" | "medium" | "high" | "urgent";

export type NotulensiScope = "related" | "created" | "assigned" | "all";

export interface NotulensiUser {
  id: string;
  username: string;
  email: string;
}

export interface NotulensiAssignee {
  id: string;
  userId: string;
  user: NotulensiUser | null;
}

export interface NotulensiCommentPermissions {
  canEdit: boolean;
  canDelete: boolean;
}

export interface NotulensiComment {
  id: string;
  notulensiId: string;
  content: string;
  createdBy: string;
  creator: NotulensiUser | null;
  createdAt: string;
  updatedAt: string;
  permissions?: NotulensiCommentPermissions | null;
}

export interface NotulensiStatusHistory {
  id: string;
  notulensiId: string;
  fromStatus: NotulensiStatus | null;
  toStatus: NotulensiStatus;
  changedBy: string;
  actor: NotulensiUser | null;
  createdAt: string;
}

export interface NotulensiPrivateNote {
  id: string;
  notulensiId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotulensiPermissions {
  canEdit: boolean;
  canDelete: boolean;
  canTransition: boolean;
}

export interface NotulensiSummary {
  id: string;
  workspaceId: string;
  code: string;
  title: string;
  content: string;
  status: NotulensiStatus;
  priority: NotulensiPriority;
  dueDate: string | null;
  createdBy: string;
  creator: NotulensiUser | null;
  assignees: NotulensiAssignee[];
  createdAt: string;
  updatedAt: string;
}

export interface NotulensiDetail extends NotulensiSummary {
  comments: NotulensiComment[];
  statusHistory: NotulensiStatusHistory[];
  privateNote: NotulensiPrivateNote | null;
  permissions: NotulensiPermissions;
}

export interface NotulensiPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface NotulensiListFilters {
  search?: string;
  status?: NotulensiStatus[];
  priority?: NotulensiPriority[];
  assigneeId?: string;
  creatorId?: string;
  dueFrom?: string;
  dueTo?: string;
  scope?: NotulensiScope;
  page?: number;
  limit?: number;
}

export interface NotulensiListResponse {
  data: NotulensiSummary[];
  pagination: NotulensiPagination;
}

export interface NotulensiDetailResponse {
  data: NotulensiDetail;
}

export interface NotulensiPrivateNoteResponse {
  data: NotulensiPrivateNote | null;
}

export interface CreateNotulensiPayload {
  title: string;
  content: string;
  status?: Extract<NotulensiStatus, "draft" | "open">;
  priority?: NotulensiPriority;
  dueDate?: string | null;
  assigneeIds: string[];
}

export interface UpdateNotulensiPayload {
  title?: string;
  content?: string;
  priority?: NotulensiPriority;
  dueDate?: string | null;
  assigneeIds?: string[];
}

export interface NotulensiStatusTransitionPayload {
  status: NotulensiStatus;
}

export interface NotulensiCommentPayload {
  content: string;
}

export interface NotulensiPrivateNotePayload {
  content: string;
}

export interface DeleteNotulensiResponse {
  success: boolean;
}
