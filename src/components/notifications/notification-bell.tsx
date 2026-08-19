"use client";

import { useEffect } from "react";
import { Badge, Button, Dropdown } from "antd";
import { BellOutlined } from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import {
  markAllReadLocally,
  setOpen,
  setUnreadCount,
  setNotifications,
  setNotificationTotal,
  selectUnreadCount,
  selectNotificationOpen,
} from "@store/notification_slice";
import { getNotifications, getUnreadCount, markAllRead } from "@api/notifications";
import { NotificationList } from "./notification-list";
import styles from "./notification.module.css";

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
      getNotifications(1, 20)
        .then((result) => {
          dispatch(setNotifications(result.data));
          dispatch(setNotificationTotal(result.total));
        })
        .catch(() => {});
    }
  };

  const handleClearAll = async () => {
    dispatch(markAllReadLocally());
    try {
      await markAllRead();
    } catch {
      getUnreadCount()
        .then(({ unreadCount: count }) => dispatch(setUnreadCount(count)))
        .catch(() => {});
    }
  };

  return (
    <Dropdown
      open={isOpen}
      onOpenChange={handleOpenChange}
      dropdownRender={() => (
        <div
          style={{
            background: "#ffffff",
            borderRadius: 8,
            boxShadow: "0 6px 16px rgba(0,0,0,0.12)",
          }}
        >
          <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-2">
            <span className="text-sm font-semibold text-gray-700">Notifications</span>
            {unreadCount > 0 && (
              <Button type="link" size="small" onClick={() => void handleClearAll()}>
                Clear All
              </Button>
            )}
          </div>
          <NotificationList />
        </div>
      )}
      trigger={["click"]}
      placement="bottomRight"
      overlayClassName={styles.dropdown}
      autoAdjustOverflow
      overlayStyle={{
        zIndex: 9999,
        width: "min(384px, calc(100vw - 16px))",
      }}
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
