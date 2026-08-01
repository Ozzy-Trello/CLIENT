"use client";

import { NotulensiPriority, NotulensiStatus } from "@myTypes/notulensi";
import { Tag } from "antd";

export const NOTULENSI_STATUS_META: Record<
  NotulensiStatus,
  { label: string; color: string }
> = {
  new: { label: "New", color: "processing" },
  in_progress: { label: "Proses", color: "gold" },
  waiting_review: { label: "Menunggu Review", color: "purple" },
  revision: { label: "Revision", color: "orange" },
  completed: { label: "Selesai", color: "success" },
  cancelled: { label: "Cancel", color: "error" },
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
  "waiting_review",
  "revision",
  "completed",
  "cancelled",
];

export function NotulensiStatusTag({ status }: { status: NotulensiStatus }) {
  const meta = NOTULENSI_STATUS_META[status];
  return <Tag color={meta.color}>{meta.label}</Tag>;
}

export function NotulensiPriorityTag({ priority }: { priority: NotulensiPriority }) {
  const meta = NOTULENSI_PRIORITY_META[priority];
  return <Tag color={meta.color}>{meta.label}</Tag>;
}
