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

export function UnreadCommentGate() {
  const dispatch = useDispatch();
  const commentUnreadCount = useSelector(selectCommentUnreadCount);
  const commentUnreadGroupCount = useSelector(selectCommentUnreadGroupCount);
  const commentGateEnabled = useSelector(selectCommentGateEnabled);
  const [isCountKnown, setIsCountKnown] = useState(false);
  const { clearGrace, isActive, isReady, secondsRemaining } = useCommentReviewGrace();
  const wasActive = useRef(false);

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
    if (isActive && isCountKnown && commentUnreadCount === 0) clearGrace();
  }, [clearGrace, commentUnreadCount, isActive, isCountKnown]);

  const openCommentNotifications = () => {
    dispatch(setActiveTab("comment"));
    dispatch(setOpen(true));
  };

  const awaitingExpiryRefresh = wasActive.current && !isActive;
  const shouldShow = isReady
    && isCountKnown
    && commentGateEnabled
    && commentUnreadCount > 0
    && !isActive
    && !awaitingExpiryRefresh;
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
          <div className="flex justify-end">
            <Button type="primary" onClick={openCommentNotifications}>
              Lihat Comment
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
