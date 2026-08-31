"use client";

import Link from "next/link";
import { MouseEvent, useEffect, useRef, useState } from "react";
import { Badge } from "antd";
import { DownOutlined } from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { RootState } from "@store/index";
import {
  appendNotifications,
  markNotificationGroupReadLocally,
  markNotificationReadLocally,
  selectCommentGateEnabled,
  selectNotificationsByCategory,
  selectNotificationTotalByCategory,
  setNotifications,
  setNotificationTotal,
  setOpen,
  setUnreadCounts,
} from "@store/notification_slice";
import { NotificationCategory, NotificationItem } from "@myTypes/notification";
import {
  getNotificationGroupItems,
  getNotifications,
  getUnreadCount,
  markNotificationGroupRead,
  markNotificationRead,
} from "@api/notifications";
import { useCommentReviewGrace } from "@hooks/use-comment-review-grace";

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
      if (isValidId(n.activityId)) params.set("commentId", n.activityId);
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

  if (category === "comment") {
    if (isValidId(n.activityId)) params.set("commentId", n.activityId);
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
  const commentTypes = ["comment_mention", "notulensi_mention", "notulensi_comment", "mention"];
  const matchesCategory = (notification: NotificationItem) =>
    category === "comment"
      ? commentTypes.includes(notification.type)
      : !commentTypes.includes(notification.type);
  const data = result.data.filter(matchesCategory);
  const backendIgnoredCategory = data.length !== result.data.length;

  return {
    data,
    total: backendIgnoredCategory ? data.length : result.total,
  };
}

export function NotificationList({ category }: NotificationListProps) {
  const dispatch = useDispatch();
  const commentGateEnabled = useSelector(selectCommentGateEnabled);
  const notifications = useSelector((state: RootState) =>
    selectNotificationsByCategory(state, category)
  );
  const total = useSelector((state: RootState) =>
    selectNotificationTotalByCategory(state, category)
  );
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [groupItems, setGroupItems] = useState<Record<string, {
    data: NotificationItem[];
    total: number;
    page: number;
    loading: boolean;
    error: boolean;
    failedPage?: number;
  }>>({});
  const locallyReadGroups = useRef(new Set<string>());
  const { startGrace } = useCommentReviewGrace();

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
    if (category === "general") {
      markRead(notification);
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

  const readCommentGroup = (notification: NotificationItem, selectedIsUnread: boolean) => {
    const groupId = notification.groupId || notification.id;
    if (!selectedIsUnread || locallyReadGroups.current.has(groupId)) return;
    locallyReadGroups.current.add(groupId);
    dispatch(markNotificationGroupReadLocally({
      groupId,
      unreadCount: notification.unreadCount || 0,
    }));
    setGroupItems((current) => current[groupId] ? {
      ...current,
      [groupId]: {
        ...current[groupId],
        data: current[groupId].data.map((item) => ({ ...item, isRead: true })),
      },
    } : current);
    startGrace();
    markNotificationGroupRead(groupId)
      .then((counts) => dispatch(setUnreadCounts({
        ...counts,
        commentGateEnabled: counts.commentGateEnabled ?? commentGateEnabled,
      })))
      .catch(() => {
        locallyReadGroups.current.delete(groupId);
        void refreshNotifications();
      });
  };

  const handleCommentClick = (
    event: MouseEvent<HTMLAnchorElement>,
    group: NotificationItem,
    selected: NotificationItem,
  ) => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
      event.preventDefault();
      return;
    }
    readCommentGroup(group, !group.isRead || !selected.isRead);
    dispatch(setOpen(false));
  };

  const loadGroupItems = async (groupId: string, nextPage = 1) => {
    setGroupItems((current) => ({
      ...current,
      [groupId]: {
        data: nextPage === 1 ? [] : current[groupId]?.data || [],
        total: current[groupId]?.total || 0,
        page: current[groupId]?.page || 0,
        loading: true,
        error: false,
        failedPage: undefined,
      },
    }));
    try {
      const result = await getNotificationGroupItems(groupId, nextPage, 20);
      setGroupItems((current) => ({
        ...current,
        [groupId]: {
          data: nextPage === 1
            ? result.data
            : [...(current[groupId]?.data || []), ...result.data],
          total: result.total,
          page: nextPage,
          loading: false,
          error: false,
          failedPage: undefined,
        },
      }));
    } catch {
      setGroupItems((current) => ({
        ...current,
        [groupId]: {
          ...(current[groupId] || { data: [], total: 0, page: nextPage }),
          loading: false,
          error: true,
          failedPage: nextPage,
        },
      }));
    }
  };

  const toggleGroup = (groupId: string) => {
    const nextExpanded = !expandedGroups[groupId];
    setExpandedGroups((current) => ({ ...current, [groupId]: nextExpanded }));
    if (nextExpanded && !groupItems[groupId]) void loadGroupItems(groupId);
  };

  useEffect(() => {
    for (const notification of notifications) {
      const groupId = notification.groupId || notification.id;
      const state = groupItems[groupId];
      if (
        category === "comment"
        && expandedGroups[groupId]
        && state
        && !state.loading
        && (notification.groupCount || 1) > state.total
      ) {
        void loadGroupItems(groupId);
      }
    }
  }, [category, expandedGroups, notifications]);

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
        const groupId = n.groupId || n.id;
        const groupState = groupItems[groupId];
        if (category === "comment") {
          const panelId = `notification-group-${groupId}`;
          const groupHeader = target ? (
            <Link
              href={target}
              onClick={(event) => handleCommentClick(event, n, n)}
              className="flex min-h-10 min-w-0 flex-1 flex-col gap-1 px-4 py-3 text-left hover:bg-gray-50"
              style={!n.isRead ? { backgroundColor: "rgba(59, 130, 246, 0.1)" } : undefined}
            >
              <span className={`flex min-w-0 items-center gap-2 text-sm ${!n.isRead ? "font-semibold" : "font-normal"}`}>
                <span className="truncate">{n.title}</span>
                {(n.unreadCount || 0) > 0 && <Badge count={n.unreadCount} size="small" />}
              </span>
              {n.message && <span className="truncate text-xs text-gray-500">{n.message}</span>}
              <span className="text-xs text-gray-400">{dayjs(n.createdAt).fromNow()}</span>
            </Link>
          ) : (
            <div className="flex min-h-10 min-w-0 flex-1 flex-col gap-1 px-4 py-3 text-left">
              <span className="truncate text-sm">{n.title}</span>
              {n.message && <span className="truncate text-xs text-gray-500">{n.message}</span>}
            </div>
          );

          return (
            <div key={groupId} className="border-b border-gray-100">
              <div className="flex min-w-0 items-stretch">
                {groupHeader}
                {(n.groupCount || 1) > 1 && (
                  <button
                    type="button"
                    aria-label={expandedGroups[groupId] ? "Collapse notification group" : "Expand notification group"}
                    aria-expanded={Boolean(expandedGroups[groupId])}
                    aria-controls={panelId}
                    onClick={() => toggleGroup(groupId)}
                    className="flex min-h-10 min-w-10 items-center justify-center border-0 bg-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                  >
                    <DownOutlined className={`transition-transform ${expandedGroups[groupId] ? "rotate-180" : ""}`} />
                  </button>
                )}
              </div>
              {expandedGroups[groupId] && (
                <div id={panelId} role="region" className="bg-gray-50/70 py-1">
                  {groupState?.loading && groupState.data.length === 0 && (
                    <div className="px-5 py-3 text-xs text-gray-500">Loading comments...</div>
                  )}
                  {groupState?.error && groupState.data.length === 0 && (
                    <div className="flex min-h-10 items-center justify-between gap-2 px-5 text-xs text-red-600">
                      <span>Could not load comments.</span>
                      <button type="button" onClick={() => void loadGroupItems(groupId)} className="min-h-10 border-0 bg-transparent font-medium text-blue-600">Retry</button>
                    </div>
                  )}
                  {groupState?.data.map((child) => {
                    const childTarget = getNotificationTarget(child, "comment");
                    const childContent = (
                      <>
                        <span className={`truncate text-xs ${!child.isRead ? "font-semibold text-gray-800" : "text-gray-700"}`}>
                          {child.createdBy?.username || "Unknown"} · {child.title}
                        </span>
                        {child.message && <span className="truncate text-xs text-gray-500">{child.message}</span>}
                        <span className="text-[11px] text-gray-400">{dayjs(child.createdAt).fromNow()}</span>
                      </>
                    );
                    return childTarget ? (
                      <Link
                        key={child.id}
                        href={childTarget}
                        onClick={(event) => handleCommentClick(event, n, child)}
                        className="flex min-h-10 flex-col justify-center gap-0.5 border-0 border-t border-gray-100 px-6 py-2 text-left hover:bg-gray-100"
                      >
                        {childContent}
                      </Link>
                    ) : (
                      <div key={child.id} className="flex min-h-10 flex-col justify-center gap-0.5 border-t border-gray-100 px-6 py-2">
                        {childContent}
                      </div>
                    );
                  })}
                  {groupState && groupState.data.length < groupState.total && (
                    <button
                      type="button"
                      disabled={groupState.loading}
                      onClick={() => void loadGroupItems(
                        groupId,
                        groupState.failedPage || groupState.page + 1,
                      )}
                      className="min-h-10 w-full border-0 border-t border-gray-100 bg-transparent text-xs font-medium text-blue-600 hover:bg-gray-100 disabled:text-gray-400"
                    >
                      {groupState.loading ? "Loading..." : groupState.error ? "Retry" : "Show more"}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        }
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
