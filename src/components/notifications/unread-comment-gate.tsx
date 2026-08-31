"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Modal } from "antd";
import { WarningOutlined } from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import { getUnreadCount } from "@api/notifications";
import {
  selectCommentUnreadCount,
  selectCommentUnreadGroupCount,
  selectCommentGateEnabled,
  setActiveTab,
  setOpen,
  setUnreadCounts,
} from "@store/notification_slice";
import { useCommentReviewGrace } from "@hooks/use-comment-review-grace";
import {
  COMMENT_GATE_MAX_DEFERRALS,
  useCommentGateDeferral,
} from "@hooks/use-comment-gate-deferral";

export function UnreadCommentGate() {
  const dispatch = useDispatch();
  const commentUnreadCount = useSelector(selectCommentUnreadCount);
  const commentUnreadGroupCount = useSelector(selectCommentUnreadGroupCount);
  const commentGateEnabled = useSelector(selectCommentGateEnabled);
  const [isCountKnown, setIsCountKnown] = useState(false);
  const { clearGrace, isActive, isReady, secondsRemaining } = useCommentReviewGrace();
  const {
    canDefer,
    clearDeferral,
    defer,
    deferralCount,
    isDeferred,
    isReady: isDeferralReady,
  } = useCommentGateDeferral();
  const wasActive = useRef(false);
  const wasDeferred = useRef(false);

  const refreshCounts = async () => {
    try {
      const counts = await getUnreadCount();
      dispatch(setUnreadCounts(counts));
      setIsCountKnown(true);
    } catch {
      setIsCountKnown(false);
    }
  };

  useEffect(() => {
    void refreshCounts();

    const handleFocus = () => {
      void refreshCounts();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshCounts();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [dispatch]);

  useEffect(() => {
    if (!isReady) return;
    if (wasActive.current && !isActive) {
      setIsCountKnown(false);
      void refreshCounts();
    }
    wasActive.current = isActive;
  }, [isActive, isReady]);

  useEffect(() => {
    if (!isDeferralReady) return;
    if (wasDeferred.current && !isDeferred) {
      setIsCountKnown(false);
      void refreshCounts();
    }
    wasDeferred.current = isDeferred;
  }, [isDeferred, isDeferralReady]);

  useEffect(() => {
    if (!isCountKnown || (commentGateEnabled && commentUnreadCount > 0)) return;
    if (isActive) clearGrace();
    if (deferralCount > 0 || isDeferred) clearDeferral();
  }, [clearDeferral, clearGrace, commentGateEnabled, commentUnreadCount, deferralCount, isActive, isCountKnown, isDeferred]);

  const openCommentNotifications = () => {
    dispatch(setActiveTab("comment"));
    dispatch(setOpen(true));
  };

  const awaitingExpiryRefresh = wasActive.current && !isActive;
  const awaitingDeferralRefresh = wasDeferred.current && !isDeferred;
  const shouldShow = isReady
    && isDeferralReady
    && isCountKnown
    && commentGateEnabled
    && commentUnreadCount > 0
    && !isActive
    && !isDeferred
    && !awaitingExpiryRefresh
    && !awaitingDeferralRefresh;
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = String(secondsRemaining % 60).padStart(2, "0");
  const warningLevel = secondsRemaining <= 15 ? "critical" : secondsRemaining <= 60 ? "warning" : "normal";
  const countdownCopy = warningLevel === "critical"
    ? "Review window segera berakhir"
    : warningLevel === "warning"
      ? "Review window hampir berakhir"
      : "Review window";

  return (
    <>
      {isActive && (
        <div
          className={`fixed bottom-16 left-1/2 z-[1000] flex w-[calc(100%_-_1rem)] max-w-xl -translate-x-1/2 items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm shadow-md sm:bottom-4 ${
            warningLevel === "critical"
              ? "border-red-300 bg-red-50 text-red-800"
              : warningLevel === "warning"
                ? "border-amber-300 bg-amber-50 text-amber-900"
                : "border-gray-200 bg-white text-gray-700"
          }`}
        >
          <span className="min-w-0 font-medium">
            {countdownCopy} · {minutes}:{seconds} · {commentUnreadCount} belum dibaca
          </span>
          <span className="sr-only" aria-live="polite">
            {warningLevel === "normal" ? "" : countdownCopy}
          </span>
          <Button size="small" onClick={openCommentNotifications}>Lihat Comment</Button>
        </div>
      )}
      <Modal
        open={shouldShow}
        title={
          <span className="flex items-center gap-2">
            <WarningOutlined className="text-amber-500" />
            Baca komen task & project terlebih dahulu
          </span>
        }
        closable={false}
        keyboard={false}
        maskClosable={false}
        footer={null}
        centered
      >
        <div className="space-y-4 p-1 text-sm text-gray-600">
          <p className="m-0">
            Ada kelompok comment yang belum dibaca. Buka task atau notulensi terkait sebelum
            melanjutkan pekerjaan lain.
          </p>
          <p className="m-0 font-medium text-gray-800">
            {commentUnreadGroupCount} task memiliki {commentUnreadCount} notifikasi belum dibaca.
          </p>
          {canDefer ? (
            <p className="m-0 text-gray-500">
              Bisa ditunda selama 3 menit. Sisa tunda: {COMMENT_GATE_MAX_DEFERRALS - deferralCount} kali.
            </p>
          ) : (
            <p className="m-0 font-medium text-red-700">
              Batas tunda habis. Buka Comment untuk melanjutkan.
            </p>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {canDefer ? (
              <Button className="min-h-11 sm:min-h-0" onClick={defer}>
                Tunda 3 menit
              </Button>
            ) : null}
            <Button className="min-h-11 sm:min-h-0" type="primary" onClick={openCommentNotifications}>
              Lihat Comment
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
