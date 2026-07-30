"use client";

import { NotulensiPriority, NotulensiStatus } from "@myTypes/notulensi";
import { Tag } from "antd";

export const NOTULENSI_STATUS_META: Record<
  NotulensiStatus,
  { label: string; color: string }
> = {
  draft: { label: "Draft", color: "default" },
  open: { label: "Open", color: "processing" },
  in_progress: { label: "In progress", color: "gold" },
  completed: { label: "Completed", color: "success" },
  cancelled: { label: "Cancelled", color: "error" },
};

export const NOTULENSI_PRIORITY_META: Record<
  NotulensiPriority,
  { label: string; color: string }
> = {
  low: { label: "Low", color: "default" },
  medium: { label: "Medium", color: "blue" },
  high: { label: "High", color: "orange" },
  urgent: { label: "Urgent", color: "red" },
};

export const NOTULENSI_STATUS_ORDER: NotulensiStatus[] = [
  "draft",
  "open",
  "in_progress",
  "completed",
  "cancelled",
];

export const NOTULENSI_TRANSITIONS: Record<NotulensiStatus, NotulensiStatus[]> = {
  draft: ["open", "cancelled"],
  open: ["in_progress", "cancelled"],
  in_progress: ["completed", "open", "cancelled"],
  completed: ["in_progress"],
  cancelled: ["open"],
};

export function NotulensiStatusTag({ status }: { status: NotulensiStatus }) {
  const meta = NOTULENSI_STATUS_META[status];
  return <Tag color={meta.color}>{meta.label}</Tag>;
}

export function NotulensiPriorityTag({ priority }: { priority: NotulensiPriority }) {
  const meta = NOTULENSI_PRIORITY_META[priority];
  return <Tag color={meta.color}>{meta.label}</Tag>;
}
