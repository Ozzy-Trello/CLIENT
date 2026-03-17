"use client";

import { useEffect } from "react";
import { Badge, Dropdown } from "antd";
import { BellOutlined } from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import {
  setOpen,
  setUnreadCount,
  setNotifications,
  markAllReadLocally,
  selectUnreadCount,
  selectNotificationOpen,
} from "@store/notification_slice";
import { getNotifications, getUnreadCount, markAllRead } from "@api/notifications";
import { NotificationList } from "./notification-list";

export function NotificationBell() {
  const dispatch = useDispatch();
  const unreadCount = useSelector(selectUnreadCount);
  const isOpen = useSelector(selectNotificationOpen);

  // Fetch unread count on mount (canonical source for initial badge)
  useEffect(() => {
    getUnreadCount()
      .then(({ unreadCount }) => dispatch(setUnreadCount(unreadCount)))
      .catch(() => {}); // silently ignore on error
  }, [dispatch]);

  const handleOpenChange = async (open: boolean) => {
    dispatch(setOpen(open));

    if (open) {
      // Optimistically zero the badge
      dispatch(markAllReadLocally());

      // Fetch latest notifications + fire mark-read in parallel
      const [notifResult] = await Promise.allSettled([
        getNotifications(1, 20),
        markAllRead(),
      ]);

      if (notifResult.status === "fulfilled") {
        dispatch(setNotifications(notifResult.value.data));
      }
    }
  };

  return (
    <Dropdown
      open={isOpen}
      onOpenChange={handleOpenChange}
      dropdownRender={() => <NotificationList />}
      trigger={["click"]}
      placement="bottomRight"
    >
      <Badge count={unreadCount} size="small" offset={[-2, 2]}>
        <BellOutlined
          style={{ fontSize: 20, cursor: "pointer" }}
          className="text-gray-600 hover:text-gray-900"
        />
      </Badge>
    </Dropdown>
  );
}
