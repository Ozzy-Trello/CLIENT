"use client";

import {
  NotulensiPriorityTag,
  NotulensiStatusTag,
} from "@components/notulensi/notulensi-status";
import {
  copyNotulensiLink,
  getAssigneeNames,
  getListWorkflowActions,
  NOTULENSI_ACTION_META,
} from "@components/notulensi/notulensi-detail-utils";
import { useDeleteNotulensi, useNotulensiAction } from "@hooks/notulensi";
import {
  NotulensiListResponse,
  NotulensiSummary,
  NotulensiWorkflowAction,
} from "@myTypes/notulensi";
import {
  Button,
  Empty,
  Grid,
  List,
  Popconfirm,
  Skeleton,
  Table,
  Tooltip,
  Typography,
  message,
} from "antd";
import dayjs from "dayjs";
import { AlertCircle, CalendarClock, Clock3, Copy, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

type Props = {
  workspaceId: string;
  data?: NotulensiListResponse;
  loading: boolean;
  onPageChange: (page: number, pageSize: number) => void;
};

const terminalStatuses = new Set(["completed", "cancelled"]);

const toPlainText = (value: string) =>
  value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

function DueDateText({ item }: { item: NotulensiSummary }) {
  if (!item.dueDate) {
    return <Typography.Text type="secondary">No due date</Typography.Text>;
  }

  const overdue = !terminalStatuses.has(item.status) && dayjs(item.dueDate).isBefore(dayjs());

  return (
    <div className="flex items-center gap-1">
      {overdue ? <AlertCircle size={14} aria-hidden="true" /> : <CalendarClock size={14} aria-hidden="true" />}
      <Typography.Text>{dayjs(item.dueDate).format("DD MMM YYYY HH:mm")}</Typography.Text>
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

export default function NotulensiList({ workspaceId, data, loading, onPageChange }: Props) {
  const screens = Grid.useBreakpoint();
  const router = useRouter();
  const actionMutation = useNotulensiAction();
  const deleteMutation = useDeleteNotulensi();
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const openItem = (id: string) => router.push(`/workspace/${workspaceId}/notulensi/${id}`);
  const rowKeyboard = (event: React.KeyboardEvent, id: string) => {
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
  const actions = (item: NotulensiSummary) => (
    <div
      className="flex flex-wrap items-center gap-1"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      {getListWorkflowActions(item.allowedActions).map((action) => {
        const meta = NOTULENSI_ACTION_META[action];
        const button = (
          <Button
            size="small"
            danger={meta.danger}
            type={action === "complete" ? "primary" : "default"}
            loading={pendingAction === `${item.id}:${action}`}
            onClick={meta.confirmation ? undefined : () => runAction(item, action)}
          >
            {meta.label}
          </Button>
        );
        return meta.confirmation ? (
          <Popconfirm
            key={action}
            title={meta.confirmation.title}
            description={meta.confirmation.description}
            onConfirm={() => runAction(item, action)}
          >
            {button}
          </Popconfirm>
        ) : <span key={action}>{button}</span>;
      })}
      <Button
        size="small"
        icon={<Copy size={14} />}
        aria-label={`Copy link for ${item.title}`}
        onClick={() => copyLink(item)}
      >
        Copy Link
      </Button>
      {item.permissions?.canDelete ? (
        <Popconfirm
          title={`Permanently delete "${item.title}"?`}
          description="This task and its data will be permanently deleted. This action cannot be undone."
          okText="Delete permanently"
          okButtonProps={{ danger: true }}
          onConfirm={() => deleteItem(item)}
        >
          <Button
            size="small"
            danger
            icon={<Trash2 size={14} />}
            loading={pendingDeleteId === item.id}
          >
            Delete
          </Button>
        </Popconfirm>
      ) : null}
    </div>
  );

  if (loading) {
    return <LoadingState />;
  }

  if (!data?.data.length) {
    return (
      <div className="rounded-xl border border-dashed border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-8">
        <Empty description="No instructions yet. Create the first item or adjust the current filters." />
      </div>
    );
  }

  if (!screens.md) {
    return (
      <div className="rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))]">
        <List
          dataSource={data.data}
          renderItem={(item) => (
            <List.Item
              className="cursor-pointer px-4"
              onClick={(event) => {
                if ((event.target as HTMLElement).closest("a, button, input, select, textarea")) return;
                openItem(item.id);
              }}
            >
              <div className="block w-full">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <Typography.Title level={5} className="!mb-1 !mt-0 text-base">
                      <Link href={`/workspace/${workspaceId}/notulensi/${item.id}`}>
                        {item.title}
                      </Link>
                    </Typography.Title>
                    <div className="mb-2 flex flex-wrap gap-2">
                      <NotulensiStatusTag status={item.status} />
                      <NotulensiPriorityTag priority={item.priority} />
                    </div>
                    <div className="flex flex-col gap-2 text-sm">
                      <DueDateText item={item} />
                       <AssigneeNames item={item} mobile />
                      <Typography.Text type="secondary">
                        Created: {dayjs(item.createdAt).format("DD MMM YYYY HH:mm")}
                      </Typography.Text>
                      <Typography.Text type="secondary">
                        Updated: {dayjs(item.updatedAt).format("DD MMM YYYY HH:mm")}
                      </Typography.Text>
                    </div>
                    <div className="mt-3">{actions(item)}</div>
                  </div>
                </div>
              </div>
            </List.Item>
          )}
          pagination={{
            current: data.pagination.page,
            pageSize: data.pagination.limit,
            total: data.pagination.total,
            onChange: onPageChange,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50],
          }}
        />
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
        scroll={{ x: 1260 }}
        onRow={(item) => ({
          tabIndex: 0,
          className: "cursor-pointer",
          onClick: (event) => {
            if ((event.target as HTMLElement).closest("a, button, input, select, textarea")) return;
            openItem(item.id);
          },
          onKeyDown: (event) => rowKeyboard(event, item.id),
        })}
        columns={[
          {
            title: "Title",
            key: "title",
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
            title: "Status",
            render: (_, item: NotulensiSummary) => <NotulensiStatusTag status={item.status} />,
            width: 130,
          },
          {
            title: "Priority",
            render: (_, item: NotulensiSummary) => (
              <NotulensiPriorityTag priority={item.priority} />
            ),
            width: 120,
          },
          {
            title: "Due",
            render: (_, item: NotulensiSummary) => <DueDateText item={item} />,
            width: 180,
          },
          {
            title: "Assignees",
             render: (_, item: NotulensiSummary) => <AssigneeNames item={item} />,
             width: 180,
          },
          {
            title: "Creator",
            render: (_, item: NotulensiSummary) => item.creator?.username || "Unknown user",
            width: 140,
          },
          {
            title: "Created Date",
            render: (_, item: NotulensiSummary) => (
              <div className="flex items-center gap-1">
                <Clock3 size={14} aria-hidden="true" />
                <span>{dayjs(item.createdAt).format("DD MMM YYYY HH:mm")}</span>
              </div>
            ),
            width: 170,
          },
          {
            title: "Updated",
            render: (_, item: NotulensiSummary) => (
              <div className="flex items-center gap-1">
                <Clock3 size={14} aria-hidden="true" />
                <span>{dayjs(item.updatedAt).format("DD MMM YYYY HH:mm")}</span>
              </div>
            ),
            width: 170,
          },
          {
            title: "Actions",
            key: "actions",
            fixed: "right",
            render: (_, item: NotulensiSummary) => actions(item),
            width: 370,
          },
        ]}
      />
    </div>
  );
}
