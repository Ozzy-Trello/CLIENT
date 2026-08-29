"use client";

import Link from "next/link";
import { MouseEvent, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { RootState } from "@store/index";
import {
  appendNotifications,
  markNotificationReadLocally,
  selectNotificationsByCategory,
  selectNotificationTotalByCategory,
  setIsReviewingComment,
  setNotifications,
  setNotificationTotal,
  setOpen,
  setUnreadCounts,
} from "@store/notification_slice";
import { NotificationCategory, NotificationItem } from "@myTypes/notification";
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
} from "@api/notifications";

dayjs.extend(relativeTime);

function isValidId(id: string | null | undefined): id is string {
  const value = id?.trim();
  return !!value && value !== "null" && value !== "undefined";
}

export function getNotificationTarget(
  n: NotificationItem,
  category: Exclude<NotificationCategory, "all"> = "general",
): string | null {
  if (n.entityType === "notulensi") {
    if (!isValidId(n.workspaceId) || !isValidId(n.entityId)) {
      return null;
    }

    const params = new URLSearchParams();
    if (category === "comment") {
      params.set("notificationId", n.id);
    }
    const qs = params.toString();
    return `/workspace/${encodeURIComponent(n.workspaceId)}/notulensi/${encodeURIComponent(n.entityId)}${qs ? `?${qs}` : ""}`;
  }

  if (n.entityType !== "card") {
    return null;
  }

  const cardId = isValidId(n.entityId) ? n.entityId : n.cardId;
  if (!isValidId(n.workspaceId) || !isValidId(n.boardId) || !isValidId(cardId)) {
    return null;
  }

  const params = new URLSearchParams({ cardId });
  if (isValidId(n.listId)) {
    params.set("listId", n.listId);
  }

  if (category === "comment" && isValidId(n.activityId)) {
    params.set("commentId", n.activityId);
    params.set("notificationId", n.id);
  }

  return `/workspace/${encodeURIComponent(n.workspaceId)}/board/${encodeURIComponent(n.boardId)}?${params}`;
}

interface NotificationListProps {
  category: Exclude<NotificationCategory, "all">;
}

function normalizeCategoryResult(
  result: { data: NotificationItem[]; total: number },
  category: Exclude<NotificationCategory, "all">,
) {
  const matchesCategory = (notification: NotificationItem) =>
    category === "comment"
      ? ["comment_mention", "notulensi_mention", "notulensi_comment"].includes(notification.type)
      : !["comment_mention", "notulensi_mention", "notulensi_comment"].includes(notification.type);
  const data = result.data.filter(matchesCategory);
  const backendIgnoredCategory = data.length !== result.data.length;

  return {
    data,
    total: backendIgnoredCategory ? data.length : result.total,
  };
}

export function NotificationList({ category }: NotificationListProps) {
  const dispatch = useDispatch();
  const notifications = useSelector((state: RootState) =>
    selectNotificationsByCategory(state, category)
  );
  const total = useSelector((state: RootState) =>
    selectNotificationTotalByCategory(state, category)
  );
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const refreshNotifications = async () => {
    const [notificationsResult, countResult] = await Promise.allSettled([
      getNotifications(1, 20, category),
      getUnreadCount(),
    ]);
    if (notificationsResult.status === "fulfilled") {
      const normalized = normalizeCategoryResult(notificationsResult.value, category);
      dispatch(setNotifications({ category, value: normalized.data }));
      dispatch(setNotificationTotal({ category, value: normalized.total }));
    }
    if (countResult.status === "fulfilled") {
      dispatch(setUnreadCounts(countResult.value));
    }
  };

  useEffect(() => {
    setPage(1);
    void refreshNotifications();
  }, [category]);

  const markRead = (notification: NotificationItem) => {
    if (notification.isRead) return;

    dispatch(markNotificationReadLocally(notification.id));
    markNotificationRead(notification.id).catch(refreshNotifications);
  };

  const handleClick = (event: MouseEvent<HTMLAnchorElement>, notification: NotificationItem) => {
    if (
      category === "comment" &&
      (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
    ) {
      event.preventDefault();
      return;
    }

    if (category === "general") {
      markRead(notification);
    } else if (
      event.button === 0 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.shiftKey &&
      !event.altKey
    ) {
      dispatch(setIsReviewingComment(true));
    }

    if (
      event.button === 0 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.shiftKey &&
      !event.altKey
    ) {
      dispatch(setOpen(false));
    }
  };

  const loadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const next = await getNotifications(page + 1, 20, category);
      const normalized = normalizeCategoryResult(next, category);
      dispatch(appendNotifications({ category, value: normalized.data }));
      dispatch(setNotificationTotal({ category, value: normalized.total }));
      setPage((current) => current + 1);
    } finally {
      setLoadingMore(false);
    }
  };

  if (notifications.length === 0) {
    return (
      <div className="w-full p-4 text-center text-sm text-gray-400">No notifications</div>
    );
  }

  const hasMore = notifications.length < total;

  return (
    <div className="max-h-[min(24rem,calc(100dvh-5rem))] w-full overflow-y-auto overflow-x-hidden">
      {notifications.map((n) => {
        const target = getNotificationTarget(n, category);
        const content = (
          <>
            <div className="min-w-0">
              <span className={`block truncate text-sm ${!n.isRead ? "font-semibold" : "font-normal"}`}>
                {n.title}
              </span>
            </div>
            {n.message && (
              <p className="m-0 truncate text-xs text-gray-500">{n.message}</p>
            )}
            <span className="text-xs text-gray-400">
              {dayjs(n.createdAt).fromNow()}
            </span>
          </>
        );

        const className = `flex min-w-0 w-full flex-col gap-1 overflow-hidden border-0 border-b border-gray-100 px-4 py-3 text-left ${
          target ? "cursor-pointer hover:bg-gray-50" : "cursor-default"
        }`;
        const style = !n.isRead
          ? { backgroundColor: "rgba(59, 130, 246, 0.1)" }
          : undefined;

        return target ? (
          <Link
            key={n.id}
            href={target}
            onClick={(event) => handleClick(event, n)}
            onAuxClick={(event) => {
              if (category === "comment") {
                event.preventDefault();
                return;
              }
              if (event.button === 1) markRead(n);
            }}
            className={className}
            style={style}
          >
            {content}
          </Link>
        ) : (
          <div key={n.id} className={className} style={style}>
            {content}
          </div>
        );
      })}
      {hasMore && (
        <button
          type="button"
          onClick={() => void loadMore()}
          disabled={loadingMore}
          className="w-full border-0 bg-transparent px-4 py-2 text-center text-sm font-medium text-blue-600 hover:bg-gray-50 disabled:text-gray-400"
        >
          {loadingMore ? "Loading..." : "Show more"}
        </button>
      )}
    </div>
  );
}
