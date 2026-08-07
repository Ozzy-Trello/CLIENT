export type NotulensiStatus =
  | "new"
  | "in_progress"
  | "waiting_review"
  | "revision"
  | "completed"
  | "cancelled";

export type NotulensiPriority = "urgent" | "reg" | "minor";

export type NotulensiProgress = 0 | 25 | 50 | 75 | 100;

export type NotulensiAction =
  | "start"
  | "submit_review"
  | "request_revision"
  | "complete"
  | "undo_complete"
  | "cancel"
  | "update_progress";

export type NotulensiScope = "related" | "created" | "assigned" | "all";

export type NotulensiSortBy =
  | "title"
  | "status"
  | "progress"
  | "priority"
  | "due_date"
  | "creator"
  | "created_at"
  | "updated_at";

export type NotulensiSortOrder = "asc" | "desc";

export interface NotulensiUser {
  id: string;
  username: string;
  email: string;
  role?: { id: string; name: string } | null;
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
  canUploadAttachment: boolean;
  canDeleteAttachment: boolean;
}

export interface NotulensiSummaryPermissions {
  canDelete: boolean;
}

export interface NotulensiReadReceipt {
  userId: string;
  openedAt: string;
  user: NotulensiUser | null;
}

export interface NotulensiSummary {
  id: string;
  workspaceId: string;
  code: string;
  title: string;
  content: string;
  status: NotulensiStatus;
  priority: NotulensiPriority;
  progress: NotulensiProgress;
  dueDate: string | null;
  createdBy: string;
  creator: NotulensiUser | null;
  assignees: NotulensiAssignee[];
  allowedActions: NotulensiAction[];
  permissions?: NotulensiSummaryPermissions | null;
  currentUserOpenedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotulensiDetail extends NotulensiSummary {
  comments: NotulensiComment[];
  statusHistory: NotulensiStatusHistory[];
  privateNote: NotulensiPrivateNote | null;
  permissions?: NotulensiPermissions | null;
  readReceipts: NotulensiReadReceipt[];
  attachments: NotulensiAttachment[];
}

export interface NotulensiAttachment {
  id: string;
  fileId: string;
  name: string | null;
  url: string | null;
  size: number | null;
  sizeUnit: string | null;
  mimeType: string | null;
  uploadedBy: string;
  uploader: NotulensiUser | null;
  createdAt: string;
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
  sortBy?: NotulensiSortBy;
  sortOrder?: NotulensiSortOrder;
  page?: number;
  limit?: number;
}

export interface NotulensiListResponse {
  data: NotulensiSummary[];
  pagination: NotulensiPagination;
  status_counts: Record<NotulensiStatus, number>;
}

export interface NotulensiDetailResponse {
  data: NotulensiDetail;
}

export interface NotulensiAttachmentResponse {
  data: NotulensiAttachment;
}

export interface NotulensiExportTask {
  id: string;
  code: string;
  title: string;
  content: string;
  status: NotulensiStatus;
  progress: NotulensiProgress;
  priority: NotulensiPriority;
  dueDate: string | null;
  creatorName: string | null;
  creatorEmail: string | null;
  creatorRole: string | null;
  assignees: string[];
  assigneeRoles: string[];
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
}

export interface NotulensiExportReadReceipt {
  taskCode: string;
  userName: string | null;
  userRole: string | null;
  openedAt: string;
}

export interface NotulensiExportStatusHistory {
  taskCode: string;
  fromStatus: NotulensiStatus | null;
  toStatus: NotulensiStatus;
  actorName: string | null;
  actorRole: string | null;
  createdAt: string;
}

export interface NotulensiExportComment {
  taskCode: string;
  content: string;
  authorName: string | null;
  authorRole: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotulensiExportAttachment {
  taskCode: string;
  name: string | null;
  url: string | null;
  size: number | null;
  sizeUnit: string | null;
  mimeType: string | null;
  uploadedBy: string | null;
  uploaderRole: string | null;
  createdAt: string;
}

export interface NotulensiExportResponse {
  data: {
    tasks: NotulensiExportTask[];
    readReceipts: NotulensiExportReadReceipt[];
    statusHistory: NotulensiExportStatusHistory[];
    comments: NotulensiExportComment[];
    attachments: NotulensiExportAttachment[];
  };
}

export interface NotulensiPrivateNoteResponse {
  data: NotulensiPrivateNote | null;
}

export interface CreateNotulensiPayload {
  title: string;
  content?: string | null;
  priority?: NotulensiPriority;
  dueDate?: string | null;
  assigneeIds: string[];
}

export interface UpdateNotulensiPayload {
  title?: string;
  content?: string | null;
  priority?: NotulensiPriority;
  dueDate?: string | null;
  assigneeIds?: string[];
}

export type NotulensiWorkflowAction = Exclude<NotulensiAction, "update_progress">;

export interface NotulensiProgressPayload {
  progress: NotulensiProgress;
}

export interface NotulensiEligibleAssigneesResponse {
  data: NotulensiUser[];
}

export interface NotulensiCommentPayload {
  content: string;
}

export interface NotulensiPrivateNotePayload {
  content: string;
}

export interface RenameNotulensiAttachmentPayload {
  name: string;
}

export interface DeleteNotulensiResponse {
  success: boolean;
}
