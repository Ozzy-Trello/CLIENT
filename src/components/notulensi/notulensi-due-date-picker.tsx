"use client";

import {
  countsByDate,
  filterByAnyPic,
  toDateKey,
  todayKey,
} from "@components/notulensi/notulensi-calendar-utils";
import { useNotulensiCalendar } from "@hooks/notulensi";
import { DatePicker } from "antd";
import type { DatePickerProps } from "antd";
import { Dayjs } from "dayjs";
import { useMemo } from "react";

type Props = DatePickerProps & {
  workspaceId: string;
  /** Selected assignee user ids; counts reflect only these PICs. */
  assigneeIds: string[];
  /** When editing, exclude the task itself from its own counts. */
  editingTaskId?: string | null;
};

/**
 * Due-date picker with workload numbers in the calendar cells: each date
 * shows how many active tasks the selected PICs already have due there.
 * One task with several selected PICs counts once; the per-PIC split lives
 * in the insight panel next to the form.
 */
export default function NotulensiDueDatePicker({
  workspaceId,
  assigneeIds,
  editingTaskId,
  ...pickerProps
}: Props) {
  const enabled = assigneeIds.length > 0;
  const calendarQuery = useNotulensiCalendar(workspaceId, enabled);
  const today = todayKey();

  const counts = useMemo(() => {
    if (!enabled) return new Map<string, number>();
    const tasks = (calendarQuery.data?.data ?? []).filter(
      (task) => task.id !== editingTaskId
    );
    return countsByDate(filterByAnyPic(tasks, assigneeIds));
  }, [enabled, calendarQuery.data, assigneeIds, editingTaskId]);

  const cellRender: DatePickerProps["cellRender"] = (current, info) => {
    if (info.type !== "date") return info.originNode;
    const dateKey = toDateKey((current as Dayjs).toDate());
    const count = counts.get(dateKey) ?? 0;

    return (
      <div className="ant-picker-cell-inner !flex !h-auto min-h-[34px] flex-col items-center !leading-tight">
        <span>{(current as Dayjs).date()}</span>
        <span
          aria-label={count ? `${count} task jatuh tempo` : undefined}
          className={`block text-[9px] font-semibold ${
            count === 0
              ? "invisible"
              : dateKey < today
                ? "text-red-500"
                : "text-blue-600"
          }`}
        >
          {count || 0} task
        </span>
      </div>
    );
  };

  return <DatePicker {...pickerProps} cellRender={cellRender} />;
}
