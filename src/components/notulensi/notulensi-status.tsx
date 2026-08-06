"use client";

import { NotulensiPriority, NotulensiStatus } from "@myTypes/notulensi";
import { Tag } from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  PlayCircleOutlined,
  PlusCircleOutlined,
  RedoOutlined,
} from "@ant-design/icons";
import type { NotulensiWorkflowAction } from "@myTypes/notulensi";
import type { ReactNode } from "react";

export const NOTULENSI_STATUS_META: Record<
  NotulensiStatus,
  { label: string; color: string; icon: ReactNode }
> = {
  new: { label: "New Task", color: "processing", icon: <PlusCircleOutlined /> },
  in_progress: { label: "Proses", color: "gold", icon: <PlayCircleOutlined /> },
  waiting_review: { label: "Menunggu Review", color: "purple", icon: <ClockCircleOutlined /> },
  revision: { label: "Revisi", color: "orange", icon: <RedoOutlined /> },
  completed: { label: "Selesai", color: "success", icon: <CheckCircleOutlined /> },
  cancelled: { label: "Canceled", color: "error", icon: <CloseCircleOutlined /> },
};

export const NOTULENSI_STATUS_ACTIONS: Record<NotulensiStatus, NotulensiWorkflowAction | null> = {
  new: null,
  in_progress: "start",
  waiting_review: "submit_review",
  revision: "request_revision",
  completed: "complete",
  cancelled: "cancel",
};

export const NOTULENSI_PRIORITY_META: Record<
  NotulensiPriority,
  { label: string; color: string }
> = {
  urgent: { label: "Urgent", color: "red" },
  reg: { label: "Regular", color: "blue" },
  minor: { label: "Minor", color: "default" },
};

export const NOTULENSI_STATUS_ORDER: NotulensiStatus[] = [
  "new",
  "in_progress",
  "revision",
  "waiting_review",
  "completed",
  "cancelled",
];

export function NotulensiStatusLabel({ status, className = "" }: { status: NotulensiStatus; className?: string }) {
  const meta = NOTULENSI_STATUS_META[status];

  return (
    <span className={`inline-flex items-center gap-2 ${className}`.trim()}>
      {meta.icon}
      <span>{meta.label}</span>
    </span>
  );
}

export function NotulensiStatusTag({ status }: { status: NotulensiStatus }) {
  const meta = NOTULENSI_STATUS_META[status];
  return (
    <Tag color={meta.color} className="inline-flex items-center gap-1">
      <NotulensiStatusLabel status={status} className="gap-1" />
    </Tag>
  );
}

export function NotulensiPriorityTag({ priority }: { priority: NotulensiPriority }) {
  const meta = NOTULENSI_PRIORITY_META[priority];
  return <Tag color={meta.color}>{meta.label}</Tag>;
}
