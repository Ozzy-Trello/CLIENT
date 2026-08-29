import { act, renderHook } from "@testing-library/react";
import {
  getCommentReviewGraceStorageKey,
  readCommentReviewGraceExpiry,
  useCommentReviewGrace,
} from "./use-comment-review-grace";
import TokenStorage from "@utils/token-storage";

let mockCurrentAccountResult: any;
jest.mock("@hooks/account", () => ({
  useCurrentAccount: () => mockCurrentAccountResult,
}));

describe("useCommentReviewGrace", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(Date.parse("2026-08-30T10:00:00.000Z"));
    window.localStorage.clear();
    window.sessionStorage.clear();
    mockCurrentAccountResult = { data: { data: { id: "user-1" } }, isLoading: false };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("starts, resets, survives remount, syncs storage, and expires", () => {
    const key = getCommentReviewGraceStorageKey("user-1");
    const first = renderHook(() => useCommentReviewGrace());

    act(() => first.result.current.startGrace());
    expect(Number(window.localStorage.getItem(key))).toBe(Date.now() + 300_000);

    act(() => {
      jest.advanceTimersByTime(10_000);
      first.result.current.startGrace();
    });
    const resetExpiry = Date.now() + 300_000;
    expect(Number(window.localStorage.getItem(key))).toBe(resetExpiry);
    first.unmount();

    const second = renderHook(() => useCommentReviewGrace());
    expect(second.result.current.isActive).toBe(true);
    expect(second.result.current.expiry).toBe(resetExpiry);

    const syncedExpiry = Date.now() + 120_000;
    act(() => window.dispatchEvent(new StorageEvent("storage", {
      key,
      newValue: String(syncedExpiry),
    })));
    expect(second.result.current.expiry).toBe(syncedExpiry);

    act(() => jest.advanceTimersByTime(120_001));
    expect(second.result.current.isActive).toBe(false);
    expect(window.localStorage.getItem(key)).toBeNull();
  });

  it("clears an expired persisted value", () => {
    const key = getCommentReviewGraceStorageKey("user-1");
    window.localStorage.setItem(key, String(Date.now() - 1));

    expect(readCommentReviewGraceExpiry(window.localStorage, "user-1")).toBe(0);
    expect(window.localStorage.getItem(key)).toBeNull();
  });

  it("clears an active grace window explicitly", () => {
    const key = getCommentReviewGraceStorageKey("user-1");
    const { result } = renderHook(() => useCommentReviewGrace());
    act(() => result.current.startGrace());

    act(() => result.current.clearGrace());

    expect(result.current.isActive).toBe(false);
    expect(window.localStorage.getItem(key)).toBeNull();
  });

  it("stays unready while the current account is loading", () => {
    mockCurrentAccountResult = { data: undefined, isLoading: true };

    const { result } = renderHook(() => useCommentReviewGrace());

    expect(result.current.isReady).toBe(false);
    expect(result.current.isActive).toBe(false);
  });

  it("clears persisted grace windows on logout", () => {
    const key = getCommentReviewGraceStorageKey("user-1");
    window.localStorage.setItem(key, String(Date.now() + 300_000));

    TokenStorage.clearTokens();

    expect(window.localStorage.getItem(key)).toBeNull();
  });
});
