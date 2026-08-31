"use client";

import { useEffect, useState } from "react";
import { useCurrentAccount } from "@hooks/account";

const STORAGE_PREFIX = "ozzy_comment_gate_deferral";
const SYNC_EVENT = "ozzy-comment-gate-deferral";

export const COMMENT_GATE_MAX_DEFERRALS = 2;

type CommentGateDeferralState = {
  count: number;
  expiry: number;
};

const EMPTY_STATE: CommentGateDeferralState = { count: 0, expiry: 0 };

export const getCommentGateDeferralDurationMs = () => {
  const seconds = Number(process.env.NEXT_PUBLIC_COMMENT_GATE_DEFERRAL_SECONDS);
  return (Number.isFinite(seconds) && seconds > 0 ? seconds : 180) * 1000;
};

export const getCommentGateDeferralStorageKey = (userId: string) =>
  `${STORAGE_PREFIX}:${userId}`;

export const readCommentGateDeferralState = (
  storage: Pick<Storage, "getItem" | "removeItem">,
  userId: string,
  now = Date.now(),
): CommentGateDeferralState => {
  const key = getCommentGateDeferralStorageKey(userId);
  const stored = storage.getItem(key);
  if (!stored) return EMPTY_STATE;

  try {
    const parsed = JSON.parse(stored) as Partial<CommentGateDeferralState>;
    const count = Math.min(
      COMMENT_GATE_MAX_DEFERRALS,
      Math.max(0, Math.floor(Number(parsed.count) || 0)),
    );
    const expiry = Number(parsed.expiry) || 0;
    return { count, expiry: expiry > now ? expiry : 0 };
  } catch {
    storage.removeItem(key);
    return EMPTY_STATE;
  }
};

export function useCommentGateDeferral() {
  const { data, isLoading } = useCurrentAccount();
  const userId = data?.data?.id || null;
  const [state, setState] = useState<CommentGateDeferralState>(EMPTY_STATE);
  const [stateUserId, setStateUserId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [isReady, setIsReady] = useState(false);

  const sync = (nextState: CommentGateDeferralState, nextUserId: string) => {
    setNow(Date.now());
    setState({
      count: Math.min(COMMENT_GATE_MAX_DEFERRALS, Math.max(0, nextState.count)),
      expiry: nextState.expiry > Date.now() ? nextState.expiry : 0,
    });
    setStateUserId(nextUserId);
  };

  useEffect(() => {
    if (isLoading) {
      setIsReady(false);
      return;
    }
    setNow(Date.now());
    setState(userId ? readCommentGateDeferralState(window.localStorage, userId) : EMPTY_STATE);
    setStateUserId(userId);
    setIsReady(true);
  }, [isLoading, userId]);

  useEffect(() => {
    if (!userId) return;
    const key = getCommentGateDeferralStorageKey(userId);
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== key) return;
      sync(
        event.newValue
          ? readCommentGateDeferralState(window.localStorage, userId)
          : EMPTY_STATE,
        userId,
      );
    };
    const handleLocalSync = (event: Event) => {
      sync((event as CustomEvent<CommentGateDeferralState>).detail || EMPTY_STATE, userId);
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener(SYNC_EVENT, handleLocalSync);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(SYNC_EVENT, handleLocalSync);
    };
  }, [userId]);

  useEffect(() => {
    if (!state.expiry || !userId || stateUserId !== userId) return;
    const update = () => setNow(Date.now());
    const timeout = window.setTimeout(() => {
      const nextState = { count: state.count, expiry: 0 };
      window.localStorage.setItem(
        getCommentGateDeferralStorageKey(userId),
        JSON.stringify(nextState),
      );
      sync(nextState, userId);
      window.dispatchEvent(
        new CustomEvent<CommentGateDeferralState>(SYNC_EVENT, { detail: nextState }),
      );
    }, Math.max(0, state.expiry - Date.now()));
    const interval = window.setInterval(update, 1000);
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, [state.count, state.expiry, stateUserId, userId]);

  const defer = () => {
    if (!userId || state.count >= COMMENT_GATE_MAX_DEFERRALS) return false;
    const nextState = {
      count: state.count + 1,
      expiry: Date.now() + getCommentGateDeferralDurationMs(),
    };
    window.localStorage.setItem(
      getCommentGateDeferralStorageKey(userId),
      JSON.stringify(nextState),
    );
    sync(nextState, userId);
    window.dispatchEvent(
      new CustomEvent<CommentGateDeferralState>(SYNC_EVENT, { detail: nextState }),
    );
    return true;
  };

  const clearDeferral = () => {
    if (!userId) return;
    window.localStorage.removeItem(getCommentGateDeferralStorageKey(userId));
    sync(EMPTY_STATE, userId);
    window.dispatchEvent(
      new CustomEvent<CommentGateDeferralState>(SYNC_EVENT, { detail: EMPTY_STATE }),
    );
  };

  const secondsRemaining = stateUserId === userId && state.expiry > now
    ? Math.ceil((state.expiry - now) / 1000)
    : 0;

  return {
    canDefer: Boolean(userId) && state.count < COMMENT_GATE_MAX_DEFERRALS,
    clearDeferral,
    defer,
    deferralCount: state.count,
    isDeferred: secondsRemaining > 0,
    isReady,
    secondsRemaining,
  };
}
