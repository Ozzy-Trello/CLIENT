import { getMyDailyActivity, saveDailyActivityDraft, submitDailyActivity } from "@api/daily-activity";
import { DailyActivityReport } from "@myTypes/daily-activity";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { v4 as uuid } from "uuid";

type MyReport = Awaited<ReturnType<typeof getMyDailyActivity>>;
type Version = { reportId: string | null; revision: number | null };
type Backup = {
  schema: 1;
  key: string;
  activities: string[];
  activityIds: string[];
  deletedIds: string[];
  version: Version;
  baseline: string;
};
const signature = (activities: string[], ids: string[], removed: string[]) => JSON.stringify([activities, ids, removed]);
const versionOf = (report: DailyActivityReport | null): Version => ({ reportId: report?.id ?? null, revision: report?.revision ?? null });
const errorText = (error: any) => error?.response?.data?.message || error?.message || "Gagal menyimpan Daily Activity. Draft Anda tetap dipertahankan.";

function readBackup(key: string): Backup | null {
  const raw = sessionStorage.getItem(key);
  if (!raw) return null;
  let value: any;
  try { value = JSON.parse(raw); } catch {
    throw new Error("Salinan draft di perangkat tidak dapat dibaca. Jangan tutup halaman sebelum menyimpan ke server.");
  }
  if (value?.schema !== 1 || value.key !== key
    || !Array.isArray(value.activities) || !value.activities.length || !value.activities.every((v: unknown) => typeof v === "string")
    || !Array.isArray(value.activityIds) || value.activityIds.length !== value.activities.length || !value.activityIds.every((v: unknown) => typeof v === "string")
    || !Array.isArray(value.deletedIds) || !value.deletedIds.every((v: unknown) => typeof v === "string")
    || typeof value.baseline !== "string"
    || !(value.version?.reportId === null || typeof value.version?.reportId === "string")
    || !(value.version?.revision === null || (Number.isSafeInteger(value.version?.revision) && value.version.revision >= 0))
    || (value.version.reportId === null) !== (value.version.revision === null)) {
    throw new Error("Salinan draft di perangkat tidak dapat dibaca. Jangan tutup halaman sebelum menyimpan ke server.");
  }
  return value;
}

export function useDailyActivityDraft(userId: string | undefined, workDate: string, enabled: boolean, hasPendingReferences: boolean) {
  const queryClient = useQueryClient();
  const queryKey = ["daily-activity-my-report", userId, workDate] as const;
  const storageKey = userId ? `ozzy_daily_activity_draft_v1:${userId}:${workDate}` : null;
  const [activities, setActivities] = useState<string[]>([""]);
  const [activityIds, setActivityIds] = useState<string[]>([""]);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [editingActivities, setEditingActivities] = useState(false);
  const [version, setVersion] = useState<Version>({ reportId: null, revision: null });
  const [baseline, setBaseline] = useState(signature([""], [""], []));
  const [editorKey, setEditorKey] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const [recoveryAvailable, setRecoveryAvailable] = useState(false);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const openingRef = useRef(false);
  const currentKeyRef = useRef(storageKey);
  currentKeyRef.current = storageKey;
  const lastRequest = useRef<{ signature: string; id: string } | null>(null);
  const dirty = editingActivities && editorKey === storageKey
    && (signature(activities, activityIds, deletedIds) !== baseline || hasPendingReferences);

  const reportQuery = useQuery({
    queryKey,
    enabled: enabled && !!userId,
    queryFn: async () => {
      const incoming = await getMyDailyActivity(workDate);
      const current = queryClient.getQueryData<MyReport>(queryKey);
      if (current?.report && (!incoming.report || (incoming.report.id === current.report.id && incoming.report.revision < current.report.revision))) return current;
      return incoming;
    },
  });

  const loadReport = (report: DailyActivityReport | null) => {
    const text = report?.activities.length ? report.activities.map((item) => item.content) : [""];
    const ids = report?.activities.length ? report.activities.map((item) => item.id) : [""];
    setActivities(text);
    setActivityIds(ids);
    setDeletedIds([]);
    setVersion(versionOf(report));
    setBaseline(signature(text, ids, []));
  };

  useEffect(() => {
    if (!storageKey || editingActivities || !reportQuery.data) return;
    try {
      const recovered = readBackup(storageKey);
      setRecoveryAvailable(!!recovered && JSON.stringify(recovered.activities.map((text) => text.trim())) !== JSON.stringify(reportQuery.data.report?.activities.map((item) => item.content) || []));
    } catch (error) {
      setStorageWarning(errorText(error));
    }
  }, [storageKey, reportQuery.data, editingActivities]);

  useEffect(() => {
    if (!editingActivities && reportQuery.data) loadReport(reportQuery.data.report);
  }, [reportQuery.data, editingActivities]);

  useEffect(() => {
    if (editorKey && editorKey !== storageKey) {
      setEditingActivities(false);
      setEditorKey(null);
      setRestored(false);
      setSaveError(null);
      lastRequest.current = null;
    }
  }, [storageKey, editorKey]);

  const backup: Backup | null = editorKey && editorKey === storageKey
    ? { schema: 1, key: editorKey, activities, activityIds, deletedIds, version, baseline } : null;
  const latest = useRef({ dirty, backup, saving });
  latest.current = { dirty, backup, saving };

  useEffect(() => {
    if (!dirty || !backup) return;
    try {
      sessionStorage.setItem(backup.key, JSON.stringify(backup));
      setStorageWarning(null);
    } catch {
      setStorageWarning("Salinan draft di perangkat belum tersimpan. Jangan tutup halaman sebelum berhasil menyimpan ke server.");
    }
  }, [dirty, editorKey, activities, activityIds, deletedIds, version, baseline]);

  useEffect(() => {
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      const value = latest.current;
      if (!value.dirty && !value.saving) return;
      if (value.backup) {
        try { sessionStorage.setItem(value.backup.key, JSON.stringify(value.backup)); } catch { /* The browser confirmation still protects the open draft. */ }
      }
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, []);

  const openEditor = async () => {
    if (!storageKey || openingRef.current || savingRef.current || editingActivities) return false;
    openingRef.current = true;
    const key = storageKey;
    try {
      const result = await reportQuery.refetch({ throwOnError: true });
      if (currentKeyRef.current !== key || !result.data) return false;
      const report = result.data.report;
      if (report && (!Number.isSafeInteger(report.revision) || report.user_id !== userId || report.work_date !== workDate)) {
        throw new Error("Muat ulang halaman untuk menggunakan pengaman draft terbaru.");
      }
      loadReport(report);
      let recovered: Backup | null = null;
      try { recovered = readBackup(key); } catch (error) { setStorageWarning(errorText(error)); }
      const alreadySaved = recovered && JSON.stringify(recovered.activities.map((text) => text.trim())) === JSON.stringify(report?.activities.map((item) => item.content) || []);
      if (recovered && !alreadySaved) {
        setActivities(recovered.activities);
        setActivityIds(recovered.activityIds);
        setDeletedIds(recovered.deletedIds);
        setVersion(recovered.version);
        setBaseline(recovered.baseline);
      }
      setRestored(!!recovered && !alreadySaved);
      setRecoveryAvailable(false);
      setSaveError(null);
      setEditorKey(key);
      setEditingActivities(true);
      lastRequest.current = null;
      return true;
    } catch (error) {
      setSaveError(errorText(error));
      return false;
    } finally {
      openingRef.current = false;
    }
  };

  const removeActivity = (index: number) => {
    const id = activityIds[index];
    if (id) setDeletedIds((current) => Array.from(new Set([...current, id])));
    setActivities((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setActivityIds((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const save = async (submit: boolean) => {
    if (savingRef.current || !editingActivities || !storageKey || editorKey !== storageKey) throw new Error("Penyimpanan belum siap. Tunggu sebentar lalu coba lagi.");
    if (!activities.length || activities.some((text) => !text.trim())) throw new Error("Isi atau hapus semua baris aktivitas sebelum menyimpan.");
    const key = storageKey;
    const text = activities.map((content, index) => ({ id: activityIds[index] || undefined, content: content.trim() }));
    const payloadSignature = JSON.stringify([workDate, version, text, deletedIds, submit]);
    if (lastRequest.current?.signature !== payloadSignature) lastRequest.current = { signature: payloadSignature, id: uuid() };
    const options = { expected_revision: version.revision, expected_report_id: version.reportId, removed_activity_ids: [...deletedIds], request_id: lastRequest.current.id };
    savingRef.current = true;
    setSaving(true);
    setSaveError(null);
    try {
      const report = await (submit ? submitDailyActivity : saveDailyActivityDraft)(workDate, text, options);
      if (report.user_id !== userId || report.work_date !== workDate || report.revision !== (version.revision ?? 0) + 1
        || JSON.stringify(report.activities.map((item) => item.content)) !== JSON.stringify(text.map((item) => item.content))) {
        throw new Error("Hasil penyimpanan belum dapat dipastikan. Draft Anda tetap dipertahankan; periksa versi terbaru sebelum mencoba lagi.");
      }
      await queryClient.cancelQueries({ queryKey, exact: true });
      queryClient.setQueryData<MyReport>(queryKey, (current) => ({ ...current, work_date: workDate, required: current?.required ?? true, report }));
      if (currentKeyRef.current === key) {
        loadReport(report);
        setRestored(false);
      }
      try { sessionStorage.removeItem(key); } catch { /* Confirmed server content remains available after a refresh. */ }
      lastRequest.current = null;
      return report;
    } catch (error) {
      setSaveError(errorText(error));
      throw error;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const discard = () => {
    if (storageKey) { try { sessionStorage.removeItem(storageKey); } catch { /* Keep the editor usable if browser storage is unavailable. */ } }
    loadReport(reportQuery.data?.report ?? null);
    setEditingActivities(false);
    setRestored(false);
    setRecoveryAvailable(false);
    setSaveError(null);
    lastRequest.current = null;
  };

  return {
    activities, setActivities, activityIds, setActivityIds, editingActivities, reportQuery, queryKey,
    openEditor, removeActivity, save, discard, finishEdit: () => setEditingActivities(false),
    dirty, saving, restored, recoveryAvailable, storageWarning, saveError,
  };
}
