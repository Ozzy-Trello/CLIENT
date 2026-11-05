import { api } from "@api/index";
import { uploadFile } from "@api/file";
import {
  DailyActivityAccessStatus,
  DailyActivityConfiguration,
  DailyActivityDay,
  DailyActivityReport,
  DailyActivityUser,
} from "@myTypes/daily-activity";

const asArray = <T>(value: unknown): T[] => Array.isArray(value) ? value : [];
const payloadOf = (value: any) => value?.data?.data ?? value?.data ?? value;
const field = (value: any, snake: string, camel: string) => value?.[snake] ?? value?.[camel];

function normalizeUser(value: any): DailyActivityUser {
  return {
    ...value,
    role_id: field(value, "role_id", "roleId") ?? null,
    role_name: field(value, "role_name", "roleName") ?? value?.role?.name ?? null,
    manager_id: field(value, "manager_id", "managerId") ?? null,
  };
}

function normalizeReference(value: any) {
  return {
    ...value,
    reference_type: field(value, "reference_type", "referenceType"),
    file_id: field(value, "file_id", "fileId") ?? null,
    card_id: field(value, "card_id", "cardId") ?? null,
    display_text: field(value, "display_text", "displayText") ?? null,
    file_url: field(value, "file_url", "fileUrl") ?? null,
    file_mime_type: field(value, "file_mime_type", "fileMimeType") ?? null,
    card: value?.card ?? null,
  };
}

function normalizeActivity(value: any) {
  return {
    ...value,
    report_id: field(value, "report_id", "reportId"),
    references: asArray<any>(value?.references).map(normalizeReference),
  };
}

function normalizeReport(value: any): DailyActivityReport {
  return {
    ...value,
    user_id: field(value, "user_id", "userId"),
    work_date: field(value, "work_date", "workDate"),
    first_submitted_at: field(value, "first_submitted_at", "firstSubmittedAt") ?? null,
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
    submitted_at: field(value, "submitted_at", "submittedAt") ?? null,
    deadline_time: field(value, "deadline_time", "deadlineTime"),
    activities: asArray<any>(value?.activities).map(normalizeActivity),
  };
}

export async function getDailyActivityAccessStatus(): Promise<DailyActivityAccessStatus> {
  const { data } = await api.get("/daily-activity/access-status");
  const payload = payloadOf(data);
  return {
    ...payload,
    missed_dates: asArray<string>(field(payload, "missed_dates", "missedDates")),
    oldest_missed_date: field(payload, "oldest_missed_date", "oldestMissedDate") ?? null,
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

export async function getDailyActivityStructure() {
  const { data } = await api.get("/daily-activity/structure");
  return asArray<any>(payloadOf(data)).map(normalizeUser);
}

export async function updateDailyActivityManager(userId: string, managerId: string | null) {
  const { data } = await api.put(`/daily-activity/structure/${userId}`, { manager_id: managerId });
  const payload = payloadOf(data);
  return { user_id: field(payload, "user_id", "userId"), manager_id: field(payload, "manager_id", "managerId") ?? null };
}

export async function previewDailyActivityScope(userId: string) {
  const { data } = await api.post("/daily-activity/structure/scope-preview", { user_id: userId });
  const payload = payloadOf(data);
  return { ...payload, user_ids: asArray<string>(field(payload, "user_ids", "userIds")), users: asArray<any>(payload?.users).map(normalizeUser) } as { viewer: { id: string; username: string }; user_ids: string[]; users: DailyActivityUser[] };
}

export async function addDailyActivityReference(itemId: string, reference: { type: "link" | "card"; url?: string; display_text?: string; card_id?: string }) {
  const { data } = await api.post(`/daily-activity/items/${itemId}/references`, reference);
  return data.data;
}

export async function removeDailyActivityReference(itemId: string, referenceId: string) {
  const { data } = await api.delete(`/daily-activity/items/${itemId}/references/${referenceId}`);
  return data.data;
}

export async function getDailyActivityConfiguration() {
  const { data } = await api.get("/daily-activity/configuration");
  const payload = payloadOf(data);
  return {
    roles: asArray<DailyActivityConfiguration["roles"][number]>(payload?.roles),
    users: asArray<any>(payload?.users).map(normalizeUser),
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
