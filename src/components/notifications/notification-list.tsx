"use client";

import Link from "next/link";
import { MouseEvent } from "react";
import { useDispatch, useSelector } from "react-redux";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  markNotificationReadLocally,
  selectNotifications,
  setNotifications,
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

  const refreshNotifications = async () => {
    const [notificationsResult, countResult] = await Promise.allSettled([
      getNotifications(1, 20),
      getUnreadCount(),
    ]);
    if (notificationsResult.status === "fulfilled") {
      dispatch(setNotifications(notificationsResult.value.data));
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

  if (notifications.length === 0) {
    return (
      <div className="p-4 text-center text-gray-400 text-sm">No notifications</div>
    );
  }

  return (
    <div className="max-h-96 overflow-y-auto min-w-80">
      {notifications.map((n) => {
        const target = getNotificationTarget(n);
        const content = (
          <>
            <div className="flex items-center justify-between">
              <span className={`text-sm ${!n.isRead ? "font-semibold" : "font-normal"}`}>
                {n.title}
              </span>
            </div>
            {n.message && (
              <p className="text-xs text-gray-500 truncate">{n.message}</p>
            )}
            <span className="text-xs text-gray-400">
              {dayjs(n.createdAt).fromNow()}
            </span>
          </>
        );

        const className = `flex w-full flex-col gap-1 border-0 border-b border-gray-100 px-4 py-3 text-left ${
          target ? "cursor-pointer hover:bg-gray-50" : "cursor-default"
        } ${!n.isRead ? "bg-blue-50" : ""}`;

        return target ? (
          <Link
            key={n.id}
            href={target}
            onClick={(event) => handleClick(event, n)}
            onAuxClick={(event) => {
              if (event.button === 1) markRead(n);
            }}
            className={className}
          >
            {content}
          </Link>
        ) : (
          <div key={n.id} className={className}>
            {content}
          </div>
        );
      })}
    </div>
  );
}
