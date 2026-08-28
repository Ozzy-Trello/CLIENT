"use client";

import { useEffect, useState } from "react";
import { Button, Modal } from "antd";
import { WarningOutlined } from "@ant-design/icons";
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

export function UnreadCommentGate() {
  const dispatch = useDispatch();
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

  const shouldShow =
    isCountKnown && commentGateEnabled && commentUnreadCount > 0 && !isReviewingComment;

  return (
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
          Ada comment mention yang belum dibaca. Buka dan baca comment tersebut satu per satu
          sampai selesai sebelum melanjutkan pekerjaan lain.
        </p>
        <p className="m-0 font-medium text-gray-800">
          {commentUnreadCount} comment belum dibaca.
        </p>
        <div className="flex justify-end">
          <Button type="primary" onClick={openCommentNotifications}>
            Lihat Comment
          </Button>
        </div>
      </div>
    </Modal>
  );
}
