import { api } from "@api/index";
import {
  CreateNotulensiPayload,
  DeleteNotulensiResponse,
  NotulensiComment,
  NotulensiCommentPayload,
  NotulensiAttachmentResponse,
  NotulensiDetailResponse,
  NotulensiExportResponse,
  NotulensiListFilters,
  NotulensiListResponse,
  NotulensiPrivateNotePayload,
  NotulensiPrivateNoteResponse,
  NotulensiEligibleAssigneesResponse,
  NotulensiProgress,
  NotulensiWorkflowAction,
  UpdateNotulensiPayload,
} from "@myTypes/notulensi";

const notulensiBasePath = (workspaceId: string) =>
  `/workspace/${workspaceId}/notulensi`;

const omitEmpty = (filters: NotulensiListFilters) => {
  const params: Record<string, string | number | undefined> = {
    search: filters.search?.trim() || undefined,
    status: filters.status?.length ? filters.status.join(",") : undefined,
    priority: filters.priority?.length ? filters.priority.join(",") : undefined,
    assignee_id: filters.assigneeId || undefined,
    creator_id: filters.creatorId || undefined,
    due_from: filters.dueFrom || undefined,
    due_to: filters.dueTo || undefined,
    scope: filters.scope || undefined,
    page: filters.page,
    limit: filters.limit,
  };

  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== "")
  );
};

const exportParams = (filters: NotulensiListFilters) => {
  const { page: _page, limit: _limit, ...activeFilters } = filters;
  return omitEmpty(activeFilters);
};

export const getNotulensiList = async (
  workspaceId: string,
  filters: NotulensiListFilters = {}
): Promise<NotulensiListResponse> => {
  const response = await api.get(notulensiBasePath(workspaceId), {
    params: omitEmpty(filters),
  });
  return response.data;
};

export const createNotulensi = async (
  workspaceId: string,
  payload: CreateNotulensiPayload
): Promise<NotulensiDetailResponse> => {
  const response = await api.post(notulensiBasePath(workspaceId), payload);
  return response.data;
};

export const openNotulensi = async (
  workspaceId: string,
  id: string
): Promise<NotulensiDetailResponse> => {
  const response = await api.post(`${notulensiBasePath(workspaceId)}/${id}/open`);
  return response.data;
};

export const getNotulensiDetail = async (
  workspaceId: string,
  id: string
): Promise<NotulensiDetailResponse> => {
  const response = await api.get(`${notulensiBasePath(workspaceId)}/${id}`);
  return response.data;
};

export const deleteNotulensi = async (
  workspaceId: string,
  id: string
): Promise<DeleteNotulensiResponse> => {
  const response = await api.delete(`${notulensiBasePath(workspaceId)}/${id}`);
  return response.data;
};

export const uploadNotulensiAttachment = async (
  workspaceId: string,
  id: string,
  file: File
): Promise<NotulensiAttachmentResponse> => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post(
    `${notulensiBasePath(workspaceId)}/${id}/attachments`,
    formData
  );
  return response.data;
};

export const deleteNotulensiAttachment = async (
  workspaceId: string,
  id: string,
  attachmentId: string
): Promise<{ success: boolean }> => {
  const response = await api.delete(
    `${notulensiBasePath(workspaceId)}/${id}/attachments/${attachmentId}`
  );
  return response.data;
};

export const exportNotulensi = async (
  workspaceId: string,
  filters: NotulensiListFilters
): Promise<NotulensiExportResponse> => {
  const response = await api.get(`${notulensiBasePath(workspaceId)}/export`, {
    params: exportParams(filters),
  });
  return response.data;
};

export const updateNotulensi = async (
  workspaceId: string,
  id: string,
  payload: UpdateNotulensiPayload
): Promise<NotulensiDetailResponse> => {
  const response = await api.patch(`${notulensiBasePath(workspaceId)}/${id}`, payload);
  return response.data;
};

export const runNotulensiAction = async (
  workspaceId: string,
  id: string,
  action: NotulensiWorkflowAction
): Promise<NotulensiDetailResponse> => {
  const response = await api.post(
    `${notulensiBasePath(workspaceId)}/${id}/actions/${action.replaceAll("_", "-")}`
  );
  return response.data;
};

export const updateNotulensiProgress = async (
  workspaceId: string,
  id: string,
  progress: NotulensiProgress
): Promise<NotulensiDetailResponse> => {
  const response = await api.patch(
    `${notulensiBasePath(workspaceId)}/${id}/progress`,
    { progress }
  );
  return response.data;
};

export const getNotulensiEligibleAssignees = async (
  workspaceId: string
): Promise<NotulensiEligibleAssigneesResponse> => {
  const response = await api.get(`${notulensiBasePath(workspaceId)}/eligible-assignees`);
  return response.data;
};

export const getNotulensiMentionUsers = async (
  workspaceId: string
): Promise<NotulensiEligibleAssigneesResponse> => {
  const response = await api.get(`${notulensiBasePath(workspaceId)}/mention-users`);
  return response.data;
};

export const createNotulensiComment = async (
  workspaceId: string,
  id: string,
  payload: NotulensiCommentPayload
): Promise<{ data: NotulensiComment }> => {
  const response = await api.post(
    `${notulensiBasePath(workspaceId)}/${id}/comments`,
    payload
  );
  return response.data;
};

export const updateNotulensiComment = async (
  workspaceId: string,
  id: string,
  commentId: string,
  payload: NotulensiCommentPayload
): Promise<{ data: NotulensiComment }> => {
  const response = await api.patch(
    `${notulensiBasePath(workspaceId)}/${id}/comments/${commentId}`,
    payload
  );
  return response.data;
};

export const deleteNotulensiComment = async (
  workspaceId: string,
  id: string,
  commentId: string
): Promise<{ success: boolean }> => {
  const response = await api.delete(
    `${notulensiBasePath(workspaceId)}/${id}/comments/${commentId}`
  );
  return response.data;
};

export const getNotulensiPrivateNote = async (
  workspaceId: string,
  id: string
): Promise<NotulensiPrivateNoteResponse> => {
  const response = await api.get(
    `${notulensiBasePath(workspaceId)}/${id}/private-note`
  );
  return response.data;
};

export const updateNotulensiPrivateNote = async (
  workspaceId: string,
  id: string,
  payload: NotulensiPrivateNotePayload
): Promise<NotulensiPrivateNoteResponse> => {
  const response = await api.put(
    `${notulensiBasePath(workspaceId)}/${id}/private-note`,
    payload
  );
  return response.data;
};

export const deleteNotulensiPrivateNote = async (
  workspaceId: string,
  id: string
): Promise<{ success: boolean }> => {
  const response = await api.delete(
    `${notulensiBasePath(workspaceId)}/${id}/private-note`
  );
  return response.data;
};
