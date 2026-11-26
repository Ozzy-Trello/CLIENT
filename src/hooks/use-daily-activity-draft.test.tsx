import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getMyDailyActivity, saveDailyActivityDraft, submitDailyActivity } from "@api/daily-activity";
import { DailyActivityReport } from "@myTypes/daily-activity";
import { useDailyActivityDraft } from "./use-daily-activity-draft";

jest.mock("@api/daily-activity", () => ({ getMyDailyActivity: jest.fn(), saveDailyActivityDraft: jest.fn(), submitDailyActivity: jest.fn() }));
const getReport = jest.mocked(getMyDailyActivity);
const saveReport = jest.mocked(saveDailyActivityDraft);
const submitReport = jest.mocked(submitDailyActivity);
const date = "2026-11-25";
const key = `ozzy_daily_activity_draft_v1:user-1:${date}`;
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const deferred = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>((r) => { resolve = r; }); return { promise, resolve }; };

describe("Daily Activity draft safety", () => {
  let client: QueryClient;
  let server: DailyActivityReport | null;
  const response = () => ({ work_date: date, required: true, report: clone(server) });
  const setup = (userId = "user-1", pending = false) => renderHook(
    ({ user, workDate }) => useDailyActivityDraft(user, workDate, true, pending),
    { initialProps: { user: userId, workDate: date }, wrapper: ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> },
  );
  const open = async (hook: ReturnType<typeof setup>) => {
    await waitFor(() => expect(hook.result.current.reportQuery.isSuccess).toBe(true));
    await act(async () => { expect(await hook.result.current.openEditor()).toBe(true); });
  };
  const append = (hook: ReturnType<typeof setup>, text = "Third activity") => act(() => {
    hook.result.current.setActivities((items) => [...items, text]);
    hook.result.current.setActivityIds((items) => [...items, ""]);
  });

  beforeEach(() => {
    sessionStorage.clear();
    client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity, gcTime: 0 }, mutations: { retry: false, gcTime: 0 } } });
    server = {
      id: "report-1", user_id: "user-1", work_date: date, revision: 1, status: "draft", first_submitted_at: null,
      activities: [{ id: "item-1", content: "First activity", order: 0 }, { id: "item-2", content: "Second activity", order: 1 }],
    };
    getReport.mockImplementation(async () => response());
    saveReport.mockImplementation(async (_date, activities, options) => {
      server = { ...server!, revision: (options.expected_revision ?? 0) + 1,
        activities: activities.map((item, index) => ({ id: item.id || `new-${index}`, content: item.content, order: index })) };
      return clone(server);
    });
    submitReport.mockImplementation(saveReport);
  });

  afterEach(() => { client.clear(); jest.restoreAllMocks(); jest.clearAllMocks(); });

  it("publishes the successful save before closing and reopening the editor", async () => {
    const hook = setup();
    await open(hook);
    append(hook);
    await act(async () => { await hook.result.current.save(false); hook.result.current.finishEdit(); });
    expect(hook.result.current.reportQuery.data?.report?.activities).toHaveLength(3);
    expect(hook.result.current.dirty).toBe(false);
    await act(async () => { await hook.result.current.openEditor(); });
    expect(hook.result.current.activities).toHaveLength(3);
    expect(hook.result.current.activities[2]).toBe("Third activity");
  });

  it("ignores an older GET response that finishes after a successful save", async () => {
    const hook = setup();
    await open(hook);
    const old = response();
    const read = deferred<ReturnType<typeof response>>();
    getReport.mockImplementationOnce(() => read.promise);
    act(() => { void client.invalidateQueries({ queryKey: hook.result.current.queryKey }); });
    await waitFor(() => expect(getReport).toHaveBeenCalledTimes(3));
    append(hook);
    await act(async () => { await hook.result.current.save(false); });
    await act(async () => { read.resolve(old); });
    expect(hook.result.current.reportQuery.data?.report?.revision).toBe(2);
    expect(hook.result.current.reportQuery.data?.report?.activities).toHaveLength(3);
  });

  it("waits for a fresh read before opening the editor", async () => {
    const hook = setup();
    await waitFor(() => expect(hook.result.current.reportQuery.isSuccess).toBe(true));
    const read = deferred<ReturnType<typeof response>>();
    getReport.mockImplementationOnce(() => read.promise);
    let opening!: Promise<boolean>;
    act(() => { opening = hook.result.current.openEditor(); });
    expect(hook.result.current.editingActivities).toBe(false);
    server!.activities.push({ id: "item-3", content: "From another tab", order: 2 });
    server!.revision = 2;
    await act(async () => { read.resolve(response()); await opening; });
    expect(hook.result.current.activities).toHaveLength(3);
  });

  it("keeps the edit's original version when the query cache advances", async () => {
    const hook = setup();
    await open(hook);
    append(hook, "Local change");
    server!.revision = 2;
    act(() => { client.setQueryData(hook.result.current.queryKey, response()); });
    saveReport.mockRejectedValueOnce({ response: { status: 409, data: { message: "Ada perubahan di tab lain" } } });
    await act(async () => { await expect(hook.result.current.save(false)).rejects.toBeDefined(); });
    expect(saveReport.mock.calls[0][2].expected_revision).toBe(1);
    expect(hook.result.current.activities).toContain("Local change");
    expect(hook.result.current.editingActivities).toBe(true);
    expect(hook.result.current.saveError).toBe("Ada perubahan di tab lain");
    expect(sessionStorage.getItem(key)).toContain("Local change");
  });

  it("restores unsent text with its original version after unmounting", async () => {
    const hook = setup();
    await open(hook);
    append(hook, "Do not lose this");
    hook.unmount();
    const reopened = setup();
    await waitFor(() => expect(reopened.result.current.recoveryAvailable).toBe(true));
    await open(reopened);
    expect(reopened.result.current.restored).toBe(true);
    expect(reopened.result.current.activities).toContain("Do not lose this");
    expect(reopened.result.current.dirty).toBe(true);
  });

  it("keeps a failed save recoverable and reuses its request ID on an unchanged retry", async () => {
    const hook = setup();
    await open(hook);
    append(hook);
    saveReport.mockRejectedValueOnce(new Error("Network failure"));
    await act(async () => { await expect(hook.result.current.save(false)).rejects.toThrow("Network failure"); });
    expect(sessionStorage.getItem(key)).toContain("Third activity");
    const firstId = saveReport.mock.calls[0][2].request_id;
    await act(async () => { await hook.result.current.save(false); });
    expect(saveReport.mock.calls[1][2].request_id).toBe(firstId);
    expect(sessionStorage.getItem(key)).toBeNull();
  });

  it("uses a new request ID when the user changes a failed draft", async () => {
    const hook = setup();
    await open(hook);
    append(hook);
    saveReport.mockRejectedValueOnce(new Error("Network failure"));
    await act(async () => { await expect(hook.result.current.save(false)).rejects.toThrow(); });
    const firstId = saveReport.mock.calls[0][2].request_id;
    act(() => hook.result.current.setActivities((items) => items.map((text, index) => index === 2 ? "Updated third" : text)));
    await act(async () => { await hook.result.current.save(false); });
    expect(saveReport.mock.calls[1][2].request_id).not.toBe(firstId);
  });

  it("sends an explicit deletion list and never infers it from a missing row", async () => {
    const hook = setup();
    await open(hook);
    act(() => hook.result.current.removeActivity(1));
    await act(async () => { await hook.result.current.save(false); });
    expect(saveReport.mock.calls[0][2].removed_activity_ids).toEqual(["item-2"]);
    expect(saveReport.mock.calls[0][1]).toEqual([{ id: "item-1", content: "First activity" }]);
  });

  it("blocks duplicate saves while one request is pending", async () => {
    const hook = setup();
    await open(hook);
    append(hook);
    const write = deferred<DailyActivityReport>();
    saveReport.mockImplementationOnce(() => write.promise);
    let saving!: Promise<DailyActivityReport>;
    act(() => { saving = hook.result.current.save(false); });
    await expect(hook.result.current.save(false)).rejects.toThrow("Penyimpanan belum siap");
    expect(saveReport).toHaveBeenCalledTimes(1);
    const saved = { ...server!, revision: 2, activities: [...server!.activities, { id: "item-3", content: "Third activity", order: 2 }] };
    await act(async () => { write.resolve(saved); await saving; });
  });

  it("warns before closing an unsaved draft and stops warning after a confirmed save", async () => {
    const hook = setup();
    await open(hook);
    append(hook);
    const leaving = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(leaving);
    expect(leaving.defaultPrevented).toBe(true);
    await act(async () => { await hook.result.current.save(false); });
    const saved = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(saved);
    expect(saved.defaultPrevented).toBe(false);
  });

  it("does not send or clear a draft containing an empty activity", async () => {
    const hook = setup();
    await open(hook);
    append(hook, " ");
    await expect(hook.result.current.save(false)).rejects.toThrow("Isi atau hapus");
    expect(saveReport).not.toHaveBeenCalled();
    expect(hook.result.current.dirty).toBe(true);
  });

  it("isolates caches and recovery between user accounts", async () => {
    const hook = setup();
    await open(hook);
    append(hook, "Private user one draft");
    server = { ...server!, id: "report-2", user_id: "user-2", activities: [{ id: "other-1", content: "User two", order: 0 }] };
    hook.rerender({ user: "user-2", workDate: date });
    await waitFor(() => expect(hook.result.current.reportQuery.data?.report?.user_id).toBe("user-2"));
    expect(hook.result.current.editingActivities).toBe(false);
    expect(hook.result.current.activities).not.toContain("Private user one draft");
    expect(sessionStorage.getItem(key)).toContain("Private user one draft");
    expect(sessionStorage.getItem(`ozzy_daily_activity_draft_v1:user-2:${date}`)).toBeNull();
  });

  it("shows a warning instead of claiming browser recovery when storage is unavailable", async () => {
    const hook = setup();
    await open(hook);
    jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Storage full"); });
    append(hook);
    expect(hook.result.current.storageWarning).toContain("Jangan tutup halaman");
    expect(hook.result.current.activities).toContain("Third activity");
  });

  it("creates a new report using an explicit absent version", async () => {
    server = null;
    const hook = setup();
    await open(hook);
    act(() => hook.result.current.setActivities(["New report"]));
    saveReport.mockResolvedValueOnce({ id: "new-report", user_id: "user-1", work_date: date, revision: 1, status: "draft", first_submitted_at: null, activities: [{ id: "new-1", content: "New report", order: 0 }] });
    await act(async () => { await hook.result.current.save(false); });
    expect(saveReport.mock.calls[0][2]).toMatchObject({ expected_revision: null, expected_report_id: null, removed_activity_ids: [] });
  });

  it("does not open cached content if the fresh read fails", async () => {
    const hook = setup();
    await waitFor(() => expect(hook.result.current.reportQuery.isSuccess).toBe(true));
    getReport.mockRejectedValueOnce(new Error("Offline"));
    await act(async () => { expect(await hook.result.current.openEditor()).toBe(false); });
    expect(hook.result.current.editingActivities).toBe(false);
    expect(hook.result.current.saveError).toBe("Offline");
  });

  it("preserves a recovered draft's version when the server has advanced", async () => {
    const hook = setup();
    await open(hook);
    append(hook, "Local third");
    hook.unmount();
    server!.revision = 2;
    server!.activities.push({ id: "item-3", content: "Other tab third", order: 2 });
    const reopened = setup();
    await open(reopened);
    saveReport.mockRejectedValueOnce({ response: { status: 409, data: { message: "Konflik" } } });
    await act(async () => { await expect(reopened.result.current.save(false)).rejects.toBeDefined(); });
    expect(saveReport.mock.calls[0][2].expected_revision).toBe(1);
    expect(reopened.result.current.activities).toContain("Local third");
  });

  it("keeps recovery and editor contents if a save response cannot be verified", async () => {
    const hook = setup();
    await open(hook);
    append(hook);
    saveReport.mockResolvedValueOnce({ ...server!, revision: 42 });
    await act(async () => { await expect(hook.result.current.save(false)).rejects.toThrow("belum dapat dipastikan"); });
    expect(hook.result.current.activities).toContain("Third activity");
    expect(sessionStorage.getItem(key)).toContain("Third activity");
    expect(hook.result.current.reportQuery.data?.report?.revision).toBe(1);
  });

  it("handles a damaged browser backup without deleting it or crashing", async () => {
    sessionStorage.setItem(key, "not-json");
    const hook = setup();
    await open(hook);
    expect(hook.result.current.storageWarning).toContain("Salinan draft");
    expect(hook.result.current.activities).toEqual(["First activity", "Second activity"]);
    expect(sessionStorage.getItem(key)).toBe("not-json");
  });
});
