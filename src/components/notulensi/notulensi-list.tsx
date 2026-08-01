"use client";

import {
  NotulensiPriorityTag,
  NotulensiStatusTag,
} from "@components/notulensi/notulensi-status";
import { NotulensiListResponse, NotulensiSummary } from "@myTypes/notulensi";
import { Avatar, Empty, Grid, List, Skeleton, Table, Tooltip, Typography } from "antd";
import dayjs from "dayjs";
import { AlertCircle, CalendarClock, Clock3 } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Props = {
  workspaceId: string;
  data?: NotulensiListResponse;
  loading: boolean;
  onPageChange: (page: number, pageSize: number) => void;
};

const terminalStatuses = new Set(["completed", "cancelled"]);

const toPlainText = (value: string) =>
  value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const getInitials = (value: string) => value.slice(0, 2).toUpperCase();

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

function AssigneeAvatars({ item }: { item: NotulensiSummary }) {
  return (
    <Avatar.Group max={{ count: 3 }}>
      {item.assignees.map((assignee) => (
        <Tooltip key={assignee.id} title={assignee.user?.username || "Unknown user"}>
          <Avatar>{getInitials(assignee.user?.username || "?")}</Avatar>
        </Tooltip>
      ))}
    </Avatar.Group>
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
  const openItem = (id: string) => router.push(`/workspace/${workspaceId}/notulensi/${id}`);
  const rowKeyboard = (event: React.KeyboardEvent, id: string) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openItem(id);
    }
  };

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
              role="link"
              tabIndex={0}
              onClick={() => openItem(item.id)}
              onKeyDown={(event) => rowKeyboard(event, item.id)}
            >
              <div className="block w-full">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <Typography.Text type="secondary" className="block text-xs">
                      {item.code}
                    </Typography.Text>
                    <Typography.Title level={5} className="!mb-1 !mt-0 text-base">
                      {item.title}
                    </Typography.Title>
                    <div className="mb-2 flex flex-wrap gap-2">
                      <NotulensiStatusTag status={item.status} />
                      <NotulensiPriorityTag priority={item.priority} />
                    </div>
                    <div className="flex flex-col gap-2 text-sm">
                      <DueDateText item={item} />
                      <AssigneeAvatars item={item} />
                    </div>
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
        scroll={{ x: 980 }}
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
            title: "Code",
            dataIndex: "code",
            width: 120,
            render: (code: string, item: NotulensiSummary) => (
              <Link href={`/workspace/${workspaceId}/notulensi/${item.id}`}>{code}</Link>
            ),
          },
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
            render: (_, item: NotulensiSummary) => <AssigneeAvatars item={item} />,
            width: 140,
          },
          {
            title: "Creator",
            render: (_, item: NotulensiSummary) => item.creator?.username || "Unknown user",
            width: 140,
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
        ]}
      />
    </div>
  );
}
