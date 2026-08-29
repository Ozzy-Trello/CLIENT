"use client";

import { useEffect, useState } from "react";
import { useCurrentAccount } from "@hooks/account";

const STORAGE_PREFIX = "ozzy_comment_review_grace";
const SYNC_EVENT = "ozzy-comment-review-grace";

export const getCommentReviewGraceDurationMs = () => {
  const seconds = Number(process.env.NEXT_PUBLIC_COMMENT_REVIEW_GRACE_SECONDS);
  return (Number.isFinite(seconds) && seconds > 0 ? seconds : 300) * 1000;
};

export const getCommentReviewGraceStorageKey = (userId: string) =>
  `${STORAGE_PREFIX}:${userId}`;

export const readCommentReviewGraceExpiry = (
  storage: Pick<Storage, "getItem" | "removeItem">,
  userId: string,
  now = Date.now(),
) => {
  const key = getCommentReviewGraceStorageKey(userId);
  const expiry = Number(storage.getItem(key)) || 0;
  if (expiry <= now) {
    if (expiry) storage.removeItem(key);
    return 0;
  }
  return expiry;
};

export function useCommentReviewGrace() {
  const { data, isLoading } = useCurrentAccount();
  const userId = data?.data?.id || null;
  const [expiry, setExpiry] = useState(0);
  const [expiryUserId, setExpiryUserId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (isLoading) {
      setIsReady(false);
      return;
    }
    setNow(Date.now());
    setExpiry(userId ? readCommentReviewGraceExpiry(window.localStorage, userId) : 0);
    setExpiryUserId(userId);
    setIsReady(true);
  }, [isLoading, userId]);

  useEffect(() => {
    if (!userId) return;
    const key = getCommentReviewGraceStorageKey(userId);
    const sync = (nextExpiry: number) => {
      setNow(Date.now());
      setExpiry(nextExpiry > Date.now() ? nextExpiry : 0);
      setExpiryUserId(userId);
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === key) sync(Number(event.newValue) || 0);
    };
    const handleLocalSync = (event: Event) => {
      sync((event as CustomEvent<number>).detail || 0);
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener(SYNC_EVENT, handleLocalSync);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(SYNC_EVENT, handleLocalSync);
    };
  }, [userId]);

  useEffect(() => {
    if (!expiry || !userId || expiryUserId !== userId) return;
    const update = () => setNow(Date.now());
    const interval = window.setInterval(update, 1000);
    const timeout = window.setTimeout(() => {
      window.localStorage.removeItem(getCommentReviewGraceStorageKey(userId));
      setExpiry(0);
      update();
      window.dispatchEvent(new CustomEvent<number>(SYNC_EVENT, { detail: 0 }));
    }, Math.max(0, expiry - Date.now()));
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [expiry, expiryUserId, userId]);

  const startGrace = () => {
    if (!userId) return 0;
    const nextExpiry = Date.now() + getCommentReviewGraceDurationMs();
    window.localStorage.setItem(getCommentReviewGraceStorageKey(userId), String(nextExpiry));
    setNow(Date.now());
    setExpiry(nextExpiry);
    setExpiryUserId(userId);
    window.dispatchEvent(new CustomEvent<number>(SYNC_EVENT, { detail: nextExpiry }));
    return nextExpiry;
  };

  const clearGrace = () => {
    if (!userId) return;
    window.localStorage.removeItem(getCommentReviewGraceStorageKey(userId));
    setNow(Date.now());
    setExpiry(0);
    setExpiryUserId(userId);
    window.dispatchEvent(new CustomEvent<number>(SYNC_EVENT, { detail: 0 }));
  };

  const secondsRemaining = expiryUserId === userId && expiry > now
    ? Math.ceil((expiry - now) / 1000)
    : 0;
  return {
    expiry,
    isActive: secondsRemaining > 0,
    isReady,
    secondsRemaining,
    startGrace,
    clearGrace,
  };
}
