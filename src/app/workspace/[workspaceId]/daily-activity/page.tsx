"use client";

import {
  addDailyActivityHoliday,
  getDailyActivityAccessStatus,
  getDailyActivityConfiguration,
  getDailyActivityReports,
  getDailyActivityStructure,
  getMyDailyActivity,
  removeDailyActivityHoliday,
  saveDailyActivityDraft,
  setDailyActivityDeadline,
  setDailyActivityRoleRule,
  setDailyActivityUserOverride,
  submitDailyActivity,
  uploadDailyActivityImage,
  updateDailyActivityRoleManager,
} from "@api/daily-activity";
import { DailyActivityRole, DailyActivityTab } from "@myTypes/daily-activity";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, DatePicker, Input, Select, Spin, Table, Tabs, Tag, TimePicker, Typography, message } from "antd";
import dayjs from "dayjs";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { usePermissions } from "@hooks/account";

const today = () => dayjs().format("YYYY-MM-DD");

export default function DailyActivityPage() {
  const params = useParams();
  const [tab, setTab] = useState<DailyActivityTab>("mine");
  const [workDate, setWorkDate] = useState(today());
  const [activities, setActivities] = useState<string[]>([""]);
  const [activityIds, setActivityIds] = useState<string[]>([]);
  const [attachmentBusy, setAttachmentBusy] = useState(false);
  const [reportSearch, setReportSearch] = useState("");
  const [holidayName, setHolidayName] = useState("");
  const [holidayDate, setHolidayDate] = useState(today());
  const [effectiveFrom, setEffectiveFrom] = useState(today());
  const [deadline, setDeadline] = useState("18:00");
  const [managerByRole, setManagerByRole] = useState<Record<string, string | null>>({});
  const [overrideUserId, setOverrideUserId] = useState<string>();
  const [overrideRule, setOverrideRule] = useState<"follow_role" | "required" | "exempt">("follow_role");
  const queryClient = useQueryClient();
  const { isSuperAdmin } = usePermissions();
  const isAdmin = isSuperAdmin();

  const accessQuery = useQuery({ queryKey: ["daily-activity-access-status"], queryFn: getDailyActivityAccessStatus });
  const reportQuery = useQuery({ queryKey: ["daily-activity-my-report", workDate], queryFn: () => getMyDailyActivity(workDate), enabled: tab === "mine" });
  const teamQuery = useQuery({ queryKey: ["daily-activity-reports", workDate, reportSearch], queryFn: () => getDailyActivityReports(workDate, workDate, reportSearch), enabled: tab === "team" });
  const structureQuery = useQuery({ queryKey: ["daily-activity-structure"], queryFn: getDailyActivityStructure, enabled: isAdmin && tab === "structure" });
  const configQuery = useQuery({ queryKey: ["daily-activity-configuration"], queryFn: getDailyActivityConfiguration, enabled: isAdmin && ["settings", "structure", "calendar"].includes(tab) });

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
      ? submitDailyActivity(workDate, activities.map((content) => ({ content })))
      : saveDailyActivityDraft(workDate, activities.map((content) => ({ content }))),
    onSuccess: (_data, submit) => {
      message.success(submit ? "Daily Activity terkirim" : "Draft tersimpan");
      invalidateFeature();
      void queryClient.invalidateQueries({ queryKey: ["daily-activity-my-report", workDate] });
    },
    onError: (error: any) => message.error(error?.response?.data?.message || "Gagal menyimpan Daily Activity"),
  });

  const managerMutation = useMutation({ mutationFn: ({ roleId, managerRoleId }: { roleId: string; managerRoleId: string | null }) => updateDailyActivityRoleManager(roleId, managerRoleId), onSuccess: () => { message.success("Atasan role diperbarui"); void queryClient.invalidateQueries({ queryKey: ["daily-activity-structure"] }); }, onError: (error: any) => { message.error(error?.response?.data?.message || "Gagal memperbarui atasan role"); void queryClient.invalidateQueries({ queryKey: ["daily-activity-structure"] }); } });
  const roleRuleMutation = useMutation({ mutationFn: ({ roleId, required }: { roleId: string; required: boolean }) => setDailyActivityRoleRule(roleId, required, effectiveFrom), onSuccess: () => { message.success("Aturan role tersimpan"); void queryClient.invalidateQueries({ queryKey: ["daily-activity-configuration"] }); } });
  const overrideMutation = useMutation({ mutationFn: ({ userId, rule }: { userId: string; rule: "follow_role" | "required" | "exempt" }) => setDailyActivityUserOverride(userId, rule, effectiveFrom), onSuccess: () => { message.success("Pengecualian disimpan"); void queryClient.invalidateQueries({ queryKey: ["daily-activity-configuration"] }); } });
  const deadlineMutation = useMutation({ mutationFn: () => setDailyActivityDeadline(deadline, effectiveFrom), onSuccess: () => { message.success("Batas kirim disimpan"); void queryClient.invalidateQueries({ queryKey: ["daily-activity-configuration"] }); } });
  const holidayMutation = useMutation({ mutationFn: () => addDailyActivityHoliday(holidayDate, holidayName), onSuccess: () => { setHolidayName(""); message.success("Hari libur ditambahkan"); void queryClient.invalidateQueries({ queryKey: ["daily-activity-configuration"] }); } });
  const deleteHolidayMutation = useMutation({ mutationFn: removeDailyActivityHoliday, onSuccess: () => { message.success("Hari libur dihapus"); void queryClient.invalidateQueries({ queryKey: ["daily-activity-configuration"] }); } });

  const users = configQuery.data?.users || [];
  const roles = structureQuery.data || [];
  const userOptions = useMemo(() => users.map((user) => ({ value: user.id, label: user.username })), [users]);
  const roleOptions = useMemo(() => roles.map((role) => ({ value: role.id, label: role.name })), [roles]);
  const holidayRows = configQuery.data?.holidays || [];
  const roleRows = configQuery.data?.roles || [];
  const rulesByRole = new Map<string, Array<{ id: string; role_id: string; is_required: boolean; effective_from: string }>>();
  for (const rule of configQuery.data?.role_rules || []) {
    if (rule.effective_from > effectiveFrom) continue;
    const rules = rulesByRole.get(rule.role_id) || [];
    rules.push(rule);
    rulesByRole.set(rule.role_id, rules);
  }
  const ruleByRole = new Map(Array.from(rulesByRole.entries()).map(([roleId, rules]) => [
    roleId,
    rules.sort((left, right) => left.effective_from.localeCompare(right.effective_from)).at(-1),
  ]));
  const selectedOverride = (configQuery.data?.user_overrides || [])
    .filter((override) => override.user_id === overrideUserId && override.effective_from <= effectiveFrom)
    .sort((left, right) => left.effective_from.localeCompare(right.effective_from))
    .at(-1);
  const childrenByManager = useMemo(() => {
    const result = new Map<string | null, DailyActivityRole[]>();
    for (const role of roles) {
      const managerRoleId = role.manager_role_id || null;
      result.set(managerRoleId, [...(result.get(managerRoleId) || []), role]);
    }
    return result;
  }, [roles]);
  const getDescendantRoleIds = (roleId: string) => {
    const descendants = new Set<string>();
    const visit = (parentRoleId: string) => {
      for (const child of childrenByManager.get(parentRoleId) || []) {
        if (descendants.has(child.id)) continue;
        descendants.add(child.id);
        visit(child.id);
      }
    };
    visit(roleId);
    return descendants;
  };
  const renderOrgNode = (role: DailyActivityRole, depth = 0, ancestors = new Set<string>()): React.ReactNode => {
    if (ancestors.has(role.id)) return null;
    const nextAncestors = new Set(ancestors).add(role.id);
    const children = childrenByManager.get(role.id) || [];
    const descendantIds = getDescendantRoleIds(role.id);
    return (
      <div key={role.id} className="min-w-0">
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-3" style={{ marginLeft: depth * 24 }}>
          <div className="min-w-40">
            <Typography.Text strong>{role.name}</Typography.Text>
            <div><Typography.Text type="secondary">{users.filter((user) => user.role_id === role.id).length} orang</Typography.Text></div>
          </div>
          <Select
            aria-label={`Parent role ${role.name}`}
            allowClear
            showSearch
            optionFilterProp="label"
            className="w-full max-w-xs"
            value={managerByRole[role.id] !== undefined ? managerByRole[role.id] || undefined : role.manager_role_id || undefined}
            options={roleOptions.filter((option) => option.value !== role.id && !descendantIds.has(option.value))}
            placeholder="Pilih parent role; kosong = root"
            onChange={(managerRoleId) => {
              const resolved = managerRoleId || null;
              setManagerByRole((state) => ({ ...state, [role.id]: resolved }));
              managerMutation.mutate({ roleId: role.id, managerRoleId: resolved });
            }}
          />
        </div>
        {children.length > 0 && <div className="mt-2 flex flex-col gap-2">{children.map((child) => renderOrgNode(child, depth + 1, nextAncestors))}</div>}
      </div>
    );
  };

  return (
    <div className="flex min-w-0 flex-col gap-4 p-4 md:p-6">
      <div>
        <Typography.Text type="secondary" className="block uppercase tracking-wide">Daily Activity</Typography.Text>
        <Typography.Title level={2} className="!mb-0 !mt-1">Aktivitas Harian</Typography.Title>
      </div>
      {accessQuery.data?.locked && (
        <Alert type="error" showIcon message={`Belum mengisi Daily Activity tanggal ${accessQuery.data.oldest_missed_date}. Silakan isi terlebih dahulu.`} description="Akses kerja akan terbuka otomatis setelah seluruh tunggakan dikirim." />
      )}
      <Tabs activeKey={tab} onChange={(value) => setTab(value as DailyActivityTab)} items={[
        { key: "mine", label: "Daily Saya" },
        { key: "team", label: "Monitoring Tim" },
        ...(isAdmin ? [{ key: "settings", label: "Pengaturan" }, { key: "structure", label: "Struktur" }, { key: "calendar", label: "Hari Libur & Kunci Akses" }] : []),
      ]} />

      {tab === "mine" && (
        <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><Typography.Title level={4} className="!mb-1">Catat aktivitas hari ini</Typography.Title><Typography.Text type="secondary">Satu laporan per tanggal kerja. Draft belum memenuhi kewajiban kirim.</Typography.Text></div>
            <DatePicker value={dayjs(workDate)} onChange={(value) => value && setWorkDate(value.format("YYYY-MM-DD"))} disabledDate={(date) => date.isAfter(dayjs(), "day")} />
          </div>
          {reportQuery.isLoading ? <Spin /> : <>
            {!reportQuery.data?.required && <Alert type="info" showIcon message="Pengisian tidak wajib pada tanggal ini" />}
            {activities.map((content, index) => (
              <div key={index} className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3">
                <div className="flex gap-2">
                  <Input.TextArea aria-label={`Aktivitas ${index + 1}`} autoSize={{ minRows: 2 }} maxLength={20000} value={content} onChange={(event) => setActivities((items) => items.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} placeholder="Tuliskan aktivitas yang dikerjakan..." disabled={saveMutation.isPending} />
                  <Button danger disabled={activities.length === 1 || saveMutation.isPending} onClick={() => setActivities((items) => items.filter((_, itemIndex) => itemIndex !== index))}>Hapus</Button>
                </div>
                {activityIds[index] && (
                  <label className="w-fit cursor-pointer rounded-md border px-3 py-1.5 text-sm hover:bg-slate-50">
                    Tambah gambar
                    <input type="file" accept="image/*" className="sr-only" disabled={attachmentBusy} onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      setAttachmentBusy(true);
                      try {
                        await uploadDailyActivityImage(activityIds[index], file);
                        message.success("Gambar ditambahkan");
                      } catch (error: any) {
                        message.error(error?.response?.data?.message || error?.message || "Upload gambar gagal");
                      } finally {
                        setAttachmentBusy(false);
                        event.target.value = "";
                      }
                    }} />
                  </label>
                )}
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setActivities((items) => [...items, ""])} disabled={saveMutation.isPending}>Tambah Aktivitas</Button>
              <Button onClick={() => saveMutation.mutate(false)} loading={saveMutation.isPending}>{reportQuery.data?.report?.status === "submitted" ? "Simpan Perubahan" : "Simpan Draft"}</Button>
              <Button type="primary" onClick={() => saveMutation.mutate(true)} loading={saveMutation.isPending}>{reportQuery.data?.report?.status === "submitted" ? "Kirim Perubahan" : "Kirim Daily"}</Button>
              {reportQuery.data?.report?.status === "submitted" && <Tag color="green">Sudah Kirim</Tag>}
            </div>
            <Typography.Text type="secondary">Link dan referensi card tersedia melalui API; gambar dapat ditambahkan setelah aktivitas tersimpan sebagai draft.</Typography.Text>
          </>}
        </section>
      )}

      {tab === "team" && (
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2"><DatePicker value={dayjs(workDate)} onChange={(value) => value && setWorkDate(value.format("YYYY-MM-DD"))} /><Input.Search allowClear placeholder="Cari nama" value={reportSearch} onChange={(event) => setReportSearch(event.target.value)} className="max-w-sm" /></div>
          <Table rowKey={(row) => `${row.user_id}:${row.work_date}`} loading={teamQuery.isLoading} dataSource={teamQuery.data || []} pagination={{ pageSize: 20 }} columns={[
            { title: "Tanggal", dataIndex: "work_date" },
            { title: "Nama", dataIndex: "username" },
            { title: "Jabatan / Role", dataIndex: "role_name", render: (value) => value || "-" },
            { title: "Status", dataIndex: "status", render: (value) => <Tag color={value === "submitted" ? "green" : value === "missing" ? "red" : value === "draft" ? "gold" : "default"}>{value === "submitted" ? "Sudah Kirim" : value === "missing" ? "Belum Isi" : value === "draft" ? "Draft" : "Tidak Wajib"}</Tag> },
          ]} />
        </section>
      )}

      {tab === "structure" && isAdmin && (
        <section className="flex flex-col gap-3">
          <Alert type="info" showIcon message="Struktur pelaporan disusun per Role. Semua orang dalam role mengikuti posisi role tersebut; atasan bertingkat dihitung dari parent role." />
          {structureQuery.isLoading || configQuery.isLoading ? <Spin /> : <div className="flex flex-col gap-3">{(childrenByManager.get(null) || []).map((root) => renderOrgNode(root))}</div>}
        </section>
      )}

      {tab === "settings" && isAdmin && (
        <section className="flex flex-col gap-6">
          <Alert type="info" showIcon message="Struktur pelaporan ditentukan oleh tree Role. Kewajiban default juga ditentukan per Role, dengan pengecualian wajib/tidak wajib untuk orang tertentu." />
          <div className="flex flex-wrap items-end gap-3 rounded-xl border p-4">
            <label className="flex flex-col gap-1">Berlaku mulai<DatePicker value={dayjs(effectiveFrom)} onChange={(value) => value && setEffectiveFrom(value.format("YYYY-MM-DD"))} /></label>
            <label className="flex flex-col gap-1">Batas kirim WIB<TimePicker format="HH:mm" value={dayjs(`2000-01-01T${deadline}`)} onChange={(value) => value && setDeadline(value.format("HH:mm"))} /></label>
            <Button type="primary" loading={deadlineMutation.isPending} onClick={() => deadlineMutation.mutate()}>Simpan Batas</Button>
          </div>
          <div>
            <Typography.Title level={5}>Default berdasarkan role</Typography.Title>
            <Table rowKey="id" loading={configQuery.isLoading} dataSource={roleRows} pagination={false} columns={[
            { title: "Role", dataIndex: "name" },
            { title: "Default wajib isi", render: (_value, role: any) => <Select className="w-48" value={ruleByRole.get(role.id)?.is_required ?? false} onChange={(required) => roleRuleMutation.mutate({ roleId: role.id, required })} options={[{ value: true, label: "Wajib" }, { value: false, label: "Tidak Wajib" }]} /> },
          ]} />
          </div>
          <div className="flex flex-wrap items-end gap-3 rounded-xl border p-4">
            <label className="flex flex-col gap-1">Orang<Select showSearch optionFilterProp="label" className="w-56" options={userOptions} value={overrideUserId} onChange={(id) => {
              setOverrideUserId(id);
              const current = (configQuery.data?.user_overrides || [])
                .filter((override) => override.user_id === id && override.effective_from <= effectiveFrom)
                .sort((left, right) => left.effective_from.localeCompare(right.effective_from))
                .at(-1);
              setOverrideRule(current?.rule || "follow_role");
            }} placeholder="Pilih user" /></label>
            <label className="flex flex-col gap-1">Aturan orang ini<Select className="w-48" value={overrideRule} onChange={(value) => setOverrideRule(value)} options={[{ value: "follow_role", label: "Ikuti default role" }, { value: "required", label: "Wajibkan" }, { value: "exempt", label: "Tidak wajib" }]} /></label>
            <Button type="primary" disabled={!overrideUserId} loading={overrideMutation.isPending} onClick={() => overrideUserId && overrideMutation.mutate({ userId: overrideUserId, rule: overrideRule })}>Simpan Override Orang</Button>
            {overrideUserId && <Typography.Text type="secondary">{users.find((user) => user.id === overrideUserId)?.role_name || (users.find((user) => user.id === overrideUserId) as any)?.role?.name || "Role belum diset"} · {selectedOverride ? `Override aktif: ${selectedOverride.rule}` : "Saat ini mengikuti default role"}</Typography.Text>}
          </div>
          <Table rowKey="id" size="small" loading={configQuery.isLoading || structureQuery.isLoading} dataSource={configQuery.data?.user_overrides || []} pagination={{ pageSize: 10 }} columns={[
            { title: "Orang", dataIndex: "user_id", render: (userId) => users.find((user) => user.id === userId)?.username || userId },
            { title: "Role", dataIndex: "user_id", render: (userId) => users.find((user) => user.id === userId)?.role_name || (users.find((user) => user.id === userId) as any)?.role?.name || "-" },
            { title: "Aturan orang", dataIndex: "rule", render: (value) => value === "required" ? "Wajib" : value === "exempt" ? "Tidak wajib" : "Ikuti role" },
            { title: "Berlaku mulai", dataIndex: "effective_from" },
          ]} />
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
          <Typography.Text type="secondary">Kunci akses berlaku otomatis setelah deadline WIB; draft belum memenuhi kewajiban.</Typography.Text>
        </section>
      )}
    </div>
  );
}
