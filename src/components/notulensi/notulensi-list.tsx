"use client";

import {
  NotulensiPriorityTag,
  NotulensiStatusTag,
  NOTULENSI_STATUS_ACTIONS,
  NOTULENSI_STATUS_META,
} from "@components/notulensi/notulensi-status";
import {
  copyNotulensiLink,
  formatNotulensiListDate,
  getAssigneeNames,
  getListWorkflowActions,
  NOTULENSI_ACTION_META,
} from "@components/notulensi/notulensi-detail-utils";
import { useDeleteNotulensi, useNotulensiAction } from "@hooks/notulensi";
import {
  NotulensiListResponse,
  NotulensiSortBy,
  NotulensiSortOrder,
  NotulensiSummary,
  NotulensiWorkflowAction,
} from "@myTypes/notulensi";
import {
  Button,
  Dropdown,
  Empty,
  Grid,
  Modal,
  Pagination,
  Skeleton,
  Table,
  Tooltip,
  Typography,
  message,
} from "antd";
import dayjs from "dayjs";
import { AlertCircle, CalendarClock, Copy, MoreHorizontal, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  workspaceId: string;
  data?: NotulensiListResponse;
  loading: boolean;
  sortBy?: NotulensiSortBy;
  sortOrder?: NotulensiSortOrder;
  onPageChange: (page: number, pageSize: number) => void;
  onSortChange: (sortBy: NotulensiSortBy, sortOrder: NotulensiSortOrder) => void;
};

const terminalStatuses = new Set(["completed", "cancelled"]);
const sortKeys = new Set<NotulensiSortBy>([
  "title",
  "status",
  "progress",
  "priority",
  "due_date",
  "creator",
  "created_at",
  "updated_at",
]);

const toPlainText = (value: string) =>
  value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

function DueDateText({ item }: { item: NotulensiSummary }) {
  if (!item.dueDate) {
    return <Typography.Text type="secondary">No due date</Typography.Text>;
  }

  const overdue = !terminalStatuses.has(item.status) && dayjs(item.dueDate).isBefore(dayjs());

  return (
    <div className="flex flex-wrap items-center gap-1">
      {overdue ? <AlertCircle size={14} aria-hidden="true" /> : <CalendarClock size={14} aria-hidden="true" />}
      <Typography.Text>{formatNotulensiListDate(item.dueDate)}</Typography.Text>
      {overdue ? <Typography.Text type="danger">Overdue</Typography.Text> : null}
    </div>
  );
}

function AssigneeNames({ item, mobile = false }: { item: NotulensiSummary; mobile?: boolean }) {
  const names = getAssigneeNames(item.assignees);
  return (
    <Tooltip title={mobile ? undefined : names}>
      <Typography.Text className={mobile ? "whitespace-normal" : "block truncate"}>
        {names}
      </Typography.Text>
    </Tooltip>
  );
}

function LoadingState() {
  return (
    <div className="rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-4">
      {[0, 1, 2, 3, 4].map((row) => (
        <Skeleton key={row} active paragraph={{ rows: 1 }} className="py-2" />
      ))}
    </div>
  );
}

export default function NotulensiList({
  workspaceId,
  data,
  loading,
  sortBy,
  sortOrder,
  onPageChange,
  onSortChange,
}: Props) {
  const screens = Grid.useBreakpoint();
  const router = useRouter();
  const actionMutation = useNotulensiAction();
  const deleteMutation = useDeleteNotulensi();
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const openItem = (id: string) => router.push(`/workspace/${workspaceId}/notulensi/${id}`);
  const openFromKeyboard = (event: React.KeyboardEvent, id: string) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openItem(id);
    }
  };
  const runAction = async (item: NotulensiSummary, action: NotulensiWorkflowAction) => {
    const pendingKey = `${item.id}:${action}`;
    if (pendingAction) return;
    setPendingAction(pendingKey);
    try {
      await actionMutation.mutateAsync({ workspaceId, id: item.id, action });
      message.success("Status updated");
    } catch {
      message.error("Failed to update status");
    } finally {
      setPendingAction(null);
    }
  };
  const copyLink = async (item: NotulensiSummary) => {
    try {
      await copyNotulensiLink(workspaceId, item.id);
      message.success("Link copied");
    } catch {
      message.error("Failed to copy link");
    }
  };
  const deleteItem = async (item: NotulensiSummary) => {
    if (pendingDeleteId) return;
    setPendingDeleteId(item.id);
    try {
      await deleteMutation.mutateAsync({ workspaceId, id: item.id });
      message.success("Task deleted");
    } catch {
      message.error("Failed to delete task");
    } finally {
      setPendingDeleteId(null);
    }
  };
  const confirmAction = (item: NotulensiSummary, action: NotulensiWorkflowAction) => {
    const confirmation = NOTULENSI_ACTION_META[action].confirmation;
    if (!confirmation) return runAction(item, action);
    Modal.confirm({
      title: confirmation.title,
      content: confirmation.description,
      okButtonProps: { danger: NOTULENSI_ACTION_META[action].danger },
      onOk: () => runAction(item, action),
    });
  };
  const confirmDelete = (item: NotulensiSummary) => {
    Modal.confirm({
      title: `Permanently delete "${item.title}"?`,
      content: "This task and its data will be permanently deleted. This action cannot be undone.",
      okText: "Delete permanently",
      okButtonProps: { danger: true },
      onOk: () => deleteItem(item),
    });
  };
  const actions = (item: NotulensiSummary) => (
    <div
      className="flex justify-end"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <Dropdown
        trigger={["click"]}
        placement="bottomRight"
        menu={{
          items: [
            ...getListWorkflowActions(item.allowedActions).map((action) => {
              const targetStatus = Object.entries(NOTULENSI_STATUS_ACTIONS)
                .find(([, statusAction]) => statusAction === action)?.[0] as keyof typeof NOTULENSI_STATUS_META | undefined;
              return {
                key: `action-${action}`,
                icon: targetStatus ? NOTULENSI_STATUS_META[targetStatus].icon : undefined,
                label: NOTULENSI_ACTION_META[action].label,
                danger: NOTULENSI_ACTION_META[action].danger,
                onClick: () => confirmAction(item, action),
              };
            }),
            ...(getListWorkflowActions(item.allowedActions).length
              ? [{ type: "divider" as const }]
              : []),
            {
              key: "copy-link",
              icon: <Copy size={14} aria-hidden="true" />,
              label: "Copy Link",
              onClick: () => copyLink(item),
            },
            ...(item.permissions?.canDelete
              ? [{
                  key: "delete",
                  icon: <Trash2 size={14} aria-hidden="true" />,
                  label: "Delete",
                  danger: true,
                  onClick: () => confirmDelete(item),
                }]
              : []),
          ],
        }}
      >
        <Button
          type="text"
          icon={<MoreHorizontal size={18} aria-hidden="true" />}
          aria-label={`More actions for ${item.title}`}
          loading={pendingAction?.startsWith(`${item.id}:`) || pendingDeleteId === item.id}
        />
      </Dropdown>
    </div>
  );
  const orderFor = (key: NotulensiSortBy) =>
    sortBy === key ? (sortOrder === "asc" ? "ascend" : "descend") : null;

  if (loading) return <LoadingState />;

  if (!data?.data.length) {
    return (
      <div className="rounded-xl border border-dashed border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-8">
        <Empty description="No instructions yet. Create the first item or adjust the current filters." />
      </div>
    );
  }

  if (!screens.md) {
    return (
      <div>
        <div className="flex flex-col gap-3">
          {data.data.map((item) => (
            <div
              key={item.id}
              role="link"
              tabIndex={0}
              className="cursor-pointer rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-4"
              onClick={(event) => {
                if ((event.target as HTMLElement).closest("a, button, input, select, textarea")) return;
                openItem(item.id);
              }}
              onKeyDown={(event) => openFromKeyboard(event, item.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <Typography.Title level={5} className="!mb-2 !mt-0 min-w-0 whitespace-normal break-words text-base">
                  <Link href={`/workspace/${workspaceId}/notulensi/${item.id}`}>{item.title}</Link>
                </Typography.Title>
                <div className="shrink-0">{actions(item)}</div>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
                <NotulensiStatusTag status={item.status} />
                <Typography.Text>{item.progress}%</Typography.Text>
                <NotulensiPriorityTag priority={item.priority} />
                <AssigneeNames item={item} mobile />
                <DueDateText item={item} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <Pagination
            current={data.pagination.page}
            pageSize={data.pagination.limit}
            total={data.pagination.total}
            onChange={onPageChange}
            showSizeChanger
            pageSizeOptions={[10, 20, 50]}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))]">
      <Table
        rowKey="id"
        dataSource={data.data}
        pagination={{
          current: data.pagination.page,
          pageSize: data.pagination.limit,
          total: data.pagination.total,
          onChange: onPageChange,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 50],
        }}
        scroll={{ x: 1390 }}
        sortDirections={["ascend", "descend", "ascend"]}
        onChange={(_, __, sorter) => {
          const activeSorter = Array.isArray(sorter) ? sorter[0] : sorter;
          const key = activeSorter.columnKey;
          if (typeof key === "string" && sortKeys.has(key as NotulensiSortBy) && activeSorter.order) {
            onSortChange(key as NotulensiSortBy, activeSorter.order === "ascend" ? "asc" : "desc");
          }
        }}
        onRow={(item) => ({
          tabIndex: 0,
          className: "cursor-pointer",
          onClick: (event) => {
            if ((event.target as HTMLElement).closest("a, button, input, select, textarea")) return;
            openItem(item.id);
          },
          onKeyDown: (event) => openFromKeyboard(event, item.id),
        })}
        columns={[
          {
            title: "Title",
            key: "title",
            sorter: true,
            sortOrder: orderFor("title"),
            render: (_, item: NotulensiSummary) => (
              <div className="min-w-0">
                <Link href={`/workspace/${workspaceId}/notulensi/${item.id}`} className="font-semibold">
                  {item.title}
                </Link>
                <Typography.Paragraph type="secondary" ellipsis={{ rows: 2 }} className="!mb-0 text-xs">
                  {toPlainText(item.content) || "No description"}
                </Typography.Paragraph>
              </div>
            ),
          },
          {
            title: "Created Date",
            key: "created_at",
            sorter: true,
            sortOrder: orderFor("created_at"),
            render: (_, item: NotulensiSummary) => formatNotulensiListDate(item.createdAt),
            width: 130,
          },
          {
            title: "Due Date",
            key: "due_date",
            sorter: true,
            sortOrder: orderFor("due_date"),
            render: (_, item: NotulensiSummary) => <DueDateText item={item} />,
            width: 190,
          },
          {
            title: "Status",
            key: "status",
            sorter: true,
            sortOrder: orderFor("status"),
            render: (_, item: NotulensiSummary) => <NotulensiStatusTag status={item.status} />,
            width: 130,
          },
          {
            title: "Priority",
            key: "priority",
            sorter: true,
            sortOrder: orderFor("priority"),
            render: (_, item: NotulensiSummary) => <NotulensiPriorityTag priority={item.priority} />,
            width: 120,
          },
          {
            title: <span className="whitespace-nowrap">Progress</span>,
            key: "progress",
            sorter: true,
            sortOrder: orderFor("progress"),
            render: (_, item: NotulensiSummary) => `${item.progress}%`,
            width: 120,
          },
          {
            title: "Creator",
            key: "creator",
            sorter: true,
            sortOrder: orderFor("creator"),
            render: (_, item: NotulensiSummary) => item.creator?.username || "Unknown user",
            width: 140,
          },
          {
            title: "Assignees",
            render: (_, item: NotulensiSummary) => <AssigneeNames item={item} />,
            width: 180,
          },
          {
            title: "Action",
            key: "actions",
            align: "right",
            fixed: "right",
            render: (_, item: NotulensiSummary) => actions(item),
            width: 90,
          },
        ]}
      />
    </div>
  );
}
