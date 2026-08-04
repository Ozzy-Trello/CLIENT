"use client";

import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { setOpen, selectNotifications } from "@store/notification_slice";
import { NotificationItem } from "@myTypes/notification";

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
  const router = useRouter();
  const dispatch = useDispatch();
  const notifications = useSelector(selectNotifications);

  const handleClick = (target: string) => {
    dispatch(setOpen(false));
    router.push(target);
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
        return (
          <button
            type="button"
            key={n.id}
            onClick={target ? () => handleClick(target) : undefined}
            disabled={!target}
            className={`flex w-full flex-col gap-1 border-0 border-b border-gray-100 px-4 py-3 text-left ${
              target ? "cursor-pointer hover:bg-gray-50" : "cursor-default"
            } ${!n.isRead ? "bg-blue-50" : ""}`}
          >
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
          </button>
        );
      })}
    </div>
  );
}
