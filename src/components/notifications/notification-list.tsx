"use client";

import Link from "next/link";
import { MouseEvent, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  appendNotifications,
  markNotificationReadLocally,
  selectNotifications,
  selectNotificationTotal,
  setNotifications,
  setNotificationTotal,
  setOpen,
  setUnreadCount,
} from "@store/notification_slice";
import { NotificationItem } from "@myTypes/notification";
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

export function getNotificationTarget(n: NotificationItem): string | null {
  if (n.entityType === "notulensi") {
    if (!isValidId(n.workspaceId) || !isValidId(n.entityId)) {
      return null;
    }

    return `/workspace/${encodeURIComponent(n.workspaceId)}/notulensi/${encodeURIComponent(n.entityId)}`;
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

  return `/workspace/${encodeURIComponent(n.workspaceId)}/board/${encodeURIComponent(n.boardId)}?${params}`;
}

export function NotificationList() {
  const dispatch = useDispatch();
  const notifications = useSelector(selectNotifications);
  const total = useSelector(selectNotificationTotal);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const refreshNotifications = async () => {
    const [notificationsResult, countResult] = await Promise.allSettled([
      getNotifications(1, 20),
      getUnreadCount(),
    ]);
    if (notificationsResult.status === "fulfilled") {
      dispatch(setNotifications(notificationsResult.value.data));
      dispatch(setNotificationTotal(notificationsResult.value.total));
    }
    if (countResult.status === "fulfilled") {
      dispatch(setUnreadCount(countResult.value.unreadCount));
    }
  };

  const markRead = (notification: NotificationItem) => {
    if (notification.isRead) return;

    dispatch(markNotificationReadLocally(notification.id));
    markNotificationRead(notification.id).catch(refreshNotifications);
  };

  const handleClick = (event: MouseEvent<HTMLAnchorElement>, notification: NotificationItem) => {
    markRead(notification);
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
      const next = await getNotifications(page + 1, 20);
      dispatch(appendNotifications(next.data));
      dispatch(setNotificationTotal(next.total));
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
        const target = getNotificationTarget(n);
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
