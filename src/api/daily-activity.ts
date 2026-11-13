import { api } from "@api/index";
import { uploadFile } from "@api/file";
import {
  DailyActivityAccessStatus,
  DailyActivityComment,
  DailyActivityConfiguration,
  DailyActivityDay,
  DailyActivityReport,
  DailyActivityStructureRole,
  DailyActivityUser,
  DailyActivityLeaveRequest,
} from "@myTypes/daily-activity";

const asArray = <T>(value: unknown): T[] => Array.isArray(value) ? value : [];
const payloadOf = (value: any) => value?.data?.data ?? value?.data ?? value;
const field = (value: any, snake: string, camel: string) => value?.[snake] ?? value?.[camel];

function normalizeUser(value: any): DailyActivityUser {
  return {
    ...value,
    role_id: field(value, "role_id", "roleId") ?? null,
    role_name: field(value, "role_name", "roleName") ?? value?.role?.name ?? null,
  };
}

function normalizeStructureRole(value: any): DailyActivityStructureRole {
  return {
    ...value,
    manager_role_id: field(value, "manager_role_id", "managerRoleId") ?? null,
    members: asArray<any>(value?.members).map(normalizeUser),
  };
}

function normalizeReference(value: any) {
  return {
    ...value,
    reference_type: field(value, "reference_type", "referenceType"),
    file_id: field(value, "file_id", "fileId") ?? null,
    card_id: field(value, "card_id", "cardId") ?? null,
    notulensi_id: field(value, "notulensi_id", "notulensiId") ?? null,
    display_text: field(value, "display_text", "displayText") ?? null,
    file_url: field(value, "file_url", "fileUrl") ?? null,
    file_mime_type: field(value, "file_mime_type", "fileMimeType") ?? null,
    card: value?.card ?? null,
    notulensi: value?.notulensi ? {
      ...value.notulensi,
      workspace_id: field(value.notulensi, "workspace_id", "workspaceId"),
    } : null,
  };
}

function normalizeActivity(value: any) {
  return {
    ...value,
    report_id: field(value, "report_id", "reportId"),
    comments_count: field(value, "comments_count", "commentsCount") ?? 0,
    references: asArray<any>(value?.references).map(normalizeReference),
  };
}

function normalizeReport(value: any): DailyActivityReport {
  return {
    ...value,
    user_id: field(value, "user_id", "userId"),
    work_date: field(value, "work_date", "workDate"),
    first_submitted_at: field(value, "first_submitted_at", "firstSubmittedAt") ?? null,
    reviewed_by: field(value, "reviewed_by", "reviewedBy") ?? null,
    reviewed_at: field(value, "reviewed_at", "reviewedAt") ?? null,
    can_review: field(value, "can_review", "canReview") ?? false,
    review_required: field(value, "review_required", "reviewRequired") ?? false,
    activities: asArray<any>(value?.activities).map(normalizeActivity),
    history: asArray<any>(value?.history).map((entry) => ({
      ...entry,
      created_at: field(entry, "created_at", "createdAt"),
    })),
  };
}

function normalizeDay(value: any): DailyActivityDay {
  return {
    ...value,
    user_id: field(value, "user_id", "userId"),
    role_name: field(value, "role_name", "roleName") ?? null,
    work_date: field(value, "work_date", "workDate"),
    report_id: field(value, "report_id", "reportId") ?? null,
    leave: value?.leave ? {
      ...value.leave,
      start_date: field(value.leave, "start_date", "startDate"),
      end_date: field(value.leave, "end_date", "endDate"),
    } : null,
    submitted_at: field(value, "submitted_at", "submittedAt") ?? null,
    deadline_time: field(value, "deadline_time", "deadlineTime"),
    reviewed_by: field(value, "reviewed_by", "reviewedBy") ?? null,
    reviewed_at: field(value, "reviewed_at", "reviewedAt") ?? null,
    can_review: field(value, "can_review", "canReview") ?? false,
    review_required: field(value, "review_required", "reviewRequired") ?? false,
    activities: asArray<any>(value?.activities).map(normalizeActivity),
  };
}

function normalizeLeaveRequest(value: any): DailyActivityLeaveRequest {
  return {
    ...value,
    user_id: field(value, "user_id", "userId"),
    employee_name: field(value, "employee_name", "employeeName"),
    employee_role_name: field(value, "employee_role_name", "employeeRoleName") ?? null,
    approver_role_id: field(value, "approver_role_id", "approverRoleId") ?? null,
    approver_role_name: field(value, "approver_role_name", "approverRoleName") ?? null,
    start_date: field(value, "start_date", "startDate"),
    end_date: field(value, "end_date", "endDate"),
    total_days: Number(field(value, "total_days", "totalDays") || 0),
    decision_note: field(value, "decision_note", "decisionNote") ?? null,
    decided_by: field(value, "decided_by", "decidedBy") ?? null,
    decided_by_name: field(value, "decided_by_name", "decidedByName") ?? null,
    decided_at: field(value, "decided_at", "decidedAt") ?? null,
    created_at: field(value, "created_at", "createdAt"),
  };
}

export async function getDailyActivityAccessStatus(): Promise<DailyActivityAccessStatus> {
  const { data } = await api.get("/daily-activity/access-status");
  const payload = payloadOf(data);
  const unreadComment = field(payload, "oldest_unread_comment", "oldestUnreadComment");
  const pendingReview = field(payload, "oldest_pending_review", "oldestPendingReview");
  return {
    ...payload,
    missed_dates: asArray<string>(field(payload, "missed_dates", "missedDates")),
    oldest_missed_date: field(payload, "oldest_missed_date", "oldestMissedDate") ?? null,
    unread_comment_count: Number(field(payload, "unread_comment_count", "unreadCommentCount") || 0),
    oldest_unread_comment: unreadComment ? {
      comment_id: field(unreadComment, "comment_id", "commentId"),
      report_id: field(unreadComment, "report_id", "reportId"),
      item_id: field(unreadComment, "item_id", "itemId"),
      work_date: field(unreadComment, "work_date", "workDate"),
      owner_id: field(unreadComment, "owner_id", "ownerId"),
    } : null,
    pending_review_count: Number(field(payload, "pending_review_count", "pendingReviewCount") || 0),
    oldest_pending_review: pendingReview ? {
      report_id: field(pendingReview, "report_id", "reportId"),
      work_date: field(pendingReview, "work_date", "workDate"),
      user_id: field(pendingReview, "user_id", "userId"),
    } : null,
  };
}

export async function simulateDailyActivityAccess(userId: string, date: string, time: string) {
  const { data } = await api.post("/daily-activity/access-simulation", { user_id: userId, date, time });
  const payload = payloadOf(data);
  return {
    ...payload,
    user_id: field(payload, "user_id", "userId"),
    missed_dates: asArray<string>(field(payload, "missed_dates", "missedDates")),
    oldest_missed_date: field(payload, "oldest_missed_date", "oldestMissedDate") ?? null,
  } as DailyActivityAccessStatus & { user_id: string; username: string; date: string; time: string };
}

export async function getMyDailyActivity(workDate: string) {
  const { data } = await api.get("/daily-activity/my-report", { params: { work_date: workDate } });
  const payload = payloadOf(data);
  return { ...payload, work_date: field(payload, "work_date", "workDate"), report: payload?.report ? normalizeReport(payload.report) : null } as { work_date: string; required: boolean; report: DailyActivityReport | null };
}

export async function getMyDailyActivityLeaveRequests(): Promise<DailyActivityLeaveRequest[]> {
  const { data } = await api.get("/daily-activity/leave-requests");
  return asArray<any>(payloadOf(data)).map(normalizeLeaveRequest);
}

export async function getPendingDailyActivityLeaveRequests(): Promise<DailyActivityLeaveRequest[]> {
  const { data } = await api.get("/daily-activity/leave-requests/inbox");
  return asArray<any>(payloadOf(data)).map(normalizeLeaveRequest);
}

export async function getAllDailyActivityLeaveRequests(): Promise<DailyActivityLeaveRequest[]> {
  const { data } = await api.get("/daily-activity/leave-requests/admin");
  return asArray<any>(payloadOf(data)).map(normalizeLeaveRequest);
}

export async function createDailyActivityLeaveRequest(payload: { start_date: string; end_date: string; note?: string }) {
  const { data } = await api.post("/daily-activity/leave-requests", payload);
  return normalizeLeaveRequest(payloadOf(data));
}

export async function updateDailyActivityLeaveRequest(requestId: string, payload: { start_date: string; end_date: string; note?: string }) {
  const { data } = await api.put(`/daily-activity/leave-requests/${requestId}`, payload);
  return normalizeLeaveRequest(payloadOf(data));
}

export async function decideDailyActivityLeaveRequest(requestId: string, decision: "approved" | "rejected", decisionNote?: string) {
  const { data } = await api.put(`/daily-activity/leave-requests/${requestId}/decision`, { decision, decision_note: decisionNote });
  return normalizeLeaveRequest(payloadOf(data));
}

export async function cancelDailyActivityLeaveRequest(requestId: string) {
  const { data } = await api.delete(`/daily-activity/leave-requests/${requestId}`);
  return data.data;
}

export async function deleteDailyActivityLeaveRequest(requestId: string) {
  const { data } = await api.delete(`/daily-activity/leave-requests/admin/${requestId}`);
  return data.data;
}

export async function saveDailyActivityDraft(workDate: string, activities: Array<{ id?: string; content: string }>) {
  const { data } = await api.put("/daily-activity/my-report/draft", { work_date: workDate, activities });
  return normalizeReport(payloadOf(data));
}

export async function submitDailyActivity(workDate: string, activities: Array<{ id?: string; content: string }>) {
  const { data } = await api.post("/daily-activity/my-report/submit", { work_date: workDate, activities });
  return normalizeReport(payloadOf(data));
}

export async function getDailyActivityReports(from: string, to: string, search?: string) {
  const { data } = await api.get("/daily-activity/reports", { params: { from, to, search } });
  return asArray<any>(payloadOf(data)).map(normalizeDay);
}

export async function getDailyActivityReport(id: string) {
  const { data } = await api.get(`/daily-activity/reports/${id}`);
  return normalizeReport(payloadOf(data));
}

export async function reviewDailyActivityReport(id: string) {
  const { data } = await api.put(`/daily-activity/reports/${id}/review`);
  return normalizeReport(payloadOf(data));
}

export async function getDailyActivityItemComments(itemId: string): Promise<DailyActivityComment[]> {
  const { data } = await api.get(`/daily-activity/items/${itemId}/comments`);
  return asArray<any>(payloadOf(data)).map((comment) => ({
    ...comment,
    item_id: field(comment, "item_id", "itemId"),
    user_id: field(comment, "user_id", "userId"),
    created_at: field(comment, "created_at", "createdAt"),
    user: comment.user ? normalizeUser(comment.user) : null,
  }));
}

export async function addDailyActivityItemComment(itemId: string, content: string, workspaceId: string) {
  const { data } = await api.post(`/daily-activity/items/${itemId}/comments`, { content, workspace_id: workspaceId });
  return payloadOf(data);
}

export async function getDailyActivityStructure(): Promise<DailyActivityStructureRole[]> {
  const { data } = await api.get("/daily-activity/structure");
  return asArray<any>(payloadOf(data)).map(normalizeStructureRole);
}

export async function updateDailyActivityRoleManager(roleId: string, managerRoleId: string | null) {
  const { data } = await api.put(`/daily-activity/structure/roles/${roleId}`, { manager_role_id: managerRoleId });
  const payload = payloadOf(data);
  return { role_id: field(payload, "role_id", "roleId"), manager_role_id: field(payload, "manager_role_id", "managerRoleId") ?? null };
}

export async function previewDailyActivityScope(userId: string) {
  const { data } = await api.post("/daily-activity/structure/scope-preview", { user_id: userId });
  const payload = payloadOf(data);
  return { ...payload, user_ids: asArray<string>(field(payload, "user_ids", "userIds")), users: asArray<any>(payload?.users).map(normalizeUser) } as { viewer: { id: string; username: string; role_id?: string | null }; user_ids: string[]; users: DailyActivityUser[] };
}

export async function addDailyActivityReference(itemId: string, reference: { type: "link" | "card" | "notulensi"; url?: string; display_text?: string; card_id?: string; notulensi_id?: string; workspace_id?: string }) {
  const { data } = await api.post(`/daily-activity/items/${itemId}/references`, reference);
  return data.data;
}

export async function removeDailyActivityReference(itemId: string, referenceId: string) {
  const { data } = await api.delete(`/daily-activity/items/${itemId}/references/${referenceId}`);
  return data.data;
}

export async function renameDailyActivityReference(itemId: string, referenceId: string, displayText: string) {
  const { data } = await api.patch(`/daily-activity/items/${itemId}/references/${referenceId}`, { display_text: displayText });
  return data.data;
}

export async function getDailyActivityConfiguration() {
  const { data } = await api.get("/daily-activity/configuration");
  const payload = payloadOf(data);
  return {
    roles: asArray<any>(payload?.roles).map((role) => ({ ...role, manager_role_id: field(role, "manager_role_id", "managerRoleId") ?? null })),
    users: asArray<any>(payload?.users).map(normalizeUser),
    reviewers: asArray<any>(payload?.reviewers).map((reviewer) => ({
      ...reviewer,
      user_id: field(reviewer, "user_id", "userId"),
      role_id: field(reviewer, "role_id", "roleId") ?? null,
      role_name: field(reviewer, "role_name", "roleName") ?? null,
      is_required: field(reviewer, "is_required", "isRequired") === true,
      scope_configured: field(reviewer, "scope_configured", "scopeConfigured") === true,
      direct_subordinate_ids: asArray<string>(field(reviewer, "direct_subordinate_ids", "directSubordinateIds")),
      subordinate_ids: asArray<string>(field(reviewer, "subordinate_ids", "subordinateIds")),
    })),
    role_rules: asArray<any>(payload?.role_rules ?? payload?.roleRules).map((rule) => ({ ...rule, role_id: field(rule, "role_id", "roleId"), effective_from: field(rule, "effective_from", "effectiveFrom"), is_required: field(rule, "is_required", "isRequired") })),
    user_overrides: asArray<any>(payload?.user_overrides ?? payload?.userOverrides).map((rule) => ({ ...rule, user_id: field(rule, "user_id", "userId"), effective_from: field(rule, "effective_from", "effectiveFrom") })),
    settings: asArray<any>(payload?.settings).map((setting) => ({ ...setting, deadline_time: field(setting, "deadline_time", "deadlineTime"), effective_from: field(setting, "effective_from", "effectiveFrom") })),
    holidays: asArray<any>(payload?.holidays).map((holiday) => ({ ...holiday, holiday_date: field(holiday, "holiday_date", "holidayDate") })),
  } as DailyActivityConfiguration;
}

export async function setDailyActivityRoleRule(roleId: string, isRequired: boolean, effectiveFrom: string) {
  const { data } = await api.put(`/daily-activity/configuration/roles/${roleId}`, { is_required: isRequired, effective_from: effectiveFrom });
  return data.data;
}

export async function setDailyActivityUserOverride(userId: string, rule: "follow_role" | "required" | "exempt", effectiveFrom: string) {
  const { data } = await api.post(`/daily-activity/configuration/users/${userId}`, { rule, effective_from: effectiveFrom });
  return data.data;
}

export async function setDailyActivityReviewerConfiguration(userId: string, isRequired: boolean, subordinateUserIds: string[]) {
  const { data } = await api.put(`/daily-activity/configuration/reviewers/${userId}`, {
    is_required: isRequired,
    subordinate_user_ids: subordinateUserIds,
  });
  return payloadOf(data);
}

export async function setDailyActivityDeadline(deadline: string, effectiveFrom: string) {
  const { data } = await api.post("/daily-activity/configuration/deadline", { deadline, effective_from: effectiveFrom });
  return data.data;
}

export async function addDailyActivityHoliday(holidayDate: string, name: string) {
  const { data } = await api.post("/daily-activity/holidays", { holiday_date: holidayDate, name });
  return data.data;
}

export async function attachDailyActivityFile(itemId: string, fileId: string) {
  const { data } = await api.post(`/daily-activity/items/${itemId}/attachments`, { file_id: fileId });
  return data.data;
}

export async function uploadDailyActivityAttachment(itemId: string, file: File) {
  if (file.size > 50 * 1024 * 1024) throw new Error("Ukuran file maksimal 50 MB");
  const uploaded = await uploadFile(file);
  const fileId = (uploaded.data as any)?.id;
  if (!fileId) throw new Error("Upload file tidak mengembalikan file ID");
  return attachDailyActivityFile(itemId, fileId);
}

export async function removeDailyActivityHoliday(holidayId: string) {
  const { data } = await api.delete(`/daily-activity/holidays/${holidayId}`);
  return data.data;
}
