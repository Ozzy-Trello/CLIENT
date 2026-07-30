"use client";

import {
  NOTULENSI_STATUS_ORDER,
  NOTULENSI_STATUS_META,
  NotulensiPriorityTag,
  NotulensiStatusTag,
} from "@components/notulensi/notulensi-status";
import { NotulensiListResponse, NotulensiSummary, NotulensiStatus } from "@myTypes/notulensi";
import { Avatar, Card, Empty, Grid, Select, Skeleton, Tooltip, Typography } from "antd";
import dayjs from "dayjs";
import Link from "next/link";
import { useMemo, useState } from "react";

type Props = {
  workspaceId: string;
  data?: NotulensiListResponse;
  loading: boolean;
};

const getInitials = (value: string) => value.slice(0, 2).toUpperCase();

function BoardCard({ workspaceId, item }: { workspaceId: string; item: NotulensiSummary }) {
  return (
    <Link href={`/workspace/${workspaceId}/notulensi/${item.id}`} className="block">
      <Card hoverable size="small" className="mb-3">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Typography.Text type="secondary" className="block text-xs">
              {item.code}
            </Typography.Text>
            <Typography.Text strong>{item.title}</Typography.Text>
          </div>
          <NotulensiPriorityTag priority={item.priority} />
        </div>
        <div className="mb-3">
          <NotulensiStatusTag status={item.status} />
        </div>
        <div className="flex items-center justify-between gap-2 text-xs text-gray-500">
          <span>{item.dueDate ? dayjs(item.dueDate).format("DD MMM HH:mm") : "No due date"}</span>
          <Avatar.Group max={{ count: 3 }}>
            {item.assignees.map((assignee) => (
              <Tooltip key={assignee.id} title={assignee.user?.username || "Unknown user"}>
                <Avatar size={28}>{getInitials(assignee.user?.username || "?")}</Avatar>
              </Tooltip>
            ))}
          </Avatar.Group>
        </div>
      </Card>
    </Link>
  );
}

function LoadingColumns() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {NOTULENSI_STATUS_ORDER.map((status) => (
        <div key={status} className="w-[300px] min-w-[300px] rounded-xl border p-4">
          <Skeleton active paragraph={{ rows: 5 }} />
        </div>
      ))}
    </div>
  );
}

export default function NotulensiBoard({ workspaceId, data, loading }: Props) {
  const screens = Grid.useBreakpoint();
  const [mobileStatus, setMobileStatus] = useState<NotulensiStatus>("draft");

  const grouped = useMemo(() => {
    const base = Object.fromEntries(
      NOTULENSI_STATUS_ORDER.map((status) => [status, [] as NotulensiSummary[]])
    ) as Record<NotulensiStatus, NotulensiSummary[]>;

    (data?.data || []).forEach((item) => {
      base[item.status].push(item);
    });

    return base;
  }, [data]);

  if (loading) {
    return <LoadingColumns />;
  }

  if (!data?.data.length) {
    return (
      <div className="rounded-xl border border-dashed border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-8">
        <Empty description="No instructions match this board view. Create one or adjust filters." />
      </div>
    );
  }

  if (!screens.md) {
    return (
      <div className="rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-4">
        <Select
          value={mobileStatus}
          onChange={(value) => setMobileStatus(value as NotulensiStatus)}
          options={NOTULENSI_STATUS_ORDER.map((status) => ({
            value: status,
            label: `${NOTULENSI_STATUS_META[status].label} (${grouped[status].length})`,
          }))}
          className="mb-4 w-full"
        />
        <div>
          {grouped[mobileStatus].map((item) => (
            <BoardCard key={item.id} workspaceId={workspaceId} item={item} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-4">
        {NOTULENSI_STATUS_ORDER.map((status) => (
          <div
            key={status}
            className="w-[300px] min-w-[300px] rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-4"
          >
            <div className="mb-4 flex items-center justify-between gap-2">
              <NotulensiStatusTag status={status} />
              <Typography.Text type="secondary">{grouped[status].length}</Typography.Text>
            </div>
            <div>
              {grouped[status].map((item) => (
                <BoardCard key={item.id} workspaceId={workspaceId} item={item} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
