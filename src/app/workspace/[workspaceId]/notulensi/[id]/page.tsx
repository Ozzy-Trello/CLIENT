"use client";

import NotulensiDetailView from "@components/notulensi/notulensi-detail";
import { useNotulensiDetail } from "@hooks/notulensi";
import { markNotificationRead, getUnreadCount } from "@api/notifications";
import {
  markNotificationReadLocally,
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
  const commentId = searchParams.get("commentId")?.trim() || null;
  const processedNotificationRef = useRef<string | null>(null);

  useEffect(() => {
    if (!notificationId || notificationId === processedNotificationRef.current) return;
    const detail = detailQuery.data?.data;
    if (!detail || (commentId && !detail.comments.some((comment) => comment.id === commentId))) return;
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
    };

    void markRead();
  }, [commentId, detailQuery.data?.data, notificationId, dispatch]);

  return (
    <div className="min-w-0 max-w-full overflow-x-hidden p-2 sm:p-4 md:p-6">
      <NotulensiDetailView
        workspaceId={workspaceId}
        detail={detailQuery.data?.data}
        loading={detailQuery.isLoading}
        error={detailQuery.isError}
        onRetry={() => detailQuery.refetch()}
        commentId={commentId}
        reviewNotificationId={notificationId}
      />
    </div>
  );
}
