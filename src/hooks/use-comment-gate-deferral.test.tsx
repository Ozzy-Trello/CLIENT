import { act, renderHook } from "@testing-library/react";
import {
  COMMENT_GATE_MAX_DEFERRALS,
  getCommentGateDeferralStorageKey,
  readCommentGateDeferralState,
  useCommentGateDeferral,
} from "./use-comment-gate-deferral";
import TokenStorage from "@utils/token-storage";

let mockCurrentAccountResult: any;
jest.mock("@hooks/account", () => ({
  useCurrentAccount: () => mockCurrentAccountResult,
}));

describe("useCommentGateDeferral", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(Date.parse("2026-08-31T10:00:00.000Z"));
    window.localStorage.clear();
    window.sessionStorage.clear();
    mockCurrentAccountResult = { data: { data: { id: "user-1" } }, isLoading: false };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("allows two three-minute deferrals and blocks a third", () => {
    const { result } = renderHook(() => useCommentGateDeferral());

    act(() => expect(result.current.defer()).toBe(true));
    expect(result.current.deferralCount).toBe(1);
    expect(result.current.isDeferred).toBe(true);

    act(() => jest.advanceTimersByTime(180_001));
    expect(result.current.isDeferred).toBe(false);
    expect(result.current.canDefer).toBe(true);

    act(() => expect(result.current.defer()).toBe(true));
    act(() => jest.advanceTimersByTime(180_001));

    expect(result.current.deferralCount).toBe(COMMENT_GATE_MAX_DEFERRALS);
    expect(result.current.canDefer).toBe(false);
    act(() => expect(result.current.defer()).toBe(false));
  });

  it("persists the used quota across remounts", () => {
    const key = getCommentGateDeferralStorageKey("user-1");
    const first = renderHook(() => useCommentGateDeferral());
    act(() => first.result.current.defer());
    first.unmount();

    const second = renderHook(() => useCommentGateDeferral());

    expect(second.result.current.deferralCount).toBe(1);
    expect(second.result.current.isDeferred).toBe(true);
    expect(JSON.parse(window.localStorage.getItem(key) || "{}").count).toBe(1);
  });

  it("syncs a deferral started in another tab", () => {
    const key = getCommentGateDeferralStorageKey("user-1");
    const nextState = { count: 1, expiry: Date.now() + 180_000 };
    const { result } = renderHook(() => useCommentGateDeferral());
    window.localStorage.setItem(key, JSON.stringify(nextState));

    act(() => window.dispatchEvent(new StorageEvent("storage", {
      key,
      newValue: JSON.stringify(nextState),
    })));

    expect(result.current.deferralCount).toBe(1);
    expect(result.current.isDeferred).toBe(true);
  });

  it("keeps the quota after an expired deferral", () => {
    const key = getCommentGateDeferralStorageKey("user-1");
    window.localStorage.setItem(key, JSON.stringify({ count: 2, expiry: Date.now() - 1 }));

    expect(readCommentGateDeferralState(window.localStorage, "user-1")).toEqual({
      count: 2,
      expiry: 0,
    });
  });

  it("clears deferrals explicitly and on logout", () => {
    const key = getCommentGateDeferralStorageKey("user-1");
    const { result } = renderHook(() => useCommentGateDeferral());
    act(() => result.current.defer());
    act(() => result.current.clearDeferral());
    expect(window.localStorage.getItem(key)).toBeNull();

    act(() => result.current.defer());
    TokenStorage.clearTokens();
    expect(window.localStorage.getItem(key)).toBeNull();
  });

  it("stays unready while the current account is loading", () => {
    mockCurrentAccountResult = { data: undefined, isLoading: true };

    const { result } = renderHook(() => useCommentGateDeferral());

    expect(result.current.isReady).toBe(false);
    expect(result.current.isDeferred).toBe(false);
  });
});
