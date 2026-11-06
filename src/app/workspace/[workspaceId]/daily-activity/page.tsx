"use client";

import {
  addDailyActivityReference,
  addDailyActivityHoliday,
  createDailyActivityLeaveRequest,
  decideDailyActivityLeaveRequest,
  cancelDailyActivityLeaveRequest,
  getDailyActivityAccessStatus,
  getDailyActivityConfiguration,
  getDailyActivityReport,
  getDailyActivityReports,
  getDailyActivityStructure,
  getMyDailyActivityLeaveRequests,
  getPendingDailyActivityLeaveRequests,
  previewDailyActivityScope,
  getMyDailyActivity,
  removeDailyActivityHoliday,
  removeDailyActivityReference,
  renameDailyActivityReference,
  saveDailyActivityDraft,
  setDailyActivityDeadline,
  setDailyActivityRoleRule,
  setDailyActivityUserOverride,
  submitDailyActivity,
  uploadDailyActivityAttachment,
  updateDailyActivityRoleManager,
} from "@api/daily-activity";
import { searchCards } from "@api/card";
import { getNotulensiList } from "@api/notulensi";
import { DailyActivityDay, DailyActivityTab, DailyActivityUser, DailyActivityStructureRole, DailyActivityReference } from "@myTypes/daily-activity";
import { Card } from "@myTypes/card";
import { NotulensiSummary } from "@myTypes/notulensi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Checkbox, DatePicker, Image, Input, Modal, Select, Spin, Table, Tag, TimePicker, Typography, message } from "antd";
import dayjs, { Dayjs } from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { usePermissions } from "@hooks/account";
import { useCurrentAccount } from "@hooks/account";

const today = () => dayjs().format("YYYY-MM-DD");
const wibDateAndTime = (value: string) => {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(value));
  const read = (type: string) => parts.find((part) => part.type === type)?.value || "00";
  return { date: `${read("year")}-${read("month")}-${read("day")}`, time: `${read("hour")}:${read("minute")}` };
};
const wasSubmittedLate = (row: { work_date: string; submitted_at?: string | null; deadline_time?: string }) => {
  if (!row.submitted_at) return false;
  const sent = wibDateAndTime(row.submitted_at);
  return sent.date > row.work_date || (sent.date === row.work_date && sent.time > String(row.deadline_time || "17:00").slice(0, 5));
};
const leavePeriod = (start: string, end: string) => start === end
  ? dayjs(start).format("D MMM YYYY")
  : `${dayjs(start).format("D MMM YYYY")} – ${dayjs(end).format("D MMM YYYY")}`;
const leaveStatusLabel = (status: string) => status === "approved" ? "Disetujui" : status === "pending" ? "Menunggu persetujuan" : status === "rejected" ? "Ditolak" : "Dibatalkan";
type PendingReference = { id: string; reference: { type: "link" | "card"; url?: string; display_text?: string; card_id?: string } };
type PendingAttachment = { id: string; file: File };
const referenceCardHref = (reference: any, fallbackWorkspaceId: string) => {
  const card = reference.card;
  const boardId = card?.list?.board?.id ?? card?.list?.boardId;
  const listId = card?.list?.id;
  const workspaceId = card?.list?.board?.workspace_id ?? card?.list?.board?.workspaceId ?? fallbackWorkspaceId;
  return boardId && listId && workspaceId
    ? `/workspace/${workspaceId}/board/${boardId}?cardId=${reference.card_id || card.id}&listId=${listId}`
    : null;
};

export default function DailyActivityPage() {
  const routeParams = useParams<{ workspaceId: string }>();
  const workspaceId = routeParams.workspaceId;
  const [tab, setTab] = useState<DailyActivityTab>("mine");
  const [workDate, setWorkDate] = useState(today());
  const [activities, setActivities] = useState<string[]>([""]);
  const [activityIds, setActivityIds] = useState<string[]>([]);
  const [editingActivities, setEditingActivities] = useState(false);
  const [referenceDrafts, setReferenceDrafts] = useState<Record<number, { url: string; name: string }>>({});
  const [pendingReferences, setPendingReferences] = useState<Record<number, PendingReference[]>>({});
  const [pendingAttachments, setPendingAttachments] = useState<Record<number, PendingAttachment[]>>({});
  const [attachmentBusy, setAttachmentBusy] = useState(false);
  const [cardSearch, setCardSearch] = useState("");
  const [taskSearch, setTaskSearch] = useState("");
  const [reportSearch, setReportSearch] = useState("");
  const [divisionFilter, setDivisionFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedTeamDay, setSelectedTeamDay] = useState<DailyActivityDay | null>(null);
  const [scopeViewerId, setScopeViewerId] = useState<string>();
  const [scopePreview, setScopePreview] = useState<string[]>([]);
  const [teamScopePreviewIds, setTeamScopePreviewIds] = useState<string[] | null>(null);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [leaveStart, setLeaveStart] = useState<Dayjs | null>(dayjs(today()));
  const [leaveEnd, setLeaveEnd] = useState<Dayjs | null>(dayjs(today()));
  const [leaveNote, setLeaveNote] = useState("");
  const [leaveDecision, setLeaveDecision] = useState<{ requestId: string; decision: "approved" | "rejected" } | null>(null);
  const [leaveDecisionNote, setLeaveDecisionNote] = useState("");
  const [renameTarget, setRenameTarget] = useState<{ itemId: string; referenceId: string; name: string } | null>(null);
  const [holidayName, setHolidayName] = useState("");
  const [holidayDate, setHolidayDate] = useState(today());
  const [effectiveFrom, setEffectiveFrom] = useState(today());
  const [deadline, setDeadline] = useState("17:00");
  const [roleRequiredDraft, setRoleRequiredDraft] = useState<Record<string, boolean>>({});
  const [userOverrideDrafts, setUserOverrideDrafts] = useState<Record<string, "follow_role" | "required" | "exempt">>({});
  const [userOverrideBaseline, setUserOverrideBaseline] = useState<Record<string, "follow_role" | "required" | "exempt">>({});
  const [overrideSearch, setOverrideSearch] = useState("");
  const [overrideRoleFilter, setOverrideRoleFilter] = useState<string>();
  const [filterStorageReady, setFilterStorageReady] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { isSuperAdmin } = usePermissions();
  const accountQuery = useCurrentAccount();
  const currentUserId = accountQuery.data?.data?.id;
  const isAdmin = isSuperAdmin();
  const isHr = accountQuery.data?.data?.role?.name === "HR";
  const canManageHolidays = isAdmin || isHr;
  const activityFilterStorageKey = currentUserId && workspaceId ? `ozzy_daily_activity_filters_${currentUserId}_${workspaceId}` : null;

  const accessQuery = useQuery({ queryKey: ["daily-activity-access-status"], queryFn: getDailyActivityAccessStatus });
  const reportQuery = useQuery({ queryKey: ["daily-activity-my-report", workDate], queryFn: () => getMyDailyActivity(workDate), enabled: tab === "mine" });
  const myLeaveRequestsQuery = useQuery({ queryKey: ["daily-activity-leave-requests", "mine"], queryFn: getMyDailyActivityLeaveRequests, enabled: tab === "mine", refetchInterval: 30_000 });
  const pendingLeaveRequestsQuery = useQuery({ queryKey: ["daily-activity-leave-requests", "inbox"], queryFn: getPendingDailyActivityLeaveRequests, refetchInterval: 30_000 });
  const teamQuery = useQuery({ queryKey: ["daily-activity-reports", workDate], queryFn: () => getDailyActivityReports(workDate, workDate), enabled: tab === "team" });
  const detailQuery = useQuery({ queryKey: ["daily-activity-report", selectedReportId], queryFn: () => getDailyActivityReport(selectedReportId!), enabled: !!selectedReportId });
  const structureQuery = useQuery({ queryKey: ["daily-activity-structure"], queryFn: getDailyActivityStructure, enabled: tab === "structure" });
  const configQuery = useQuery({ queryKey: ["daily-activity-configuration"], queryFn: getDailyActivityConfiguration, enabled: (isAdmin && ["settings", "structure", "calendar"].includes(tab)) || (isHr && tab === "calendar") });
  const cardSearchQuery = useQuery({
    queryKey: ["daily-activity-card-search", cardSearch],
    queryFn: async () => (await searchCards({ name: cardSearch, description: cardSearch })).data || [],
    enabled: tab === "mine" && cardSearch.trim().length >= 3,
  });
  const taskSearchQuery = useQuery({
    queryKey: ["daily-activity-task-search", workspaceId, taskSearch],
    queryFn: () => getNotulensiList(workspaceId, { search: taskSearch, page: 1, limit: 50 }),
    enabled: tab === "mine" && !!workspaceId && taskSearch.trim().length >= 2,
  });

  useEffect(() => {
    if (!activityFilterStorageKey) return;
    try {
      const stored = JSON.parse(localStorage.getItem(activityFilterStorageKey) || "{}");
      setStatusFilter(["pending", "submitted"].includes(stored.statusFilter) ? stored.statusFilter : "");
      const savedDivisions = Array.isArray(stored.divisionFilter)
        ? stored.divisionFilter
        : stored.divisionFilter
          ? [stored.divisionFilter]
          : [];
      setDivisionFilter(savedDivisions.filter((value: unknown): value is string => typeof value === "string"));
      setReportSearch(stored.reportSearch || "");
    } catch {
      setStatusFilter("");
      setDivisionFilter([]);
      setReportSearch("");
    }
    setFilterStorageReady(activityFilterStorageKey);
  }, [activityFilterStorageKey]);

  useEffect(() => {
    if (!activityFilterStorageKey || filterStorageReady !== activityFilterStorageKey) return;
    localStorage.setItem(activityFilterStorageKey, JSON.stringify({ statusFilter, divisionFilter, reportSearch }));
  }, [activityFilterStorageKey, divisionFilter, filterStorageReady, reportSearch, statusFilter]);

  useEffect(() => {
    if (!configQuery.data) return;
    const roleDefaults: Record<string, boolean> = {};
    for (const role of configQuery.data.roles) {
      const current = configQuery.data.role_rules
        .filter((rule) => rule.role_id === role.id && rule.effective_from <= effectiveFrom)
        .sort((left, right) => left.effective_from.localeCompare(right.effective_from))
        .at(-1);
      roleDefaults[role.id] = current?.is_required ?? false;
    }
    const overrides: Record<string, "follow_role" | "required" | "exempt"> = {};
    for (const user of configQuery.data.users) {
      const current = configQuery.data.user_overrides
        .filter((rule) => rule.user_id === user.id && rule.effective_from <= effectiveFrom)
        .sort((left, right) => left.effective_from.localeCompare(right.effective_from))
        .at(-1);
      overrides[user.id] = current?.rule || "follow_role";
    }
    setRoleRequiredDraft(roleDefaults);
    setUserOverrideDrafts(overrides);
    setUserOverrideBaseline(overrides);
    const currentDeadline = configQuery.data.settings
      .filter((setting) => setting.effective_from <= effectiveFrom)
      .sort((left, right) => left.effective_from.localeCompare(right.effective_from))
      .at(-1);
    if (currentDeadline) setDeadline(currentDeadline.deadline_time.slice(0, 5));
  }, [configQuery.data, effectiveFrom]);

  useEffect(() => {
    if (editingActivities || !reportQuery.data) return;
    const report = reportQuery.data?.report;
    setActivities(report?.activities?.length ? report.activities.map((item) => item.content) : [""]);
    setActivityIds(report?.activities?.map((item) => item.id) || []);
  }, [reportQuery.data, editingActivities]);

  const invalidateFeature = () => {
    void queryClient.invalidateQueries({ queryKey: ["daily-activity"] });
    void queryClient.invalidateQueries({ queryKey: ["daily-activity-access-status"] });
  };

  const saveMutation = useMutation({
    mutationFn: async (submit: boolean) => {
      const report = submit
        ? await submitDailyActivity(workDate, activities.map((content, index) => ({ id: activityIds[index] || undefined, content })))
        : await saveDailyActivityDraft(workDate, activities.map((content, index) => ({ id: activityIds[index] || undefined, content })));
      const failedReferences: Array<{ index: number; pending: PendingReference }> = [];
      const failedAttachments: Array<{ index: number; pending: PendingAttachment }> = [];
      for (let index = 0; index < activities.length; index += 1) {
        const itemId = report.activities.find((item) => item.order === index)?.id;
        for (const pending of pendingReferences[index] || []) {
          if (!itemId) {
            failedReferences.push({ index, pending });
            continue;
          }
          try {
            await addDailyActivityReference(itemId, pending.reference);
          } catch {
            failedReferences.push({ index, pending });
          }
        }
        for (const pending of pendingAttachments[index] || []) {
          if (!itemId) {
            failedAttachments.push({ index, pending });
            continue;
          }
          try {
            await uploadDailyActivityAttachment(itemId, pending.file);
          } catch {
            failedAttachments.push({ index, pending });
          }
        }
      }
      return { report, submit, failedReferences, failedAttachments };
    },
    onSuccess: ({ report, submit, failedReferences, failedAttachments }) => {
      const idsByOrder = new Map(report.activities.map((item) => [item.order, item.id]));
      setActivityIds(activities.map((_, index) => idsByOrder.get(index) || ""));
      const failedReferenceIds = new Set(failedReferences.map(({ pending }) => pending.id));
      const failedAttachmentIds = new Set(failedAttachments.map(({ pending }) => pending.id));
      setPendingReferences((current) => Object.fromEntries(Object.entries(current).map(([index, items]) => [Number(index), items.filter((item) => failedReferenceIds.has(item.id))])));
      setPendingAttachments((current) => Object.fromEntries(Object.entries(current).map(([index, items]) => [Number(index), items.filter((item) => failedAttachmentIds.has(item.id))])));
      if (failedReferences.length || failedAttachments.length) {
        message.warning(`${submit ? "Daily terkirim" : "Draft tersimpan"}, tetapi ${failedReferences.length + failedAttachments.length} referensi/lampiran gagal ditambahkan. Coba simpan lagi.`);
      } else {
        setEditingActivities(false);
        message.success(submit ? "Daily Activity terkirim" : "Draft tersimpan");
      }
      invalidateFeature();
      void queryClient.invalidateQueries({ queryKey: ["daily-activity-my-report", workDate] });
    },
    onError: (error: any) => message.error(error?.response?.data?.message || "Gagal menyimpan Daily Activity"),
  });

  const roleManagerMutation = useMutation({ mutationFn: ({ roleId, managerRoleId }: { roleId: string; managerRoleId: string | null }) => updateDailyActivityRoleManager(roleId, managerRoleId), onSuccess: () => { message.success("Atasan role diperbarui"); void queryClient.invalidateQueries({ queryKey: ["daily-activity-structure"] }); void queryClient.invalidateQueries({ queryKey: ["daily-activity-configuration"] }); }, onError: (error: any) => { message.error(error?.response?.data?.message || "Gagal memperbarui atasan role"); void queryClient.invalidateQueries({ queryKey: ["daily-activity-structure"] }); } });
  const savePolicyMutation = useMutation({
    mutationFn: async () => {
      await Promise.all([
        ...roleRows.map((role) => setDailyActivityRoleRule(role.id, roleRequiredDraft[role.id] === true, effectiveFrom)),
        ...users.filter((user) => userOverrideDrafts[user.id] !== userOverrideBaseline[user.id]).map((user) => setDailyActivityUserOverride(user.id, userOverrideDrafts[user.id], effectiveFrom)),
        setDailyActivityDeadline(deadline, effectiveFrom),
      ]);
    },
    onSuccess: () => { message.success("Pengaturan Daily Activity disimpan"); setUserOverrideBaseline(userOverrideDrafts); void queryClient.invalidateQueries({ queryKey: ["daily-activity-configuration"] }); },
    onError: (error: any) => message.error(error?.response?.data?.message || "Gagal menyimpan pengaturan"),
  });
  const holidayMutation = useMutation({ mutationFn: () => addDailyActivityHoliday(holidayDate, holidayName), onSuccess: () => { setHolidayName(""); message.success("Hari libur ditambahkan"); void queryClient.invalidateQueries({ queryKey: ["daily-activity-configuration"] }); } });
  const deleteHolidayMutation = useMutation({ mutationFn: removeDailyActivityHoliday, onSuccess: () => { message.success("Hari libur dihapus"); void queryClient.invalidateQueries({ queryKey: ["daily-activity-configuration"] }); } });
  const createLeaveMutation = useMutation({
    mutationFn: () => createDailyActivityLeaveRequest({ start_date: leaveStart!.format("YYYY-MM-DD"), end_date: leaveEnd!.format("YYYY-MM-DD"), note: leaveNote }),
    onSuccess: () => { setLeaveModalOpen(false); setLeaveNote(""); message.success("Pengajuan cuti dikirim ke atasan"); void queryClient.invalidateQueries({ queryKey: ["daily-activity-leave-requests"] }); },
    onError: (error: any) => message.error(error?.response?.data?.message || "Gagal mengajukan cuti"),
  });
  const decideLeaveMutation = useMutation({
    mutationFn: ({ requestId, decision, note }: { requestId: string; decision: "approved" | "rejected"; note?: string }) => decideDailyActivityLeaveRequest(requestId, decision, note),
    onSuccess: (_result, variables) => { setLeaveDecision(null); setLeaveDecisionNote(""); message.success(variables.decision === "approved" ? "Cuti disetujui" : "Pengajuan cuti ditolak"); void queryClient.invalidateQueries({ queryKey: ["daily-activity-leave-requests"] }); void queryClient.invalidateQueries({ queryKey: ["daily-activity-reports"] }); void queryClient.invalidateQueries({ queryKey: ["daily-activity-access-status"] }); },
    onError: (error: any) => message.error(error?.response?.data?.message || "Gagal memproses pengajuan cuti"),
  });
  const cancelLeaveMutation = useMutation({
    mutationFn: cancelDailyActivityLeaveRequest,
    onSuccess: () => { message.success("Pengajuan cuti dibatalkan"); void queryClient.invalidateQueries({ queryKey: ["daily-activity-leave-requests"] }); },
    onError: (error: any) => message.error(error?.response?.data?.message || "Gagal membatalkan pengajuan cuti"),
  });
  const removeReferenceMutation = useMutation({ mutationFn: ({ itemId, referenceId }: { itemId: string; referenceId: string }) => removeDailyActivityReference(itemId, referenceId), onSuccess: () => { message.success("Lampiran dihapus"); void queryClient.invalidateQueries({ queryKey: ["daily-activity-my-report", workDate] }); if (selectedReportId) void queryClient.invalidateQueries({ queryKey: ["daily-activity-report", selectedReportId] }); } });
  const renameReferenceMutation = useMutation({
    mutationFn: ({ itemId, referenceId, name }: { itemId: string; referenceId: string; name: string }) => renameDailyActivityReference(itemId, referenceId, name),
    onSuccess: () => { setRenameTarget(null); message.success("Nama link diperbarui"); void queryClient.invalidateQueries({ queryKey: ["daily-activity-my-report", workDate] }); if (selectedReportId) void queryClient.invalidateQueries({ queryKey: ["daily-activity-report", selectedReportId] }); },
    onError: (error: any) => message.error(error?.response?.data?.message || "Gagal mengubah nama link"),
  });
  const scopePreviewMutation = useMutation({ mutationFn: previewDailyActivityScope, onSuccess: (result) => { setScopePreview(result.user_ids); setTeamScopePreviewIds(result.user_ids); }, onError: (error: any) => message.error(error?.response?.data?.message || "Gagal memuat cakupan") });

  const users = configQuery.data?.users || [];
  const cardResults = ((cardSearchQuery.data || []) as Card[]).filter((card) => !card.archive);
  const taskResults: NotulensiSummary[] = taskSearchQuery.data?.data || [];
  const teamDeadline = teamQuery.data?.find((row) => row.deadline_time)?.deadline_time?.slice(0, 5) || "17:00";
  const activityRows = (teamQuery.data || []).filter((row) => row.status !== "not_required");
  const myLeaveRequests = myLeaveRequestsQuery.data || [];
  const pendingLeaveRequests = pendingLeaveRequestsQuery.data || [];
  const activeLeave = myLeaveRequests.find((request) => request.start_date <= workDate && request.end_date >= workDate && ["pending", "approved", "rejected"].includes(request.status));
  const divisions = Array.from(new Set(activityRows.map((row) => row.role_name).filter(Boolean))) as string[];
  const normalizedSearch = reportSearch.trim().toLowerCase();
  const filteredActivityRows = activityRows.filter((row) => {
    const matchesDivision = !divisionFilter.length || divisionFilter.includes(row.role_name || "");
    const matchesSearch = !normalizedSearch || `${row.username} ${row.role_name || ""} ${row.activities.map((item) => item.content).join(" ")}`.toLowerCase().includes(normalizedSearch);
    const matchesStatus = !statusFilter || (statusFilter === "pending" ? ["missing", "draft"].includes(row.status) : row.status === statusFilter);
    const matchesScope = !teamScopePreviewIds || teamScopePreviewIds.includes(row.user_id);
    return matchesDivision && matchesSearch && matchesStatus && matchesScope;
  });
  const rawStatusCounts = activityRows.reduce((counts, row) => {
    counts[row.status] = (counts[row.status] || 0) + 1;
    if (row.status === "missing" || row.status === "draft") counts.pending += 1;
    if (wasSubmittedLate(row)) counts.late += 1;
    if (row.status === "on_leave") counts.on_leave += 1;
    return counts;
  }, { submitted: 0, draft: 0, missing: 0, pending: 0, late: 0, on_leave: 0 } as Record<string, number>);
  const statusCounts = { ...rawStatusCounts, all: activityRows.length, sent: rawStatusCounts.submitted || 0 };
  const dailyLocked = accessQuery.data?.locked === true;
  const canActOnSelectedDate = reportQuery.data?.required === true;
  const userOptions = useMemo(() => users.map((user) => ({ value: user.id, label: user.username })), [users]);
  const holidayRows = configQuery.data?.holidays || [];
  const roleRows = configQuery.data?.roles || [];
  const filteredOverrideUsers = users.filter((user) => {
    const query = overrideSearch.trim().toLowerCase();
    const matchesSearch = !query || `${user.username} ${user.role_name || ""}`.toLowerCase().includes(query);
    return matchesSearch && (!overrideRoleFilter || user.role_id === overrideRoleFilter);
  });
  const structureRoles = structureQuery.data || [];
  const childrenByRole = useMemo(() => {
    const result = new Map<string | null, DailyActivityStructureRole[]>();
    for (const role of structureRoles) {
      const managerRoleId = role.manager_role_id || null;
      result.set(managerRoleId, [...(result.get(managerRoleId) || []), role]);
    }
    return result;
  }, [structureRoles]);
  const getDescendantRoleIds = (roleId: string) => {
    const descendants = new Set<string>();
    const visit = (parentRoleId: string) => {
      for (const child of childrenByRole.get(parentRoleId) || []) {
        if (descendants.has(child.id)) continue;
        descendants.add(child.id);
        visit(child.id);
      }
    };
    visit(roleId);
    return descendants;
  };
  const renderOrgNode = (role: DailyActivityStructureRole, depth = 0, ancestors = new Set<string>()): React.ReactNode => {
    if (ancestors.has(role.id)) return null;
    const nextAncestors = new Set(ancestors).add(role.id);
    const children = childrenByRole.get(role.id) || [];
    const memberIds = role.members.map((member) => member.id);
    const viewerId = memberIds[0];
    const selected = !!scopeViewerId && memberIds.includes(scopeViewerId);
    const inScope = memberIds.some((id) => scopePreview.includes(id));
    return (
      <li key={role.id}>
        <button type="button" className={`ozorgnode ${selected ? "ozorgselected" : inScope ? "ozorgvisible" : "ozorghidden"}`} aria-pressed={selected} disabled={!isAdmin || !viewerId} onClick={() => { if (isAdmin && viewerId) { setScopeViewerId(viewerId); scopePreviewMutation.mutate(viewerId); } }} style={{ marginLeft: depth ? 0 : undefined }}>
          <span className="ozorgname">{role.name}</span><small>{role.members.length ? role.members.map((member) => member.username).join(", ") : "Belum ada user"}</small>
        </button>
        {children.length > 0 && <ul>{children.map((child) => renderOrgNode(child, depth + 1, nextAncestors))}</ul>}
      </li>
    );
  };
  const uploadActivityImage = async (index: number, file?: File) => {
    const itemId = activityIds[index];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      message.error("Ukuran file maksimal 50 MB");
      return;
    }
    if (!itemId) {
      setPendingAttachments((current) => ({
        ...current,
        [index]: [...(current[index] || []), { id: crypto.randomUUID(), file }],
      }));
      return;
    }
    setAttachmentBusy(true);
    try {
      await uploadDailyActivityAttachment(itemId, file);
      message.success("Attachment ditambahkan");
      await queryClient.invalidateQueries({ queryKey: ["daily-activity-my-report", workDate] });
    } catch (error: any) {
      message.error(error?.response?.data?.message || error?.message || "Upload lampiran gagal");
    } finally {
      setAttachmentBusy(false);
    }
  };
  const saveActivityReference = async (index: number, reference: PendingReference["reference"]) => {
    const itemId = activityIds[index];
    if (!itemId) {
      setPendingReferences((current) => ({
        ...current,
        [index]: [...(current[index] || []), { id: crypto.randomUUID(), reference }],
      }));
      return;
    }
    try {
      await addDailyActivityReference(itemId, reference);
      message.success(reference.type === "link" ? "Link ditambahkan" : "Referensi ditambahkan");
      await queryClient.invalidateQueries({ queryKey: ["daily-activity-my-report", workDate] });
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Gagal menambahkan referensi");
    }
  };
  const saveLinkDraft = (index: number) => {
    const draft = referenceDrafts[index] || { url: "", name: "" };
    const url = draft.url.trim();
    if (!/^https?:\/\//i.test(url)) {
      message.error("Masukkan link yang diawali http:// atau https://");
      return;
    }
    void saveActivityReference(index, { type: "link", url, display_text: draft.name.trim() || undefined });
    setReferenceDrafts((current) => ({ ...current, [index]: { url: "", name: "" } }));
  };
  const saveCardReference = (index: number, card: Card, label = card.name) => {
    void saveActivityReference(index, { type: "card", card_id: card.id, display_text: label });
    setCardSearch("");
  };
  const saveTaskReference = (index: number, task: NotulensiSummary) => {
    if (task.cardId) {
      void saveActivityReference(index, { type: "card", card_id: task.cardId, display_text: `${task.code} · ${task.title}` });
    } else {
      void saveActivityReference(index, {
        type: "link",
        url: `${window.location.origin}/workspace/${workspaceId}/notulensi/${task.id}`,
        display_text: `${task.code} · ${task.title}`,
      });
    }
    setTaskSearch("");
  };
  const openActivityEditor = () => {
    const savedActivities = reportQuery.data?.report?.activities || [];
    const nextActivities = savedActivities.map((activity) => activity.content);
    const nextActivityIds = savedActivities.map((activity) => activity.id);
    if (!savedActivities.length) {
      nextActivities.push("");
      nextActivityIds.push("");
    }
    setActivities(nextActivities);
    setActivityIds(nextActivityIds);
    setPendingReferences({});
    setPendingAttachments({});
    setReferenceDrafts({});
    setEditingActivities(true);
  };
  const cancelActivityEdit = () => {
    const savedActivities = reportQuery.data?.report?.activities || [];
    setActivities(savedActivities.length ? savedActivities.map((activity) => activity.content) : [""]);
    setActivityIds(savedActivities.map((activity) => activity.id));
    setPendingReferences({});
    setPendingAttachments({});
    setReferenceDrafts({});
    setEditingActivities(false);
  };
  const runSaveActivities = (submit: boolean) => {
    if (activities.some((content) => !content.trim())) {
      message.error("Isi atau hapus semua baris aktivitas sebelum menyimpan.");
      return;
    }
    saveMutation.mutate(submit);
  };
  const openLeaveRequest = () => {
    const baseDate = dayjs(workDate);
    setLeaveStart(baseDate);
    setLeaveEnd(baseDate);
    setLeaveNote("");
    setLeaveModalOpen(true);
  };
  const renderSavedReference = (reference: any, itemId: string, canEdit = true) => {
    const cardHref = referenceCardHref(reference, workspaceId);
    const isRenaming = canEdit && renameTarget?.referenceId === reference.id;
    const display = reference.display_text || reference.card?.name || reference.card_id || reference.url || "Lampiran";
    return <span key={reference.id} className="inline-flex max-w-full flex-wrap items-center gap-2 rounded border border-slate-200 bg-white px-2 py-1">
      {reference.reference_type === "file" && reference.file_url
          ? <a href={reference.file_url} target="_blank" rel="noreferrer">{display}</a>
          : reference.reference_type === "card" && cardHref
            ? <a href={cardHref}>{display}</a>
            : reference.reference_type === "link"
              ? <a href={reference.url || "#"} target="_blank" rel="noreferrer">{display}</a>
              : <Tag>{display}</Tag>}
      {canEdit && reference.reference_type === "link" && !isRenaming && <Button size="small" type="text" onClick={() => setRenameTarget({ itemId, referenceId: reference.id, name: reference.display_text || "" })}>Ubah nama</Button>}
      {isRenaming && <div className="flex min-w-0 flex-1 gap-1"><Input autoFocus aria-label="Nama link" value={renameTarget?.name || ""} onChange={(event) => setRenameTarget((current) => current ? { ...current, name: event.target.value } : current)} /><Button size="small" type="primary" loading={renameReferenceMutation.isPending} onClick={() => renameReferenceMutation.mutate({ itemId, referenceId: reference.id, name: renameTarget?.name || "" })}>Simpan</Button><Button size="small" onClick={() => setRenameTarget(null)}>Batal</Button></div>}
      {canEdit && <Button size="small" type="text" danger aria-label={`Hapus ${display}`} loading={removeReferenceMutation.isPending} onClick={() => void removeReferenceMutation.mutateAsync({ itemId, referenceId: reference.id }).catch((error: any) => message.error(error?.response?.data?.message || "Gagal menghapus referensi"))}>×</Button>}
    </span>;
  };
  const renderActivityReferences = (references: DailyActivityReference[] = [], itemId: string, canEdit = true) => {
    const imageReferences = references.filter((reference) => reference.reference_type === "file" && reference.file_url && reference.file_mime_type?.startsWith("image/"));
    const otherReferences = references.filter((reference) => !imageReferences.includes(reference));
    return <div className="grid min-w-0 gap-2">
      {imageReferences.length > 0 && <Image.PreviewGroup>
        <div className="ozattachment-strip" aria-label="Image attachments">
          {imageReferences.map((reference) => <div key={reference.id} className="ozattachment-tile rounded border p-2">
            <Image src={reference.file_url!} alt={reference.display_text || "Activity attachment"} width={148} height={104} style={{ objectFit: "cover", borderRadius: 4 }} preview={{ mask: "Zoom" }} />
            <div className="mt-1 flex min-w-0 items-center justify-between gap-1"><Typography.Text className="min-w-0 truncate" title={reference.display_text || ""}>{reference.display_text || "Gambar"}</Typography.Text>{canEdit && <Button size="small" type="text" danger aria-label={`Hapus ${reference.display_text || "lampiran"}`} loading={removeReferenceMutation.isPending} onClick={() => void removeReferenceMutation.mutateAsync({ itemId, referenceId: reference.id }).catch((error: any) => message.error(error?.response?.data?.message || "Gagal menghapus referensi"))}>×</Button>}</div>
          </div>)}
        </div>
      </Image.PreviewGroup>}
      {otherReferences.length > 0 && <div className="flex min-w-0 flex-wrap gap-2">{otherReferences.map((reference) => renderSavedReference(reference, itemId, canEdit))}</div>}
    </div>;
  };
  return (
    <>
    <style jsx global>{`
      #ozdaily{--ozbg:#fff;--ozpanel:#f8f9fb;--ozline:#e6e8ed;--oztext:#192232;--ozmuted:#7e8795;--ozblue:#1677ff;--ozsoft:#e8f1ff;--ozgreen:#287945;--ozamber:#986000;--ozred:#cf3d44;color:var(--oztext);background:var(--ozbg);font:14px/1.5 'Segoe UI',Arial,sans-serif;color-scheme:light;border:1px solid var(--ozline);border-radius:12px;overflow:hidden}
      #ozdaily *{box-sizing:border-box}#ozdaily [hidden]{display:none!important}#ozdaily button,#ozdaily input,#ozdaily select,#ozdaily textarea{font:inherit}#ozdaily button{cursor:pointer}#ozdaily button:disabled{cursor:default;opacity:.5}#ozdaily h2,#ozdaily h3,#ozdaily h4,#ozdaily p{margin:0}#ozdaily h2{font-size:26px;font-weight:600;line-height:1.3}#ozdaily h3{font-size:17px;font-weight:600}#ozdaily h4{font-size:14px;font-weight:600}#ozdaily a{color:var(--ozblue);overflow-wrap:anywhere}
      #ozdaily .ozmain{padding:25px;min-width:0}#ozdaily .ozheading{display:flex;justify-content:space-between;align-items:center;gap:15px;margin-bottom:18px}#ozdaily .ozeyebrow{font-size:11px;letter-spacing:.7px;color:var(--ozmuted);margin-bottom:5px}#ozdaily .ozdemo{display:inline-flex;align-items:center;gap:5px;font-size:11px;padding:4px 8px;border:1px solid var(--ozline);border-radius:5px;background:var(--ozpanel);white-space:nowrap}
      #ozdaily .oztabs{display:flex;gap:6px;border-bottom:1px solid var(--ozline);margin-bottom:20px;flex-wrap:wrap}#ozdaily .oztabs button{border:0;border-radius:0;background:transparent;padding:10px 12px;margin-bottom:-1px;border-bottom:2px solid transparent;color:var(--ozmuted)}#ozdaily .oztabs button[aria-selected=true]{color:var(--ozblue);border-bottom-color:var(--ozblue)}
      #ozdaily .oztoolbar{display:flex;align-items:end;gap:12px;flex-wrap:wrap;padding:16px;background:var(--ozpanel);border:1px solid var(--ozline);border-radius:10px;margin-bottom:16px}#ozdaily .oztoolbar label{flex:1;min-width:130px;font-size:12px}#ozdaily .ozsummary{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 13px;font-size:12px}#ozdaily .ozpills{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:15px}#ozdaily .ozpills button{font-size:12px;background:var(--ozpanel);padding:6px 10px;border:1px solid var(--ozline);border-radius:6px}#ozdaily .ozpills button[aria-pressed=true]{border-color:#9bc1ff;background:var(--ozsoft);color:var(--ozblue)}
      #ozdaily .ozpanel{background:var(--ozpanel);border:1px solid var(--ozline);border-radius:10px;padding:18px;margin-bottom:15px}#ozdaily .ozactivity{background:var(--ozbg);border:1px solid var(--ozline);border-radius:8px;padding:15px;margin-bottom:12px}#ozdaily .ozidentity{display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-bottom:18px}#ozdaily .ozactions{display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;margin-top:20px}#ozdaily .oznotice{background:var(--ozsoft);color:#2762a9;border:1px solid #c7dcff;border-radius:6px;padding:10px 13px;font-size:12px;margin-bottom:15px}#ozdaily .ozpolicy{padding:12px 0;border-top:1px solid var(--ozline);font-size:12px}#ozdaily .ozpolicy p{color:var(--ozmuted);margin-top:4px}#ozdaily .ozfooter{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:12px;font-size:11px;color:var(--ozmuted)}#ozdaily .ozgatepanel{display:grid;gap:16px;justify-items:center;text-align:center;padding:40px 20px;background:var(--ozpanel);border:1px solid var(--ozline);border-radius:12px}
      #ozdaily .ozsettinggrid,#ozdaily .ozstructuregrid{display:grid;grid-template-columns:1.2fr 1fr;gap:18px}#ozdaily .ozcheck{display:flex;gap:10px;align-items:center;padding:10px 0;border-bottom:1px solid var(--ozline)}#ozdaily input[type=checkbox]{width:16px;height:16px;accent-color:var(--ozblue)}#ozdaily .ozdays{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}#ozdaily .ozdays .ozday{display:flex;align-items:center;gap:4px;font-size:11px}#ozdaily .ozorgwrap{background:var(--ozpanel);padding:16px;border:1px solid var(--ozline);border-radius:10px;min-width:0}#ozdaily .ozorg ul{list-style:none;margin:0;padding:0}#ozdaily .ozorg ul ul{margin-left:14px;padding-left:18px;border-left:1px solid #cbd2dc}#ozdaily .ozorg li{position:relative;padding-top:10px}#ozdaily .ozorg ul ul>li:before{content:'';position:absolute;left:-18px;top:32px;width:18px;border-top:1px solid #cbd2dc}#ozdaily .ozorgnode{display:flex;flex-direction:column;align-items:flex-start;gap:0;white-space:normal;text-align:left;width:100%;padding:9px 12px;background:var(--ozbg)}#ozdaily .ozorgname{font-size:12px;font-weight:600}#ozdaily .ozorgnode small{font-size:11px}#ozdaily .ozorgnode.ozorgselected{background:var(--ozblue);border-color:var(--ozblue);color:#fff}#ozdaily .ozorgnode.ozorgselected small{color:#e4efff}#ozdaily .ozorgnode.ozorgvisible{background:var(--ozsoft);border-color:#bfd6f7}#ozdaily .ozorgnode.ozorghidden{background:var(--ozbg);color:var(--ozmuted)}#ozdaily .ozaccessrow{display:flex;justify-content:space-between;gap:8px;align-items:center;padding:10px 0;border-top:1px solid var(--ozline);font-size:12px}#ozdaily .ozaccessrow small{display:block;font-size:11px}#ozdaily .ozaccessstate{font-size:11px;white-space:nowrap}#ozdaily .ozallowed{color:var(--ozgreen)}#ozdaily .ozdenied{color:var(--ozmuted)}
       #ozdaily .ant-table-wrapper{border:1px solid var(--ozline);border-radius:10px;overflow:hidden}#ozdaily .ant-table-thead>tr>th{background:#f3f4f6;color:var(--oztext);font-size:12px;font-weight:500}#ozdaily .ant-table-tbody>tr>td{font-size:12px;vertical-align:top}#ozdaily .ant-alert{border-radius:6px}#ozdaily .ant-input,#ozdaily .ant-picker,#ozdaily .ant-select-selector,#ozdaily .ant-btn{border-radius:6px}
      #ozdaily .ozpills button{min-height:44px}#ozdaily .ozpills .ant-btn{height:44px}#ozdaily .ozactivity .ant-select-selector,#ozdaily .ozactivity .ant-input:not(textarea),#ozdaily .ozactivity .ant-btn{min-height:44px}#ozdaily .ozactivity label:focus-within{outline:2px solid var(--ozblue);outline-offset:2px}
      #ozdaily .ozattachment-strip{display:flex;gap:10px;max-width:100%;overflow-x:auto;overscroll-behavior-x:contain;scroll-snap-type:x mandatory;touch-action:pan-x;padding-bottom:6px}#ozdaily .ozattachment-tile{flex:0 0 170px;min-width:0;scroll-snap-align:start}
      @media(max-width:850px){#ozdaily .ozmain{padding:20px 16px}#ozdaily .ozsettinggrid,#ozdaily .ozstructuregrid{grid-template-columns:1fr}}@media(max-width:650px){#ozdaily .ozmain{padding:15px 12px}#ozdaily .ozheading{align-items:start}#ozdaily h2{font-size:23px}#ozdaily .ozidentity{grid-template-columns:1fr}#ozdaily .oztoolbar{padding:12px}#ozdaily .oztabs button{padding:9px;font-size:12px}#ozdaily .ozorg ul ul{margin-left:7px;padding-left:13px}#ozdaily .ozorg ul ul>li:before{left:-13px;width:13px}}
    `}</style>
    <div id="ozdaily">
    <div className="ozmain flex min-w-0 flex-col gap-4">
      <div className="ozheading"><h2>Daily Activity</h2></div>
      {dailyLocked && tab !== "mine" ? (
        <section className="grid justify-items-center gap-4 rounded-xl border border-red-200 bg-slate-50 px-5 py-10 text-center">
          <Typography.Title level={3} className="!mb-0">Akses Terkunci</Typography.Title>
          <Typography.Paragraph className="max-w-lg !mb-0">Belum mengisi Daily Activity tanggal {accessQuery.data?.oldest_missed_date}. Silakan isi terlebih dahulu.</Typography.Paragraph>
          <Typography.Text type="secondary">Setelah semua daily yang wajib dikirim terpenuhi, akses terbuka otomatis.</Typography.Text>
          <Button type="primary" onClick={() => { setWorkDate(accessQuery.data?.oldest_missed_date || today()); setTab("mine"); }}>Isi Daily Activity Sekarang</Button>
        </section>
      ) : (
        <>
          {dailyLocked && <Alert type="warning" showIcon message={`Akses terkunci karena Daily Activity tanggal ${accessQuery.data?.oldest_missed_date} belum dikirim.`} />}
          {!dailyLocked && <nav className="oztabs" role="tablist" aria-label="Daily Activity">
            <button role="tab" aria-selected={tab === "mine"} onClick={() => setTab("mine")}>Saya</button>
            <button role="tab" aria-selected={tab === "team"} onClick={() => setTab("team")}>Tim{pendingLeaveRequests.length > 0 ? ` · ${pendingLeaveRequests.length}` : ""}</button>
            <button role="tab" aria-selected={tab === "structure"} onClick={() => setTab("structure")}>Struktur</button>
            {isAdmin && <button role="tab" aria-selected={tab === "settings" || tab === "calendar"} onClick={() => setTab("settings")}>Pengaturan</button>}
            {isHr && !isAdmin && <button role="tab" aria-selected={tab === "calendar"} onClick={() => setTab("calendar")}>Hari Libur</button>}
          </nav>}
        </>
      )}

      {tab === "mine" && (
        <section className="flex flex-col gap-4">
          <div className="ozidentity">
            <div><Typography.Text type="secondary">Pengisi</Typography.Text><Typography.Title level={4} className="!mb-0">{accountQuery.data?.data?.username || ""}</Typography.Title><Typography.Text type="secondary">{accountQuery.data?.data?.role?.name || ""}</Typography.Text></div>
            <div className="flex flex-wrap items-end justify-between gap-3"><label className="flex flex-col gap-1 text-xs">Tanggal kerja<DatePicker value={dayjs(workDate)} onChange={(value) => value && setWorkDate(value.format("YYYY-MM-DD"))} disabled={editingActivities} disabledDate={(date) => date.isAfter(dayjs(), "day")} /></label><Button disabled={editingActivities || !canActOnSelectedDate} onClick={openLeaveRequest}>Ajukan Cuti</Button></div>
            {reportQuery.data && !canActOnSelectedDate && <Alert type="info" showIcon message="Daily Activity tidak wajib diisi pada tanggal ini. Laporan hanya dapat dilihat." />}
          </div>
          {activeLeave && <Alert showIcon type={activeLeave.status === "approved" ? "success" : activeLeave.status === "pending" ? "warning" : "error"} message={activeLeave.status === "approved" ? "Cuti disetujui" : activeLeave.status === "pending" ? "Cuti menunggu persetujuan" : "Pengajuan cuti ditolak"} description={activeLeave.status === "approved" ? "Daily Activity tidak wajib pada tanggal ini." : activeLeave.status === "pending" ? "Daily Activity tetap wajib sampai atasan menyetujui pengajuan." : activeLeave.decision_note || "Daily Activity tetap wajib diisi."} />}
          {reportQuery.isLoading ? <Spin /> : <>
            {editingActivities ? <>
              <div className="mb-1 flex items-center justify-between"><Typography.Title level={4} className="!mb-0">Aktivitas yang dikerjakan</Typography.Title>{reportQuery.data?.report && <Tag color={reportQuery.data.report.status === "submitted" ? "green" : "gold"}>{reportQuery.data.report.status === "submitted" ? "Sudah Kirim" : "Draft"}</Tag>}</div>
              {activities.map((content, index) => {
                const activityId = activityIds[index];
                const savedActivity = reportQuery.data?.report?.activities.find((item) => item.id === activityId);
                const referenceDraft = referenceDrafts[index] || { url: "", name: "" };
                const queuedReferences = pendingReferences[index] || [];
                const queuedAttachments = pendingAttachments[index] || [];
                return <div key={activityId || `new-${index}`} className="ozactivity" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); Array.from(event.dataTransfer.files || []).forEach((file) => void uploadActivityImage(index, file)); }} onPaste={(event) => { const file = Array.from(event.clipboardData.files || [])[0]; if (file) { event.preventDefault(); void uploadActivityImage(index, file); } }}>
                  <div className="flex gap-2"><Input.TextArea aria-label={`Aktivitas ${index + 1}`} autoSize={{ minRows: 2 }} maxLength={20000} value={content} onChange={(event) => setActivities((items) => items.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} placeholder="Apa yang kamu kerjakan pada tanggal ini?" disabled={saveMutation.isPending} /><Button danger disabled={activities.length === 1 || saveMutation.isPending} onClick={() => {
                    setActivities((items) => items.filter((_, itemIndex) => itemIndex !== index));
                    setActivityIds((items) => items.filter((_, itemIndex) => itemIndex !== index));
                    const shiftIndexes = <T,>(current: Record<number, T>) => Object.fromEntries(Object.entries(current).filter(([key]) => Number(key) !== index).map(([key, value]) => [Number(key) > index ? Number(key) - 1 : Number(key), value])) as Record<number, T>;
                    setPendingReferences(shiftIndexes);
                    setPendingAttachments(shiftIndexes);
                    setReferenceDrafts(shiftIndexes);
                  }}>Hapus</Button></div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500"><label className="inline-flex min-h-11 cursor-pointer items-center rounded border px-3 py-2 hover:bg-slate-50">+ Lampiran<input type="file" multiple className="sr-only" disabled={attachmentBusy || saveMutation.isPending} onChange={(event) => { Array.from(event.target.files || []).forEach((file) => void uploadActivityImage(index, file)); event.target.value = ""; }} /></label><span>Drag & drop atau paste · Maks 50 MB/file</span></div>
                  {(savedActivity?.references?.length || queuedReferences.length || queuedAttachments.length) ? <div className="grid min-w-0 gap-2" aria-label="Lampiran dan referensi aktivitas">{savedActivity?.references?.length ? renderActivityReferences(savedActivity.references, activityId!) : null}<div className="flex flex-wrap gap-2">{queuedReferences.map((pending) => <span key={pending.id} className="inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-2 py-1">{pending.reference.display_text || pending.reference.url || "Card terkait"}<Typography.Text type="secondary">Belum disimpan</Typography.Text><Button type="text" size="small" danger aria-label="Hapus referensi yang belum disimpan" onClick={() => setPendingReferences((current) => ({ ...current, [index]: (current[index] || []).filter((item) => item.id !== pending.id) }))}>×</Button></span>)}{queuedAttachments.map((pending) => <span key={pending.id} className="inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-2 py-1">{pending.file.name}<Typography.Text type="secondary">Belum disimpan</Typography.Text><Button type="text" size="small" danger aria-label={`Hapus lampiran ${pending.file.name}`} onClick={() => setPendingAttachments((current) => ({ ...current, [index]: (current[index] || []).filter((item) => item.id !== pending.id) }))}>×</Button></span>)}</div></div> : null}
                  <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2">
                    <section className="grid min-w-0 gap-2 rounded border bg-slate-50 p-3 sm:col-span-2"><Typography.Text strong>Tambah tautan</Typography.Text><div className="grid min-w-0 gap-2 sm:grid-cols-[1fr_1fr_auto]"><Input aria-label="Alamat tautan" placeholder="https://..." value={referenceDraft.url} onChange={(event) => setReferenceDrafts((current) => ({ ...current, [index]: { ...referenceDraft, url: event.target.value } }))} onPressEnter={() => saveLinkDraft(index)} /><Input aria-label="Nama tautan opsional" placeholder="Nama tautan (opsional)" value={referenceDraft.name} onChange={(event) => setReferenceDrafts((current) => ({ ...current, [index]: { ...referenceDraft, name: event.target.value } }))} onPressEnter={() => saveLinkDraft(index)} /><Button disabled={!referenceDraft.url.trim()} onClick={() => saveLinkDraft(index)}>Tambah</Button></div></section>
                    <label className="min-w-0 space-y-1"><Typography.Text type="secondary">Card di board</Typography.Text><Select className="w-full" showSearch filterOption={false} allowClear value={undefined} placeholder="Cari card di board" onSearch={setCardSearch} onChange={(cardId) => { const card = cardResults.find((candidate) => candidate.id === cardId); if (card) saveCardReference(index, card); }} loading={cardSearchQuery.isFetching} notFoundContent={cardSearch.trim().length < 3 ? "Ketik minimal 3 karakter" : cardSearchQuery.isError ? "Gagal mencari card" : "Card tidak ditemukan"} options={cardResults.map((card) => ({ value: card.id, label: `${card.name}${card.boardName ? ` · ${card.boardName}` : ""}` }))} /></label>
                    <label className="min-w-0 space-y-1"><Typography.Text type="secondary">Task / Project</Typography.Text><Select className="w-full" showSearch filterOption={false} allowClear value={undefined} placeholder="Cari Task / Project" onSearch={setTaskSearch} onChange={(taskId) => { const task = taskResults.find((candidate) => candidate.id === taskId); if (task) saveTaskReference(index, task); }} loading={taskSearchQuery.isFetching} notFoundContent={taskSearch.trim().length < 2 ? "Ketik minimal 2 karakter" : taskSearchQuery.isError ? "Gagal mencari Task / Project" : "Task / Project tidak ditemukan"} options={taskResults.map((task) => ({ value: task.id, label: `${task.code} · ${task.title}` }))} /></label>
                  </div>
                </div>;
              })}
              <div className="ozactions"><Button onClick={() => { setActivities((items) => [...items, ""]); setActivityIds((items) => [...items, ""]); }} disabled={saveMutation.isPending}>+ Aktivitas</Button><Button onClick={cancelActivityEdit} disabled={saveMutation.isPending}>Batal</Button>{reportQuery.data?.report?.status !== "submitted" && <Button onClick={() => runSaveActivities(false)} loading={saveMutation.isPending}>Simpan Draft</Button>}<Button type="primary" onClick={() => runSaveActivities(true)} loading={saveMutation.isPending}>{reportQuery.data?.report?.status === "submitted" ? "Simpan Perubahan" : "Simpan Aktivitas"}</Button></div>
            </> : <>
               <div className="mb-1 flex items-center justify-between"><div><Typography.Title level={4} className="!mb-0">Aktivitas saya</Typography.Title><Typography.Text type="secondary">{dayjs(workDate).format("dddd, D MMMM YYYY")}</Typography.Text></div><div className="flex items-center gap-2">{reportQuery.data?.report && <Tag color={reportQuery.data.report.status === "submitted" ? "green" : "gold"}>{reportQuery.data.report.status === "submitted" ? "Sudah Kirim" : "Draft"}</Tag>}{canActOnSelectedDate && Boolean(reportQuery.data?.report?.activities.length) && activeLeave?.status !== "approved" ? <Button size="small" onClick={openActivityEditor}>Edit Aktivitas</Button> : null}</div></div>
               {reportQuery.data?.report?.activities.length ? <div className="grid gap-3">{reportQuery.data.report.activities.map((activity, index) => <article key={activity.id} className="rounded-lg border bg-white p-4"><div className="mb-2 flex gap-3"><span className="text-sm text-slate-500">{index + 1}.</span><p className="whitespace-pre-wrap">{activity.content}</p></div>{activity.references?.length ? renderActivityReferences(activity.references, activity.id, canActOnSelectedDate) : null}</article>)}</div> : activeLeave?.status === "approved" ? <div className="quiet">Cuti disetujui. Tidak perlu mencatat aktivitas.</div> : <div className="grid justify-items-center gap-3 rounded-lg border border-dashed p-8 text-center"><h3>Belum ada aktivitas yang dicatat</h3><p className="text-slate-500">Pilih tanggal dan catat aktivitas yang dikerjakan.</p>{canActOnSelectedDate && <Button type="primary" onClick={openActivityEditor}>+ Catat Aktivitas</Button>}</div>}
              {myLeaveRequests.length > 0 && <section className="rounded-lg border p-4"><Typography.Text strong>Pengajuan cuti saya</Typography.Text><div className="mt-2 grid gap-2">{myLeaveRequests.map((request) => <div key={request.id} className="flex flex-wrap items-center justify-between gap-2 border-t pt-2"><div><span>{leavePeriod(request.start_date, request.end_date)}</span><Tag className="ml-2" color={request.status === "approved" ? "green" : request.status === "pending" ? "gold" : request.status === "rejected" ? "red" : "default"}>{leaveStatusLabel(request.status)}</Tag><Typography.Text className="ml-2" type="secondary">{request.approver_role_name ? `Atasan: ${request.approver_role_name}` : "Atasan: Super Admin"}</Typography.Text>{request.note && <div className="mt-1 text-sm">{request.note}</div>}{request.decision_note && <div className="mt-1 text-sm text-slate-500">Catatan: {request.decision_note}</div>}</div>{request.status === "pending" && <Button danger size="small" loading={cancelLeaveMutation.isPending} onClick={() => cancelLeaveMutation.mutate(request.id)}>Batalkan</Button>}</div>)}</div></section>}
            </>}
          </>}
        </section>
      )}

      {tab === "team" && (
        <section className="flex flex-col gap-3">
          {!selectedTeamDay && <section className="rounded-lg border bg-white p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><Typography.Title level={4} className="!mb-0">Persetujuan cuti</Typography.Title><Tag>{pendingLeaveRequests.length} menunggu</Tag></div>
            {pendingLeaveRequestsQuery.isLoading ? <Spin /> : pendingLeaveRequestsQuery.isError ? <Alert type="error" showIcon message="Pengajuan cuti gagal dimuat. Coba muat ulang halaman." /> : pendingLeaveRequests.length ? <div className="grid gap-3">{pendingLeaveRequests.map((request) => <article key={request.id} className="rounded border p-3"><div className="flex flex-wrap items-start justify-between gap-3"><div><Typography.Text strong>{request.employee_name}</Typography.Text><Typography.Text type="secondary" className="ml-2">{request.employee_role_name || ""}</Typography.Text><div className="mt-1">{leavePeriod(request.start_date, request.end_date)}</div>{request.note && <Typography.Paragraph className="!mb-0 !mt-2">{request.note}</Typography.Paragraph>}</div><div className="flex gap-2"><Button disabled={decideLeaveMutation.isPending} onClick={() => { setLeaveDecision({ requestId: request.id, decision: "rejected" }); setLeaveDecisionNote(""); }}>Tolak</Button><Button type="primary" disabled={decideLeaveMutation.isPending} onClick={() => { setLeaveDecision({ requestId: request.id, decision: "approved" }); setLeaveDecisionNote(""); }}>Setujui</Button></div></div></article>)}</div> : <Typography.Text type="secondary">Tidak ada pengajuan cuti yang menunggu.</Typography.Text>}
          </section>}
          {teamScopePreviewIds && <Alert type="info" showIcon message={`Simulasi cakupan: ${users.find((user) => user.id === scopeViewerId)?.username || "pengguna"}`} action={<Button size="small" onClick={() => { setTeamScopePreviewIds(null); setScopePreview([]); }}>Akhiri Simulasi</Button>} />}
          {selectedTeamDay && (
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <Button onClick={() => { setSelectedReportId(null); setSelectedTeamDay(null); }}>← Kembali ke Monitoring Tim</Button>
                {detailQuery.data && <Tag color={detailQuery.data.status === "submitted" ? "green" : "gold"}>{detailQuery.data.status === "submitted" ? "Sudah Kirim" : "Draft"}</Tag>}
              </div>
              {selectedReportId && detailQuery.isLoading ? <Spin /> : selectedReportId && detailQuery.data ? <>
                <Typography.Title level={4}>{selectedTeamDay.username} · {dayjs(selectedTeamDay.work_date).format("DD MMMM YYYY")}</Typography.Title>
                {detailQuery.data.activities.map((activity, index) => <article key={activity.id} className="mb-3 rounded-lg border p-3"><Typography.Text type="secondary">Aktivitas {index + 1}</Typography.Text><p className="whitespace-pre-wrap">{activity.content}</p>{activity.references?.length ? <div className="mt-2">{renderActivityReferences(activity.references, activity.id, false)}</div> : null}</article>)}
                {detailQuery.data.history?.length ? <details className="mt-4"><summary>Riwayat laporan</summary><ul>{detailQuery.data.history.map((entry, index) => <li key={`${entry.created_at}:${index}`}>{dayjs(entry.created_at).format("DD MMM YYYY HH:mm")} · {entry.action.replaceAll("_", " ")}</li>)}</ul></details> : null}
                {detailQuery.data.user_id === currentUserId && <Button type="primary" className="mt-3" onClick={() => { setWorkDate(detailQuery.data!.work_date); setTab("mine"); }}>Edit Daily Saya</Button>}
              </> : !selectedTeamDay.report_id ? <><Typography.Title level={4}>{selectedTeamDay.username} · {dayjs(selectedTeamDay.work_date).format("DD MMMM YYYY")}</Typography.Title><Tag color={selectedTeamDay.status === "on_leave" ? "blue" : "red"}>{selectedTeamDay.status === "on_leave" ? "Cuti" : "Belum Isi"}</Tag><Typography.Paragraph className="mt-3">{selectedTeamDay.status === "on_leave" ? "Cuti disetujui. Daily Activity tidak wajib pada tanggal ini." : "Laporan belum diisi."}</Typography.Paragraph></> : null}
            </section>
          )}
          {!selectedReportId && <>
            <div className="oztoolbar">
              <label className="flex flex-col gap-1 text-xs">Tanggal kerja<DatePicker value={dayjs(workDate)} onChange={(value) => { if (value) { setWorkDate(value.format("YYYY-MM-DD")); setSelectedReportId(null); setSelectedTeamDay(null); } }} /></label>
              <label className="flex min-w-56 flex-1 flex-col gap-1 text-xs">Nama / aktivitas<Input.Search allowClear placeholder="Cari nama atau isi laporan…" value={reportSearch} onChange={(event) => setReportSearch(event.target.value)} /></label>
              <label className="flex flex-col gap-1 text-xs">Divisi / role<Select mode="multiple" showSearch optionFilterProp="label" allowClear className="min-w-52" placeholder="Semua" value={divisionFilter} onChange={setDivisionFilter} maxTagCount={1} maxTagPlaceholder={(omitted) => `+${omitted.length}`} options={divisions.map((division) => ({ value: division, label: division }))} /></label>
            </div>
            <div className="ozsummary"><strong>Total {statusCounts.all}</strong><span className="ozsep">·</span><span>Sudah Kirim {statusCounts.sent || 0}</span><span className="ozsep">·</span><span>Belum Kirim {rawStatusCounts.pending || 0}</span><span className="ozsep">·</span><span>Terlambat {rawStatusCounts.late || 0}</span>{rawStatusCounts.on_leave ? <><span className="ozsep">·</span><span>Cuti {rawStatusCounts.on_leave}</span></> : null}</div>
             <div className="ozpills" aria-label="Filter status laporan">{[["pending", "Belum Kirim"], ["submitted", "Sudah Kirim"]].map(([value, label]) => <button key={value} type="button" aria-pressed={statusFilter === value} onClick={() => setStatusFilter(value)}>{label}</button>)}<Button size="small" onClick={() => { setStatusFilter(""); setDivisionFilter([]); setReportSearch(""); }}>Clear Filter</Button></div>
            <div className="oztablewrap"><Table rowKey={(row) => `${row.user_id}:${row.work_date}`} loading={teamQuery.isLoading} dataSource={filteredActivityRows} pagination={{ pageSize: 20 }} columns={[
              { title: "Nama / jabatan", width: "25%", render: (_value, row) => <div><Typography.Text strong>{row.username}</Typography.Text><br /><Typography.Text type="secondary">{row.role_name || "-"}</Typography.Text></div> },
              { title: "Status laporan", width: "20%", dataIndex: "status", render: (value, row) => <div><Tag color={value === "submitted" ? (wasSubmittedLate(row) ? "orange" : "green") : value === "missing" ? "red" : value === "on_leave" ? "blue" : "gold"}>{value === "submitted" ? (wasSubmittedLate(row) ? "Terlambat" : "✓ Sudah Kirim") : value === "missing" ? "Belum Isi" : value === "on_leave" ? "Cuti" : "Draft"}</Tag>{row.submitted_at && <div className="mt-1 text-xs text-slate-500">{wasSubmittedLate(row) ? "Terlambat · " : "Dikirim "}{wibDateAndTime(row.submitted_at).time} WIB</div>}</div> },
              { title: "Aktivitas hari ini", width: "39%", render: (_value, row) => row.activities.length ? <div><p className="line-clamp-2">{row.activities[0].content}</p><Typography.Text type="secondary">{row.activities.length} aktivitas</Typography.Text></div> : <Typography.Text type="secondary">{row.status === "on_leave" ? "Cuti disetujui" : "Belum ada aktivitas tercatat."}</Typography.Text> },
              { title: "Aksi", width: "16%", render: (_value, row) => <Button type="link" onClick={() => { setSelectedTeamDay(row); setSelectedReportId(row.report_id); }}>{row.report_id ? row.activities.length ? "Lihat Detail" : "Lihat Status" : "Lihat Status"}</Button> },
            ]} /></div>
             <div className="ozfooter"><span>{filteredActivityRows.length} laporan / status ditemukan</span><span>Batas kirim harian: {teamDeadline} WIB</span></div>
          </>}
        </section>
      )}

      {tab === "structure" && (
        <section className="flex flex-col gap-3">
          <div className="ozrow ozbetween"><div><h3>Struktur per Role</h3><small>{isAdmin ? "Atur atasan role; user mengikuti role masing-masing." : "Struktur role dapat dilihat, tetapi hanya Super Admin yang dapat mengubahnya."}</small></div></div>
          {structureQuery.isLoading || (isAdmin && configQuery.isLoading) ? <Spin /> : <div className="ozstructuregrid">
            <div className="ozorgwrap"><div className="ozorg" aria-label="Struktur role"><ul className="ozorgroot">{(childrenByRole.get(null) || []).map((root) => renderOrgNode(root))}</ul></div></div>
            {isAdmin && <section className="ozpanel">
              <div className="ozrow ozbetween"><h3>Cakupan Laporan</h3><label style={{ fontSize: 12 }}>Lihat sebagai<Select aria-label="Simulasi akses sebagai pengguna" showSearch optionFilterProp="label" className="w-56" options={userOptions} value={scopeViewerId} onChange={(userId) => { setScopeViewerId(userId); setScopePreview([]); if (userId) scopePreviewMutation.mutate(userId); }} placeholder="Pilih pengguna" /></label></div>
              <div className="my-3 text-xs">Cakupan mengikuti role yang dipilih dan seluruh role di bawahnya.</div>
              <div className="max-h-64 overflow-auto">{users.map((user) => { const allowed = scopePreview.includes(user.id); return <div key={user.id} className="ozaccessrow"><div><span>{user.username}</span><small>{user.role_name || ""}</small></div><span className={`ozaccessstate ${allowed ? "ozallowed" : "ozdenied"}`}>{allowed ? user.id === scopeViewerId ? "✓ Sendiri" : "✓ Bisa lihat" : "Tidak bisa"}</span></div>; })}</div>
              <Button type="primary" style={{ marginTop: 15 }} disabled={!scopePreview.length} onClick={() => { setTeamScopePreviewIds(scopePreview); setSelectedReportId(null); setSelectedTeamDay(null); setTab("team"); }}>Lihat Monitoring dengan Akses Ini</Button>
            </section>}
          </div>}
          {isAdmin ? <details className="rounded-xl border border-slate-200 bg-white p-4">
            <summary className="cursor-pointer font-semibold">Atur atasan role</summary>
            <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="py-2">Role</th><th className="py-2">Atasan role</th><th className="py-2">User</th></tr></thead><tbody>{structureRoles.map((role) => <tr key={role.id} className="border-t"><td className="py-2 font-medium">{role.name}</td><td className="py-2"><Select aria-label={`Atasan role ${role.name}`} allowClear showSearch optionFilterProp="label" className="w-full" options={roleRows.filter((candidate) => candidate.id !== role.id && !getDescendantRoleIds(role.id).has(candidate.id)).map((candidate) => ({ value: candidate.id, label: candidate.name }))} value={role.manager_role_id || undefined} placeholder="Pilih atasan role" onChange={(managerRoleId) => roleManagerMutation.mutate({ roleId: role.id, managerRoleId: managerRoleId || null })} /></td><td className="py-2">{role.members.length}</td></tr>)}</tbody></table></div>
          </details> : <section className="overflow-x-auto rounded-xl border bg-white p-4"><h3 className="mb-3 font-semibold">Role dan Atasan</h3><table className="w-full text-left text-sm"><thead><tr><th className="py-2">Role</th><th className="py-2">Atasan role</th><th className="py-2">User</th></tr></thead><tbody>{structureRoles.map((role) => <tr key={role.id} className="border-t"><td className="py-2 font-medium">{role.name}</td><td className="py-2">{structureRoles.find((candidate) => candidate.id === role.manager_role_id)?.name || "-"}</td><td className="py-2">{role.members.length}</td></tr>)}</tbody></table></section>}
        </section>
      )}

      {tab === "settings" && isAdmin && (
        <section className="flex flex-col gap-6">
          <Button className="self-start" onClick={() => setTab("calendar")}>Hari Libur</Button>
          <div className="ozsettinggrid">
            <section className="ozpanel">
              <Typography.Title level={4}>Siapa yang wajib mengisi?</Typography.Title>
              <Typography.Text type="secondary">Pilih Role sebagai aturan utama.</Typography.Text>
              <div className="mt-3">{roleRows.map((role) => <div className="ozcheck" key={role.id}><Checkbox checked={roleRequiredDraft[role.id] || false} onChange={(event) => setRoleRequiredDraft((state) => ({ ...state, [role.id]: event.target.checked }))} />{role.name}</div>)}</div>
            </section>
            <section className="ozpanel">
              <Typography.Title level={4}>Jadwal pengisian</Typography.Title>
              <div className="ozsettingrows"><label>Batas kirim harian (WIB)<TimePicker format="HH:mm" value={dayjs(`2000-01-01T${deadline}`)} onChange={(value) => value && setDeadline(value.format("HH:mm"))} /></label><label>Perubahan mulai berlaku<DatePicker value={dayjs(effectiveFrom)} minDate={dayjs(today())} onChange={(value) => value && setEffectiveFrom(value.format("YYYY-MM-DD"))} /></label></div>
              <Typography.Text className="mt-4 block">Hari kerja · Senin–Sabtu</Typography.Text>
              <div className="ozdays">{["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((day, index) => <div key={day} className="ozday"><Checkbox checked={index > 0} disabled />{day}</div>)}</div>
              <Typography.Text type="secondary" className="mt-2 block">Minggu otomatis libur. Hari libur lainnya mengikuti Master Hari Libur.</Typography.Text>
            </section>
          </div>
          <section className="ozpanel">
            <Typography.Title level={4}>Kewajiban per orang</Typography.Title>
            <Typography.Paragraph type="secondary">Aturan per orang mengalahkan aturan role.</Typography.Paragraph>
            <Alert className="mb-3" type="info" showIcon message="Kewajiban Daily Activity dikecualikan pada tanggal cuti yang sudah disetujui atasan." />
            <div className="mb-3 flex flex-wrap gap-2"><Input className="max-w-sm" aria-label="Cari orang" placeholder="Cari nama atau jabatan" value={overrideSearch} onChange={(event) => setOverrideSearch(event.target.value)} /><Select allowClear className="min-w-52" aria-label="Filter role" placeholder="Semua role" value={overrideRoleFilter} onChange={setOverrideRoleFilter} options={roleRows.map((role) => ({ value: role.id, label: role.name }))} /></div>
            <Table rowKey="id" size="small" loading={configQuery.isLoading} dataSource={filteredOverrideUsers} pagination={{ pageSize: 20 }} columns={[
              { title: "Nama / jabatan", render: (_value, user) => <><Typography.Text strong>{user.username}</Typography.Text><br/><Typography.Text type="secondary">{user.role_name || "-"}</Typography.Text></> },
              { title: "Aturan pengisian", render: (_value, user) => <Select className="w-48" value={userOverrideDrafts[user.id] || "follow_role"} onChange={(rule) => setUserOverrideDrafts((state) => ({ ...state, [user.id]: rule }))} options={[{ value: "follow_role", label: "Ikuti Role" }, { value: "required", label: "Wajib" }, { value: "exempt", label: "Tidak Wajib" }]} /> },
            ]} />
          </section>
          <Button type="primary" className="self-start" loading={savePolicyMutation.isPending} onClick={() => savePolicyMutation.mutate()}>Simpan Pengaturan</Button>
        </section>
      )}

      {tab === "calendar" && canManageHolidays && (
        <section className="flex flex-col gap-4">
          <Button className="self-start" onClick={() => setTab(isAdmin ? "settings" : "mine")}>{isAdmin ? "Kembali ke Pengaturan" : "Kembali"}</Button>
          <Alert type="info" showIcon message="Hari Minggu otomatis libur. Hari libur lainnya dikelola di sini." />
          <div className="flex flex-wrap items-end gap-3 rounded-xl border p-4">
            <label className="flex flex-col gap-1">Tanggal<DatePicker value={dayjs(holidayDate)} onChange={(value) => value && setHolidayDate(value.format("YYYY-MM-DD"))} /></label>
            <label className="flex flex-col gap-1">Nama hari libur<Input value={holidayName} onChange={(event) => setHolidayName(event.target.value)} maxLength={255} /></label>
            <Button type="primary" disabled={!holidayName.trim()} loading={holidayMutation.isPending} onClick={() => holidayMutation.mutate()}>Tambah Hari Libur</Button>
          </div>
          <Table rowKey="id" loading={configQuery.isLoading} dataSource={holidayRows} pagination={{ pageSize: 20 }} columns={[
            { title: "Tanggal", dataIndex: "holiday_date" }, { title: "Nama", dataIndex: "name" },
            { title: "Aksi", render: (_value, holiday: any) => <Button danger size="small" loading={deleteHolidayMutation.isPending} onClick={() => deleteHolidayMutation.mutate(holiday.id)}>Hapus</Button> },
          ]} />
        </section>
      )}
      <Modal
        title="Ajukan Cuti"
        open={leaveModalOpen}
        okText="Kirim Pengajuan"
        cancelText="Batal"
        confirmLoading={createLeaveMutation.isPending}
        okButtonProps={{ disabled: !leaveStart || !leaveEnd }}
        onCancel={() => setLeaveModalOpen(false)}
        onOk={() => createLeaveMutation.mutate()}
      >
        <div className="grid gap-3 py-2">
          <label className="flex flex-col gap-1 text-sm">Rentang tanggal<DatePicker.RangePicker className="w-full" value={[leaveStart, leaveEnd]} onChange={(value) => { setLeaveStart(value?.[0] || null); setLeaveEnd(value?.[1] || null); }} /></label>
          <label className="flex flex-col gap-1 text-sm">Catatan (opsional)<Input.TextArea maxLength={1000} rows={3} value={leaveNote} onChange={(event) => setLeaveNote(event.target.value)} placeholder="Tambahkan catatan bila perlu" /></label>
          <Typography.Text type="secondary">Atasan ditentukan otomatis dari struktur role. Daily Activity tetap wajib sampai cuti disetujui.</Typography.Text>
        </div>
      </Modal>
      <Modal
        title={leaveDecision?.decision === "approved" ? "Setujui cuti?" : "Tolak cuti?"}
        open={!!leaveDecision}
        okText={leaveDecision?.decision === "approved" ? "Setujui" : "Tolak"}
        cancelText="Batal"
        okButtonProps={{ danger: leaveDecision?.decision === "rejected" }}
        confirmLoading={decideLeaveMutation.isPending}
        onCancel={() => { setLeaveDecision(null); setLeaveDecisionNote(""); }}
        onOk={() => leaveDecision && decideLeaveMutation.mutate({ requestId: leaveDecision.requestId, decision: leaveDecision.decision, note: leaveDecisionNote })}
      >
        {leaveDecision?.decision === "rejected" ? <label className="flex flex-col gap-1">Alasan penolakan (opsional)<Input.TextArea rows={3} maxLength={1000} value={leaveDecisionNote} onChange={(event) => setLeaveDecisionNote(event.target.value)} /></label> : <Typography.Paragraph className="!mb-0">Tanggal cuti yang disetujui tidak dihitung sebagai kewajiban Daily Activity dan tidak menyebabkan akses terkunci.</Typography.Paragraph>}
      </Modal>
    </div>
    </div>
    </>
  );
}
