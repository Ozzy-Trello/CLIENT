"use client";

import {
  addDailyActivityReference,
  addDailyActivityHoliday,
  getDailyActivityAccessStatus,
  getDailyActivityConfiguration,
  getDailyActivityReport,
  getDailyActivityReports,
  getDailyActivityStructure,
  previewDailyActivityScope,
  simulateDailyActivityAccess,
  getMyDailyActivity,
  removeDailyActivityHoliday,
  removeDailyActivityReference,
  saveDailyActivityDraft,
  setDailyActivityDeadline,
  setDailyActivityRoleRule,
  setDailyActivityUserOverride,
  submitDailyActivity,
  uploadDailyActivityImage,
  updateDailyActivityManager,
} from "@api/daily-activity";
import { DailyActivityDay, DailyActivityTab, DailyActivityUser } from "@myTypes/daily-activity";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Checkbox, DatePicker, Input, Select, Spin, Table, Tabs, Tag, TimePicker, Typography, message } from "antd";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
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

export default function DailyActivityPage() {
  const [tab, setTab] = useState<DailyActivityTab>("team");
  const [workDate, setWorkDate] = useState(today());
  const [activities, setActivities] = useState<string[]>([""]);
  const [activityIds, setActivityIds] = useState<string[]>([]);
  const [referenceDrafts, setReferenceDrafts] = useState<Record<number, { url: string; title: string; cardId: string }>>({});
  const [attachmentBusy, setAttachmentBusy] = useState(false);
  const [reportSearch, setReportSearch] = useState("");
  const [divisionFilter, setDivisionFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedTeamDay, setSelectedTeamDay] = useState<DailyActivityDay | null>(null);
  const [scopeViewerId, setScopeViewerId] = useState<string>();
  const [scopePreview, setScopePreview] = useState<string[]>([]);
  const [teamScopePreviewIds, setTeamScopePreviewIds] = useState<string[] | null>(null);
  const [lockViewerId, setLockViewerId] = useState<string>();
  const [lockDate, setLockDate] = useState(today());
  const [lockTime, setLockTime] = useState("19:35");
  const [lockSimulation, setLockSimulation] = useState<any>(null);
  const [simulationSession, setSimulationSession] = useState<{ userId: string; date: string; time: string } | null>(null);
  const [holidayName, setHolidayName] = useState("");
  const [holidayDate, setHolidayDate] = useState(today());
  const [effectiveFrom, setEffectiveFrom] = useState(today());
  const [deadline, setDeadline] = useState("17:00");
  const [roleRequiredDraft, setRoleRequiredDraft] = useState<Record<string, boolean>>({});
  const [userOverrideDrafts, setUserOverrideDrafts] = useState<Record<string, "follow_role" | "required" | "exempt">>({});
  const [userOverrideBaseline, setUserOverrideBaseline] = useState<Record<string, "follow_role" | "required" | "exempt">>({});
  const [managerByUser, setManagerByUser] = useState<Record<string, string | null>>({});
  const queryClient = useQueryClient();
  const { isSuperAdmin } = usePermissions();
  const accountQuery = useCurrentAccount();
  const currentUserId = accountQuery.data?.data?.id;
  const isAdmin = isSuperAdmin();

  const accessQuery = useQuery({ queryKey: ["daily-activity-access-status"], queryFn: getDailyActivityAccessStatus });
  const reportQuery = useQuery({ queryKey: ["daily-activity-my-report", workDate], queryFn: () => getMyDailyActivity(workDate), enabled: tab === "mine" });
  const teamQuery = useQuery({ queryKey: ["daily-activity-reports", workDate], queryFn: () => getDailyActivityReports(workDate, workDate), enabled: tab === "team" });
  const detailQuery = useQuery({ queryKey: ["daily-activity-report", selectedReportId], queryFn: () => getDailyActivityReport(selectedReportId!), enabled: !!selectedReportId });
  const structureQuery = useQuery({ queryKey: ["daily-activity-structure"], queryFn: getDailyActivityStructure, enabled: isAdmin && tab === "structure" });
  const configQuery = useQuery({ queryKey: ["daily-activity-configuration"], queryFn: getDailyActivityConfiguration, enabled: isAdmin && ["settings", "structure", "calendar"].includes(tab) });

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
    const report = reportQuery.data?.report;
    setActivities(report?.activities?.length ? report.activities.map((item) => item.content) : [""]);
    setActivityIds(report?.activities?.map((item) => item.id) || []);
  }, [reportQuery.data]);

  const invalidateFeature = () => {
    void queryClient.invalidateQueries({ queryKey: ["daily-activity"] });
    void queryClient.invalidateQueries({ queryKey: ["daily-activity-access-status"] });
  };

  const saveMutation = useMutation({
    mutationFn: (submit: boolean) => submit
      ? submitDailyActivity(workDate, activities.map((content, index) => ({ id: activityIds[index] || undefined, content })))
      : saveDailyActivityDraft(workDate, activities.map((content, index) => ({ id: activityIds[index] || undefined, content }))),
    onSuccess: (data, submit) => {
      message.success(submit ? "Daily Activity terkirim" : "Draft tersimpan");
      setActivityIds(data.activities.map((item) => item.id));
      invalidateFeature();
      void queryClient.invalidateQueries({ queryKey: ["daily-activity-my-report", workDate] });
    },
    onError: (error: any) => message.error(error?.response?.data?.message || "Gagal menyimpan Daily Activity"),
  });

  const managerMutation = useMutation({ mutationFn: ({ userId, managerId }: { userId: string; managerId: string | null }) => updateDailyActivityManager(userId, managerId), onSuccess: () => { message.success("Atasan diperbarui"); void queryClient.invalidateQueries({ queryKey: ["daily-activity-structure"] }); }, onError: (error: any) => { message.error(error?.response?.data?.message || "Gagal memperbarui atasan"); void queryClient.invalidateQueries({ queryKey: ["daily-activity-structure"] }); } });
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
  const referenceMutation = useMutation({ mutationFn: ({ itemId, reference }: { itemId: string; reference: { type: "link" | "card"; url?: string; display_text?: string; card_id?: string } }) => addDailyActivityReference(itemId, reference), onSuccess: () => { message.success("Referensi ditambahkan"); void queryClient.invalidateQueries({ queryKey: ["daily-activity-my-report", workDate] }); if (selectedReportId) void queryClient.invalidateQueries({ queryKey: ["daily-activity-report", selectedReportId] }); } });
  const removeReferenceMutation = useMutation({ mutationFn: ({ itemId, referenceId }: { itemId: string; referenceId: string }) => removeDailyActivityReference(itemId, referenceId), onSuccess: () => { message.success("Lampiran dihapus"); void queryClient.invalidateQueries({ queryKey: ["daily-activity-my-report", workDate] }); if (selectedReportId) void queryClient.invalidateQueries({ queryKey: ["daily-activity-report", selectedReportId] }); } });
  const scopePreviewMutation = useMutation({ mutationFn: previewDailyActivityScope, onSuccess: (result) => { setScopePreview(result.user_ids); setTeamScopePreviewIds(result.user_ids); }, onError: (error: any) => message.error(error?.response?.data?.message || "Gagal memuat cakupan") });
  const lockSimulationMutation = useMutation({ mutationFn: ({ userId, date, time }: { userId: string; date: string; time: string }) => simulateDailyActivityAccess(userId, date, time), onSuccess: setLockSimulation, onError: (error: any) => message.error(error?.response?.data?.message || "Simulasi gagal") });

  const users = configQuery.data?.users || [];
  const activityRows = teamQuery.data || [];
  const divisions = Array.from(new Set(activityRows.map((row) => row.role_name).filter(Boolean))) as string[];
  const normalizedSearch = reportSearch.trim().toLowerCase();
  const filteredActivityRows = activityRows.filter((row) => {
    const matchesDivision = !divisionFilter || row.role_name === divisionFilter;
    const matchesSearch = !normalizedSearch || `${row.username} ${row.role_name || ""} ${row.activities.map((item) => item.content).join(" ")}`.toLowerCase().includes(normalizedSearch);
    const matchesStatus = statusFilter === "all" || (statusFilter === "pending" ? ["missing", "draft"].includes(row.status) : row.status === statusFilter);
    const matchesScope = !teamScopePreviewIds || teamScopePreviewIds.includes(row.user_id);
    return matchesDivision && matchesSearch && matchesStatus && matchesScope;
  });
  const rawStatusCounts = activityRows.reduce((counts, row) => {
    counts[row.status] = (counts[row.status] || 0) + 1;
    if (row.status === "missing" || row.status === "draft") counts.pending += 1;
    if (wasSubmittedLate(row)) counts.late += 1;
    return counts;
  }, { submitted: 0, draft: 0, missing: 0, not_required: 0, pending: 0, late: 0 } as Record<string, number>);
  const statusCounts = { ...rawStatusCounts, all: activityRows.length, sent: rawStatusCounts.submitted || 0 };
  const simulatedLocked = simulationSession ? !!lockSimulation?.locked : !!accessQuery.data?.locked;
  const userOptions = useMemo(() => users.map((user) => ({ value: user.id, label: user.username })), [users]);
  const managerOptions = useMemo(() => (structureQuery.data || []).map((user) => ({ value: user.id, label: `${user.username}${user.role_name ? ` · ${user.role_name}` : ""}` })), [structureQuery.data]);
  const holidayRows = configQuery.data?.holidays || [];
  const roleRows = configQuery.data?.roles || [];
  const childrenByManager = useMemo(() => {
    const result = new Map<string | null, DailyActivityUser[]>();
    for (const person of structureQuery.data || []) {
      const managerId = person.manager_id || null;
      result.set(managerId, [...(result.get(managerId) || []), person]);
    }
    return result;
  }, [structureQuery.data]);
  const getDescendantIds = (userId: string) => {
    const descendants = new Set<string>();
    const visit = (managerId: string) => {
      for (const child of childrenByManager.get(managerId) || []) {
        if (descendants.has(child.id)) continue;
        descendants.add(child.id);
        visit(child.id);
      }
    };
    visit(userId);
    return descendants;
  };
  const renderOrgNode = (person: DailyActivityUser, depth = 0, ancestors = new Set<string>()): React.ReactNode => {
    if (ancestors.has(person.id)) return null;
    const nextAncestors = new Set(ancestors).add(person.id);
    const children = childrenByManager.get(person.id) || [];
    const inScope = scopePreview.includes(person.id);
    return (
      <li key={person.id}>
        <button type="button" className={`ozorgnode ${scopeViewerId === person.id ? "ozorgselected" : inScope ? "ozorgvisible" : "ozorghidden"}`} aria-pressed={scopeViewerId === person.id} onClick={() => { setScopeViewerId(person.id); scopePreviewMutation.mutate(person.id); }} style={{ marginLeft: depth ? 0 : undefined }}>
          <span className="ozorgname">{person.username}</span><small>{person.role_name || "-"}</small>
        </button>
        {children.length > 0 && <ul>{children.map((child) => renderOrgNode(child, depth + 1, nextAncestors))}</ul>}
      </li>
    );
  };
  const uploadActivityImage = async (index: number, file?: File) => {
    const itemId = activityIds[index];
    if (!file || !itemId) return;
    setAttachmentBusy(true);
    try {
      await uploadDailyActivityImage(itemId, file);
      message.success("Attachment ditambahkan");
      await queryClient.invalidateQueries({ queryKey: ["daily-activity-my-report", workDate] });
    } catch (error: any) {
      message.error(error?.response?.data?.message || error?.message || "Upload gambar gagal");
    } finally {
      setAttachmentBusy(false);
    }
  };
  const saveActivityReference = async (index: number, type: "link" | "card") => {
    const itemId = activityIds[index];
    if (!itemId) return message.info("Simpan draft dulu untuk menambahkan referensi.");
    const draft = referenceDrafts[index] || { url: "", title: "", cardId: "" };
    try {
      await addDailyActivityReference(itemId, type === "link"
        ? { type, url: draft.url, display_text: draft.title }
        : { type, card_id: draft.cardId, display_text: draft.title });
      message.success(type === "link" ? "Link ditambahkan" : "Card ditambahkan");
      setReferenceDrafts((state) => ({ ...state, [index]: { url: "", title: "", cardId: "" } }));
      await queryClient.invalidateQueries({ queryKey: ["daily-activity-my-report", workDate] });
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Gagal menambahkan referensi");
    }
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
      @media(max-width:850px){#ozdaily .ozmain{padding:20px 16px}#ozdaily .ozsettinggrid,#ozdaily .ozstructuregrid{grid-template-columns:1fr}}@media(max-width:650px){#ozdaily .ozmain{padding:15px 12px}#ozdaily .ozheading{align-items:start}#ozdaily h2{font-size:23px}#ozdaily .ozidentity{grid-template-columns:1fr}#ozdaily .oztoolbar{padding:12px}#ozdaily .oztabs button{padding:9px;font-size:12px}#ozdaily .ozorg ul ul{margin-left:7px;padding-left:13px}#ozdaily .ozorg ul ul>li:before{left:-13px;width:13px}}
    `}</style>
    <div id="ozdaily">
    <div className="ozmain flex min-w-0 flex-col gap-4">
      <div className="ozheading"><div><div className="ozeyebrow">WORKSPACE DAILY ACTIVITY</div><h2>Daily Activity</h2></div><span className="ozdemo">Dev · Data live</span></div>
      {simulationSession && <div className="flex items-center justify-between gap-2 border-b bg-amber-50 px-4 py-2 text-xs text-amber-900"><span>Simulasi akses · {users.find((user) => user.id === simulationSession.userId)?.username} · {simulationSession.date}, {simulationSession.time} WIB</span><Button size="small" onClick={() => { setSimulationSession(null); setLockSimulation(null); setTeamScopePreviewIds(null); setTab("team"); }}>Akhiri Simulasi</Button></div>}
      {simulatedLocked && tab !== "mine" ? (
        <section className="grid justify-items-center gap-4 rounded-xl border border-red-200 bg-slate-50 px-5 py-10 text-center">
          <Typography.Title level={3} className="!mb-0">Akses Terkunci</Typography.Title>
          <Typography.Paragraph className="max-w-lg !mb-0">Belum mengisi Daily Activity tanggal {simulationSession ? lockSimulation?.oldest_missed_date : accessQuery.data?.oldest_missed_date}. Silakan isi terlebih dahulu.</Typography.Paragraph>
          <Typography.Text type="secondary">Setelah semua daily yang wajib dikirim terpenuhi, akses terbuka otomatis.</Typography.Text>
          <Button type="primary" onClick={() => { setWorkDate((simulationSession ? lockSimulation?.oldest_missed_date : accessQuery.data?.oldest_missed_date) || today()); setTab("mine"); }}>Isi Daily Activity Sekarang</Button>
        </section>
      ) : (
        <>
          {simulatedLocked && <Alert type="warning" showIcon message={`Akses terkunci karena Daily Activity tanggal ${simulationSession ? lockSimulation?.oldest_missed_date : accessQuery.data?.oldest_missed_date} belum dikirim.`} />}
          {!simulatedLocked && <nav className="oztabs" role="tablist" aria-label="Daily Activity">
            <button role="tab" aria-selected={tab === "team"} onClick={() => setTab("team")}>Monitoring Tim</button>
            <button role="tab" aria-selected={tab === "mine"} onClick={() => setTab("mine")}>Daily Saya</button>
            {isAdmin && <><button role="tab" aria-selected={tab === "settings"} onClick={() => setTab("settings")}>Pengaturan</button><button role="tab" aria-selected={tab === "structure"} onClick={() => setTab("structure")}>Struktur</button><button role="tab" aria-selected={tab === "calendar"} onClick={() => setTab("calendar")}>Hari Libur & Kunci</button></>}
          </nav>}
        </>
      )}

      {tab === "mine" && (
        <section className="flex flex-col gap-4">
          <Alert className="oznotice" type="info" showIcon message="Catat aktivitas hari ini. Link, card, dan attachment bisa ditambahkan jika diperlukan." />
          <div className="ozidentity">
            <div><Typography.Text type="secondary">Pengisi</Typography.Text><Typography.Title level={4} className="!mb-0">{accountQuery.data?.data?.username || ""}</Typography.Title><Typography.Text type="secondary">{accountQuery.data?.data?.role?.name || ""}</Typography.Text></div>
            <label className="flex flex-col gap-1 text-xs">Tanggal kerja<DatePicker value={dayjs(workDate)} onChange={(value) => value && setWorkDate(value.format("YYYY-MM-DD"))} disabledDate={(date) => date.isAfter(dayjs(), "day")} /></label>
          </div>
          {reportQuery.isLoading ? <Spin /> : <>
            {!reportQuery.data?.required && <Alert type="info" showIcon message="Pengisian tidak wajib pada tanggal ini" />}
            <div className="mb-1 flex items-center justify-between"><Typography.Title level={4} className="!mb-0">Aktivitas yang dikerjakan</Typography.Title>{reportQuery.data?.report && <Tag color={reportQuery.data.report.status === "submitted" ? "green" : "gold"}>{reportQuery.data.report.status === "submitted" ? "Sudah Kirim" : "Draft"}</Tag>}</div>
            {activities.map((content, index) => {
              const activityId = activityIds[index];
              const savedActivity = reportQuery.data?.report?.activities.find((item) => item.id === activityId);
              const referenceDraft = referenceDrafts[index] || { url: "", title: "", cardId: "" };
              return <div key={activityId || `new-${index}`} className="ozactivity" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void uploadActivityImage(index, event.dataTransfer.files?.[0]); }} onPaste={(event) => { const file = Array.from(event.clipboardData.files || []).find((item) => item.type.startsWith("image/")); if (file) { event.preventDefault(); void uploadActivityImage(index, file); } }}>
                <div className="flex gap-2">
                  <Input.TextArea aria-label={`Aktivitas ${index + 1}`} autoSize={{ minRows: 2 }} maxLength={20000} value={content} onChange={(event) => setActivities((items) => items.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} placeholder="Tuliskan aktivitas yang dikerjakan..." disabled={saveMutation.isPending} />
                  <Button danger disabled={activities.length === 1 || saveMutation.isPending} onClick={() => { setActivities((items) => items.filter((_, itemIndex) => itemIndex !== index)); setActivityIds((items) => items.filter((_, itemIndex) => itemIndex !== index)); }}>Hapus</Button>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <label className="cursor-pointer rounded border px-2 py-1 hover:bg-slate-50">Pilih file<input type="file" accept="image/*" className="sr-only" disabled={attachmentBusy || !activityId} onChange={(event) => { void uploadActivityImage(index, event.target.files?.[0]); event.target.value = ""; }} /></label>
                  <span>Drop gambar atau paste saat menulis · Maks 50 MB/file</span>
                </div>
                {savedActivity?.references?.length ? <div className="flex flex-wrap gap-2">{savedActivity.references.map((reference) => <span key={reference.id} className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1">{reference.reference_type === "link" ? <a href={reference.url || "#"} target="_blank" rel="noreferrer">{reference.display_text || reference.url}</a> : reference.reference_type === "file" && reference.file_url ? <a href={reference.file_url} target="_blank" rel="noreferrer"><img className="max-h-28 rounded object-cover" src={reference.file_url} alt={reference.display_text || "Activity attachment"} /></a> : <Tag>{reference.reference_type === "card" ? `Card ${reference.display_text || reference.card_id}` : reference.display_text || "Attachment"}</Tag>}<Button type="text" size="small" danger aria-label="Hapus referensi" loading={removeReferenceMutation.isPending} onClick={() => void removeReferenceMutation.mutateAsync({ itemId: activityId!, referenceId: reference.id }).catch((error: any) => message.error(error?.response?.data?.message || "Gagal menghapus referensi"))}>×</Button></span>)}</div> : null}
                {activityId && <div className="ozref">
                  <Input aria-label="Link dokumen atau link lain" placeholder="https:// link dokumen / lainnya" value={referenceDraft.url} onChange={(event) => setReferenceDrafts((state) => ({ ...state, [index]: { ...referenceDraft, url: event.target.value } }))} />
                  <Input aria-label="Judul link" placeholder="Nama link" value={referenceDraft.title} onChange={(event) => setReferenceDrafts((state) => ({ ...state, [index]: { ...referenceDraft, title: event.target.value } }))} />
                  <Button disabled={!referenceDraft.url} loading={referenceMutation.isPending} onClick={() => void saveActivityReference(index, "link")}>Tambah Link</Button>
                  <Input aria-label="Referensi card" placeholder="Card ID" value={referenceDraft.cardId} onChange={(event) => setReferenceDrafts((state) => ({ ...state, [index]: { ...referenceDraft, cardId: event.target.value } }))} />
                  <span className="self-center text-xs text-slate-500">Referensi card opsional</span>
                  <Button disabled={!referenceDraft.cardId} loading={referenceMutation.isPending} onClick={() => void saveActivityReference(index, "card")}>Tambah Card</Button>
                </div>}
              </div>;
            })}
            <div className="ozactions">
              <Button onClick={() => { setActivities((items) => [...items, ""]); setActivityIds((items) => [...items, ""]); }} disabled={saveMutation.isPending}>Tambah Aktivitas</Button>
              {reportQuery.data?.report?.status !== "submitted" && <Button onClick={() => saveMutation.mutate(false)} loading={saveMutation.isPending}>Simpan Draft</Button>}
              <Button type="primary" onClick={() => saveMutation.mutate(true)} loading={saveMutation.isPending}>{reportQuery.data?.report?.status === "submitted" ? "Simpan Perubahan" : "Kirim Daily"}</Button>
              {reportQuery.data?.report?.status === "submitted" && <Tag color="green">Sudah Kirim</Tag>}
            </div>
            <Typography.Text type="secondary">Satu Daily per orang per tanggal kerja. Draft belum dianggap sudah mengirim. Edit setelah kirim tetap tercatat dalam riwayat.</Typography.Text>
          </>}
        </section>
      )}

      {tab === "team" && (
        <section className="flex flex-col gap-3">
          {teamScopePreviewIds && <Alert type="info" showIcon message={`Simulasi cakupan: ${users.find((user) => user.id === scopeViewerId)?.username || "pengguna"}`} action={<Button size="small" onClick={() => { setTeamScopePreviewIds(null); setScopePreview([]); }}>Akhiri Simulasi</Button>} />}
          {selectedTeamDay && (
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <Button onClick={() => { setSelectedReportId(null); setSelectedTeamDay(null); }}>← Kembali ke Monitoring Tim</Button>
                {detailQuery.data && <Tag color={detailQuery.data.status === "submitted" ? "green" : "gold"}>{detailQuery.data.status === "submitted" ? "Sudah Kirim" : "Draft"}</Tag>}
              </div>
              {selectedReportId && detailQuery.isLoading ? <Spin /> : selectedReportId && detailQuery.data ? <>
                <Typography.Title level={4}>{selectedTeamDay.username} · {dayjs(selectedTeamDay.work_date).format("DD MMMM YYYY")}</Typography.Title>
                {detailQuery.data.activities.map((activity, index) => <article key={activity.id} className="mb-3 rounded-lg border p-3"><Typography.Text type="secondary">Aktivitas {index + 1}</Typography.Text><p className="whitespace-pre-wrap">{activity.content}</p><div className="mt-2 flex flex-wrap gap-2">{activity.references?.map((reference) => reference.reference_type === "link" ? <a key={reference.id} href={reference.url || "#"} target="_blank" rel="noreferrer">{reference.display_text || reference.url}</a> : reference.reference_type === "file" && reference.file_url ? <a key={reference.id} href={reference.file_url} target="_blank" rel="noreferrer"><img className="max-h-28 rounded border object-cover" src={reference.file_url} alt={reference.display_text || "Activity attachment"} /></a> : <Tag key={reference.id}>{reference.display_text || reference.card_id || "Attachment"}</Tag>)}</div></article>)}
                {detailQuery.data.history?.length ? <details className="mt-4"><summary>Riwayat laporan</summary><ul>{detailQuery.data.history.map((entry, index) => <li key={`${entry.created_at}:${index}`}>{dayjs(entry.created_at).format("DD MMM YYYY HH:mm")} · {entry.action.replaceAll("_", " ")}</li>)}</ul></details> : null}
                {detailQuery.data.user_id === currentUserId && <Button type="primary" className="mt-3" onClick={() => { setWorkDate(detailQuery.data!.work_date); setTab("mine"); }}>Edit Daily Saya</Button>}
              </> : !selectedTeamDay.report_id ? <><Typography.Title level={4}>{selectedTeamDay.username} · {dayjs(selectedTeamDay.work_date).format("DD MMMM YYYY")}</Typography.Title><Tag color={selectedTeamDay.status === "missing" ? "red" : "default"}>{selectedTeamDay.status === "missing" ? "Belum Isi" : "Tidak Wajib"}</Tag><Typography.Paragraph className="mt-3">{selectedTeamDay.status === "not_required" ? "Tidak ada kewajiban Daily Activity pada tanggal ini." : "Laporan belum diisi."}</Typography.Paragraph></> : null}
            </section>
          )}
          {!selectedReportId && <>
            <div className="oztoolbar">
              <label className="flex flex-col gap-1 text-xs">Tanggal kerja<DatePicker value={dayjs(workDate)} onChange={(value) => { if (value) { setWorkDate(value.format("YYYY-MM-DD")); setSelectedReportId(null); setSelectedTeamDay(null); } }} /></label>
              <label className="flex min-w-56 flex-1 flex-col gap-1 text-xs">Nama / aktivitas<Input.Search allowClear placeholder="Cari nama atau isi laporan…" value={reportSearch} onChange={(event) => setReportSearch(event.target.value)} /></label>
              <label className="flex flex-col gap-1 text-xs">Divisi / role<Select allowClear className="min-w-40" placeholder="Semua" value={divisionFilter || undefined} onChange={(value) => setDivisionFilter(value || "")} options={divisions.map((division) => ({ value: division, label: division }))} /></label>
            </div>
            <div className="ozsummary"><strong>Total {statusCounts.all}</strong><span className="ozsep">·</span><span>Sudah Kirim {statusCounts.sent || 0}</span><span className="ozsep">·</span><span>Belum Kirim {rawStatusCounts.pending || 0}</span><span className="ozsep">·</span><span>Terlambat {rawStatusCounts.late || 0}</span><span className="ozsep">·</span><span>Tidak Wajib {rawStatusCounts.not_required || 0}</span></div>
            <div className="ozpills" aria-label="Filter status laporan">{[["all", "Semua"], ["pending", "Belum Kirim"], ["submitted", "Sudah Kirim"], ["draft", "Draft"], ["missing", "Belum Isi"], ["not_required", "Tidak Wajib"]].map(([value, label]) => <button key={value} type="button" aria-pressed={statusFilter === value} onClick={() => setStatusFilter(value)}>{label}</button>)}</div>
            <div className="oztablewrap"><Table rowKey={(row) => `${row.user_id}:${row.work_date}`} loading={teamQuery.isLoading} dataSource={filteredActivityRows} pagination={{ pageSize: 20 }} columns={[
              { title: "Nama / jabatan", width: "25%", render: (_value, row) => <div><Typography.Text strong>{row.username}</Typography.Text><br /><Typography.Text type="secondary">{row.role_name || "-"}</Typography.Text></div> },
              { title: "Status laporan", width: "20%", dataIndex: "status", render: (value, row) => <div><Tag color={value === "submitted" ? (wasSubmittedLate(row) ? "orange" : "green") : value === "missing" ? "red" : value === "draft" ? "gold" : "default"}>{value === "submitted" ? (wasSubmittedLate(row) ? "Terlambat" : "✓ Sudah Kirim") : value === "missing" ? "Belum Isi" : value === "draft" ? "Draft" : "Tidak Wajib"}</Tag>{row.submitted_at && <div className="mt-1 text-xs text-slate-500">{wasSubmittedLate(row) ? "Terlambat · " : "Dikirim "}{wibDateAndTime(row.submitted_at).time} WIB</div>}</div> },
              { title: "Aktivitas hari ini", width: "39%", render: (_value, row) => row.activities.length ? <div><p className="line-clamp-2">{row.activities[0].content}</p><Typography.Text type="secondary">{row.activities.length} aktivitas</Typography.Text></div> : <Typography.Text type="secondary">{row.status === "not_required" ? "—" : "Belum ada aktivitas tercatat."}</Typography.Text> },
              { title: "Aksi", width: "16%", render: (_value, row) => <Button type="link" onClick={() => { setSelectedTeamDay(row); setSelectedReportId(row.report_id); }}>{row.report_id ? row.activities.length ? "Lihat Detail" : "Lihat Status" : "Lihat Status"}</Button> },
            ]} /></div>
            <div className="ozfooter"><span>{filteredActivityRows.length} laporan / status ditemukan</span><span>Batas kirim harian: {activityRows[0]?.deadline_time?.slice(0, 5) || "17:00"} WIB</span></div>
          </>}
        </section>
      )}

      {tab === "structure" && isAdmin && (
        <section className="flex flex-col gap-3">
          <div className="ozrow ozbetween"><div><h3>Struktur Pelaporan</h3><small>Bagan organisasi · klik nama untuk melihat cakupan akses</small></div></div>
          {structureQuery.isLoading || configQuery.isLoading ? <Spin /> : <div className="ozstructuregrid">
            <div className="ozorgwrap"><div className="ozorg" aria-label="Bagan organisasi"><ul className="ozorgroot">{(childrenByManager.get(null) || []).map((root) => renderOrgNode(root))}</ul></div></div>
            <section className="ozpanel">
              <div className="ozrow ozbetween"><h3>Cakupan Laporan</h3><label style={{ fontSize: 12 }}>Lihat sebagai<Select aria-label="Simulasi akses sebagai pengguna" showSearch optionFilterProp="label" className="w-56" options={userOptions} value={scopeViewerId} onChange={(userId) => { setScopeViewerId(userId); setScopePreview([]); if (userId) scopePreviewMutation.mutate(userId); }} placeholder="Pilih pengguna" /></label></div>
              <div className="my-3 text-xs">Atasan dapat melihat diri sendiri dan seluruh bawahan dalam jalurnya. Rekan setingkat dan cabang lain tidak dapat melihat.</div>
              <div className="max-h-64 overflow-auto">{users.map((user) => { const allowed = scopePreview.includes(user.id); return <div key={user.id} className="ozaccessrow"><div><span>{user.username}</span><small>{user.role_name || ""}</small></div><span className={`ozaccessstate ${allowed ? "ozallowed" : "ozdenied"}`}>{allowed ? user.id === scopeViewerId ? "✓ Sendiri" : "✓ Bisa lihat" : "Tidak bisa"}</span></div>; })}</div>
              <Button type="primary" style={{ marginTop: 15 }} disabled={!scopePreview.length} onClick={() => { setTeamScopePreviewIds(scopePreview); setSelectedReportId(null); setSelectedTeamDay(null); setTab("team"); }}>Lihat Monitoring dengan Akses Ini</Button>
            </section>
          </div>}
          <details className="rounded-xl border border-slate-200 bg-white p-4">
            <summary className="cursor-pointer font-semibold">Atur atasan langsung</summary>
            <Typography.Text type="secondary" className="mt-2 block">Hubungkan setiap orang ke atasannya. Atasan bertingkat ditentukan otomatis dari hubungan ini.</Typography.Text>
            <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="py-2">Nama / jabatan</th><th className="py-2">Atasan langsung</th></tr></thead><tbody>{users.map((user) => <tr key={user.id} className="border-t"><td className="py-2"><Typography.Text strong>{user.username}</Typography.Text><br/><Typography.Text type="secondary">{user.role_name || "-"}</Typography.Text></td><td className="py-2"><Select aria-label={`Atasan langsung ${user.username}`} allowClear showSearch optionFilterProp="label" className="w-full" options={userOptions.filter((option) => option.value !== user.id && !getDescendantIds(user.id).has(option.value))} value={user.manager_id || undefined} placeholder="Pilih atasan" onChange={(managerId) => managerMutation.mutate({ userId: user.id, managerId: managerId || null })} /></td></tr>)}</tbody></table></div>
            <Button type="primary" className="mt-3" loading={managerMutation.isPending} onClick={() => void queryClient.invalidateQueries({ queryKey: ["daily-activity-structure"] })}>Simpan Struktur</Button>
          </details>
          <details className="rounded-xl border border-slate-200 bg-white p-4"><summary className="cursor-pointer font-semibold">Aturan akses untuk pengembangan</summary><div className="ozpolicy"><strong>Role menentukan izin; struktur menentukan cakupan</strong><p>Owner/admin berizin khusus dapat melihat semua. Pengguna lain melihat laporan sendiri dan seluruh bawahan dalam jalurnya. Tidak bisa melihat atasan, rekan setingkat, atau cabang lain.</p></div><div className="ozpolicy"><strong>Satu sumber struktur organisasi</strong><p>Simpan atasan langsung di data Members / Struktur Organisasi, lalu gunakan juga di Daily Activity. Kewajiban mengisi terpisah dari hak melihat laporan.</p></div><div className="ozpolicy"><strong>Pemeriksaan akses di server</strong><p>Terapkan batas akses pada daftar, jumlah, pencarian, detail, dan ekspor. Mengetahui URL laporan tidak memberikan akses. Struktur tidak boleh memiliki siklus atau atasan diri sendiri.</p></div></details>
        </section>
      )}

      {tab === "settings" && isAdmin && (
        <section className="flex flex-col gap-6">
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
            <Typography.Title level={4}>Pengecualian per orang</Typography.Title>
            <Typography.Paragraph type="secondary">Ikuti Role, wajibkan orang tertentu, atau kecualikan. Aturan per orang mengalahkan aturan Role.</Typography.Paragraph>
            <Table rowKey="id" size="small" loading={configQuery.isLoading} dataSource={users} pagination={{ pageSize: 20 }} columns={[
              { title: "Nama / jabatan", render: (_value, user) => <><Typography.Text strong>{user.username}</Typography.Text><br/><Typography.Text type="secondary">{user.role_name || "-"}</Typography.Text></> },
              { title: "Aturan pengisian", render: (_value, user) => <Select className="w-48" value={userOverrideDrafts[user.id] || "follow_role"} onChange={(rule) => setUserOverrideDrafts((state) => ({ ...state, [user.id]: rule }))} options={[{ value: "follow_role", label: "Ikuti Role" }, { value: "required", label: "Wajib" }, { value: "exempt", label: "Tidak Wajib" }]} /> },
            ]} />
          </section>
          <Button type="primary" className="self-start" loading={savePolicyMutation.isPending} onClick={() => savePolicyMutation.mutate()}>Simpan Pengaturan</Button>
          <details><summary>Aturan pencatatan & akses</summary><div className="ozpolicy"><strong>Satu daily per orang per tanggal kerja</strong><p>Tambah aktivitas pada laporan yang sama. Draft belum dianggap sudah mengirim. Link/card dan attachment opsional; maksimum 50 MB per file.</p></div><div className="ozpolicy"><strong>Kewajiban mengikuti hari kerja</strong><p>Tidak wajib saat libur atau cuti/izin yang disetujui. Perubahan aturan berlaku mulai tanggal efektif dan tidak mengubah kewajiban historis.</p></div><div className="ozpolicy"><strong>Izin akses tetap dikelola di Roles</strong><p>Pengisi melihat milik sendiri. Atasan melihat seluruh bawahan dalam jalurnya. Owner/admin berizin khusus dapat melihat semua.</p></div><div className="ozpolicy"><strong>Perubahan tetap tercatat</strong><p>Waktu kirim pertama tetap disimpan. Edit setelah dikirim membuat riwayat perubahan, tidak membuat laporan ganda.</p></div></details>
        </section>
      )}

      {tab === "calendar" && isAdmin && (
        <section className="flex flex-col gap-4">
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
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <Typography.Title level={4}>Aturan Kunci Akses</Typography.Title>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <div><Typography.Text strong>Setelah batas kirim terlewati</Typography.Text><p>Daily wajib yang belum dikirim mengunci akses pekerjaan, termasuk tunggakan hari kerja sebelumnya.</p></div>
              <div><Typography.Text strong>Minggu dan hari libur</Typography.Text><p>Tidak membuat kewajiban baru. Draft belum memenuhi kewajiban kirim.</p></div>
              <div><Typography.Text strong>Daily tetap bisa dibuka</Typography.Text><p>Isi tanggal tertunggak dari yang paling lama. Akses terbuka otomatis setelah semua kewajiban terkirim.</p></div>
            </div>
          </section>
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <Typography.Title level={4}>Coba Simulasi Kunci</Typography.Title>
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1 text-xs">Pengguna<Select showSearch optionFilterProp="label" className="w-56" options={userOptions} value={lockViewerId} onChange={setLockViewerId} placeholder="Pilih pengguna" /></label>
              <label className="flex flex-col gap-1 text-xs">Tanggal simulasi<DatePicker value={dayjs(lockDate)} onChange={(value) => value && setLockDate(value.format("YYYY-MM-DD"))} /></label>
              <label className="flex flex-col gap-1 text-xs">Jam (WIB)<TimePicker format="HH:mm" value={dayjs(`2000-01-01T${lockTime}`)} onChange={(value) => value && setLockTime(value.format("HH:mm"))} /></label>
              <Button disabled={!lockViewerId} loading={lockSimulationMutation.isPending} onClick={() => lockViewerId && lockSimulationMutation.mutate({ userId: lockViewerId, date: lockDate, time: lockTime })}>Coba Simulasi Kunci</Button>
            </div>
            {lockSimulation && <div className="my-3 text-sm" role="status">{lockSimulation.locked ? `Akan terkunci. Tunggakan tertua: ${lockSimulation.oldest_missed_date}.` : "Akses terbuka pada waktu simulasi."}{lockSimulation.missed_dates?.length ? ` Tanggal tertunggak: ${lockSimulation.missed_dates.join(", ")}.` : ""}</div>}
            {lockSimulation && <Button type="primary" onClick={() => { setSimulationSession({ userId: lockSimulation.user_id, date: lockSimulation.date, time: lockSimulation.time }); if (lockSimulation.locked) { setWorkDate(lockSimulation.oldest_missed_date); setTab("mine"); } else { setScopeViewerId(lockSimulation.user_id); scopePreviewMutation.mutate(lockSimulation.user_id); setTab("team"); } }}>Coba Masuk Aplikasi</Button>}
          </section>
          <details className="rounded-xl border border-slate-200 bg-white p-4"><summary className="cursor-pointer font-semibold">Aturan teknis untuk tim IT</summary><div className="mt-3 grid gap-3 md:grid-cols-3"><p>Periksa semua tanggal kerja sejak user mulai diwajibkan. Kunci berlaku di seluruh modul dan URL langsung, bukan hanya tombol menu.</p><p>Tanggal kerja berbeda dari waktu kirim. Kiriman terlambat tidak mengubah waktu kirim pertama.</p><p>Minggu otomatis dikecualikan. Libur lain dikelola di Master Hari Libur. Gunakan WIB di server dan simpan riwayat perubahan kalender/kewajiban.</p></div></details>
        </section>
      )}
    </div>
    </div>
    </>
  );
}
