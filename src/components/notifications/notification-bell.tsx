"use client";

import { useEffect } from "react";
import { Badge, Button, Dropdown, Tabs } from "antd";
import { BellOutlined } from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import {
  markAllReadLocally,
  selectCommentUnreadCount,
  selectGeneralUnreadCount,
  selectNotificationActiveTab,
  setOpen,
  setActiveTab,
  setUnreadCounts,
  selectUnreadCount,
  selectNotificationOpen,
} from "@store/notification_slice";
import { getUnreadCount, markAllRead } from "@api/notifications";
import { NotificationList } from "./notification-list";
import styles from "./notification.module.css";

export function NotificationBell() {
  const dispatch = useDispatch();
  const unreadCount = useSelector(selectUnreadCount);
  const generalUnreadCount = useSelector(selectGeneralUnreadCount);
  const commentUnreadCount = useSelector(selectCommentUnreadCount);
  const isOpen = useSelector(selectNotificationOpen);
  const activeTab = useSelector(selectNotificationActiveTab);

  // Fetch unread count on mount (canonical source for initial badge)
  useEffect(() => {
    getUnreadCount()
      .then((counts) => dispatch(setUnreadCounts(counts)))
      .catch(() => {}); // silently ignore on error
  }, [dispatch]);

  const handleOpenChange = async (open: boolean) => {
    dispatch(setOpen(open));
  };

  const handleClearAll = async () => {
    dispatch(markAllReadLocally());
    try {
      await markAllRead();
    } catch {
      getUnreadCount()
        .then((counts) => dispatch(setUnreadCounts(counts)))
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
            {activeTab === "general" && generalUnreadCount > 0 && (
              <Button type="link" size="small" onClick={() => void handleClearAll()}>
                Clear All
              </Button>
            )}
          </div>
          <Tabs
            activeKey={activeTab}
            onChange={(key) => dispatch(setActiveTab(key as "general" | "comment"))}
            className="px-2 pt-2"
            items={[
              {
                key: "general",
                label: (
                  <Badge count={generalUnreadCount} size="small" offset={[8, 0]}>
                    <span className="pr-3">General</span>
                  </Badge>
                ),
                children: <NotificationList category="general" />,
              },
              {
                key: "comment",
                label: (
                  <Badge count={commentUnreadCount} size="small" offset={[8, 0]}>
                    <span className="pr-3">Comment</span>
                  </Badge>
                ),
                children: <NotificationList category="comment" />,
              },
            ]}
          />
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
