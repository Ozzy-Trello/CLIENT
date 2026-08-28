"use client";

import { useEffect, useState } from "react";
import { Button, Modal } from "antd";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { getUnreadCount } from "@api/notifications";
import {
  selectCommentUnreadCount,
  selectCommentGateEnabled,
  selectIsReviewingComment,
  setActiveTab,
  setOpen,
  setUnreadCounts,
} from "@store/notification_slice";
import TokenStorage from "@utils/token-storage";

export function UnreadCommentGate() {
  const dispatch = useDispatch();
  const router = useRouter();
  const commentUnreadCount = useSelector(selectCommentUnreadCount);
  const commentGateEnabled = useSelector(selectCommentGateEnabled);
  const isReviewingComment = useSelector(selectIsReviewingComment);
  const [isCountKnown, setIsCountKnown] = useState(false);

  useEffect(() => {
    let active = true;

    const refreshCounts = async () => {
      try {
        const counts = await getUnreadCount();
        if (!active) {
          return;
        }
        dispatch(setUnreadCounts(counts));
        setIsCountKnown(true);
      } catch {
        if (active) {
          setIsCountKnown(false);
        }
      }
    };

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
      active = false;
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [dispatch]);

  const openCommentNotifications = () => {
    dispatch(setActiveTab("comment"));
    dispatch(setOpen(true));
  };

  const handleLogout = () => {
    TokenStorage.clearTokens();
    router.push("/login");
  };

  const shouldShow =
    isCountKnown && commentGateEnabled && commentUnreadCount > 0 && !isReviewingComment;

  return (
    <Modal
      open={shouldShow}
      title="Baca komen task & project terlebih dahulu"
      closable={false}
      keyboard={false}
      maskClosable={false}
      footer={null}
      centered
    >
      <div className="space-y-4 text-sm text-gray-600">
        <p className="m-0">
          Ada comment mention yang belum dibaca. Buka dan baca comment tersebut satu per satu
          sampai selesai sebelum melanjutkan pekerjaan lain.
        </p>
        <p className="m-0 font-medium text-gray-800">
          {commentUnreadCount} comment belum dibaca.
        </p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button onClick={handleLogout}>Logout</Button>
          <Button type="primary" onClick={openCommentNotifications}>
            Lihat Comment
          </Button>
        </div>
      </div>
    </Modal>
  );
}
