import { api } from "@api/index";
import { uploadFile } from "@api/file";
import {
  DailyActivityAccessStatus,
  DailyActivityConfiguration,
  DailyActivityDay,
  DailyActivityReport,
  DailyActivityUser,
} from "@myTypes/daily-activity";

export async function getDailyActivityAccessStatus(): Promise<DailyActivityAccessStatus> {
  const { data } = await api.get("/daily-activity/access-status");
  return data.data;
}

export async function simulateDailyActivityAccess(userId: string, date: string, time: string) {
  const { data } = await api.post("/daily-activity/access-simulation", { user_id: userId, date, time });
  return data.data as DailyActivityAccessStatus & { user_id: string; username: string; date: string; time: string };
}

export async function getMyDailyActivity(workDate: string) {
  const { data } = await api.get("/daily-activity/my-report", { params: { work_date: workDate } });
  return data.data as { work_date: string; required: boolean; report: DailyActivityReport | null };
}

export async function saveDailyActivityDraft(workDate: string, activities: Array<{ id?: string; content: string }>) {
  const { data } = await api.put("/daily-activity/my-report/draft", { work_date: workDate, activities });
  return data.data as DailyActivityReport;
}

export async function submitDailyActivity(workDate: string, activities: Array<{ id?: string; content: string }>) {
  const { data } = await api.post("/daily-activity/my-report/submit", { work_date: workDate, activities });
  return data.data as DailyActivityReport;
}

export async function getDailyActivityReports(from: string, to: string, search?: string) {
  const { data } = await api.get("/daily-activity/reports", { params: { from, to, search } });
  return data.data as DailyActivityDay[];
}

export async function getDailyActivityReport(id: string) {
  const { data } = await api.get(`/daily-activity/reports/${id}`);
  return data.data as DailyActivityReport;
}

export async function getDailyActivityStructure() {
  const { data } = await api.get("/daily-activity/structure");
  return data.data as DailyActivityUser[];
}

export async function updateDailyActivityManager(userId: string, managerId: string | null) {
  const { data } = await api.put(`/daily-activity/structure/${userId}`, { manager_id: managerId });
  return data.data as { user_id: string; manager_id: string | null };
}

export async function previewDailyActivityScope(userId: string) {
  const { data } = await api.post("/daily-activity/structure/scope-preview", { user_id: userId });
  return data.data as { viewer: { id: string; username: string }; user_ids: string[]; users: DailyActivityUser[] };
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
  return data.data as DailyActivityConfiguration;
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

export async function uploadDailyActivityImage(itemId: string, file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Pilih file gambar");
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
