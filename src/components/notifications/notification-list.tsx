"use client";

import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { setOpen, selectNotifications } from "@store/notification_slice";
import { NotificationItem } from "@myTypes/notification";

dayjs.extend(relativeTime);

export function NotificationList() {
  const router = useRouter();
  const dispatch = useDispatch();
  const notifications = useSelector(selectNotifications);

  const handleClick = (n: NotificationItem) => {
    dispatch(setOpen(false));
    const params = new URLSearchParams();
    if (n.cardId) {
      params.set("cardId", n.cardId);
    }
    if (n.listId) {
      params.set("listId", n.listId);
    }

    const query = params.toString();
    router.push(
      query
        ? `/workspace/${n.workspaceId}/board/${n.boardId}?${query}`
        : `/workspace/${n.workspaceId}/board/${n.boardId}`
    );
  };

  if (notifications.length === 0) {
    return (
      <div className="p-4 text-center text-gray-400 text-sm">No notifications</div>
    );
  }

  return (
    <div className="max-h-96 overflow-y-auto min-w-80">
      {notifications.map((n) => (
        <div
          key={n.id}
          onClick={() => handleClick(n)}
          className={`flex flex-col gap-1 px-4 py-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 ${
            !n.isRead ? "bg-blue-50" : ""
          }`}
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
        </div>
      ))}
    </div>
  );
}
