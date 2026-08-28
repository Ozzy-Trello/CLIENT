"use client";

import NotulensiDetailView from "@components/notulensi/notulensi-detail";
import { useNotulensiDetail } from "@hooks/notulensi";
import { markNotificationRead, getUnreadCount } from "@api/notifications";
import {
  markNotificationReadLocally,
  setIsReviewingComment,
  setUnreadCounts,
} from "@store/notification_slice";
import { useDispatch } from "react-redux";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

export default function NotulensiDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const dispatch = useDispatch();
  const workspaceId = Array.isArray(params.workspaceId)
    ? params.workspaceId[0]
    : params.workspaceId || "";
  const id = Array.isArray(params.id) ? params.id[0] : params.id || "";
  const detailQuery = useNotulensiDetail(workspaceId, id);
  const notificationId = searchParams.get("notificationId")?.trim() || null;
  const processedNotificationRef = useRef<string | null>(null);

  useEffect(() => {
    if (!notificationId || notificationId === processedNotificationRef.current) return;
    processedNotificationRef.current = notificationId;

    const markRead = async () => {
      try {
        await markNotificationRead(notificationId);
        dispatch(markNotificationReadLocally(notificationId));
      } catch {
        // ignore
      }
      try {
        const counts = await getUnreadCount();
        dispatch(setUnreadCounts(counts));
      } catch {
        // ignore
      }
      dispatch(setIsReviewingComment(false));
    };

    void markRead();
  }, [notificationId, dispatch]);

  return (
    <div className="min-w-0 p-3 sm:p-4 md:p-6">
      <NotulensiDetailView
        workspaceId={workspaceId}
        detail={detailQuery.data?.data}
        loading={detailQuery.isLoading}
        error={detailQuery.isError}
        onRetry={() => detailQuery.refetch()}
      />
    </div>
  );
}
