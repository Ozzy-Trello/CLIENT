"use client";

import {
  hasStacking,
  picBreakdown,
  toDateKey,
  todayKey,
} from "@components/notulensi/notulensi-calendar-utils";
import { useNotulensiCalendar, useNotulensiEligibleAssignees } from "@hooks/notulensi";
import { Alert, Collapse, Spin } from "antd";
import { useMemo } from "react";

const DATE_FORMAT = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
});
const dateLabel = (dateKey: string) =>
  DATE_FORMAT.format(new Date(`${dateKey}T12:00:00`));

type Props = {
  workspaceId: string;
  /** Selected assignee user ids from the form. */
  assigneeIds: string[];
  /** Candidate due date (ISO or Date-compatible string); null hides the panel. */
  dueDate: string | null;
  /** When editing, the task's own id so it is not counted against itself. */
  editingTaskId?: string | null;
};

/**
 * Shown while picking a due date: each selected PIC's deadlines on that date,
 * their overdue backlog, and the projected count once this task is saved.
 * Purely informative; never blocks saving.
 */
export default function NotulensiDueDateInsight({
  workspaceId,
  assigneeIds,
  dueDate,
  editingTaskId,
}: Props) {
  const enabled = Boolean(dueDate) && assigneeIds.length > 0;
  const calendarQuery = useNotulensiCalendar(workspaceId, enabled);
  const assigneesQuery = useNotulensiEligibleAssignees(workspaceId);

  const pics = useMemo(() => {
    const users = assigneesQuery.data?.data ?? [];
    return assigneeIds
      .map((id) => users.find((user) => user.id === id))
      .filter((user): user is NonNullable<typeof user> => Boolean(user))
      .map((user) => ({ userId: user.id, username: user.username }));
  }, [assigneeIds, assigneesQuery.data]);

  const breakdowns = useMemo(() => {
    if (!dueDate) return [];
    return picBreakdown({
      tasks: calendarQuery.data?.data ?? [],
      pics,
      candidateDate: toDateKey(dueDate),
      today: todayKey(),
      editingTaskId,
    });
  }, [calendarQuery.data, pics, dueDate, editingTaskId]);

  if (!enabled) return null;
  if (calendarQuery.isLoading) return <Spin size="small" />;
  if (calendarQuery.isError) return null;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[rgb(var(--color-border))] p-3">
      <div className="text-sm font-semibold">
        {dateLabel(toDateKey(dueDate!))}
        <span className="ml-2 text-xs font-normal text-gray-500">
          Deadline & tunggakan per PIC
        </span>
      </div>

      {breakdowns.map((row) => (
        <div key={row.userId} className="rounded-lg bg-[rgb(var(--color-background))] p-2">
          <div className="flex items-center justify-between text-sm">
            <strong>{row.username}</strong>
            <span>{row.dueOnDate.length} deadline</span>
          </div>
          <div className="text-xs text-gray-500">
            Jika disimpan: {row.projectedAfterSave} deadline ·{" "}
            <span className="font-semibold text-red-600">
              {row.overdue.length} overdue
            </span>
          </div>
          {(row.dueOnDate.length > 0 || row.overdue.length > 0) && (
            <Collapse
              ghost
              size="small"
              items={[
                ...(row.dueOnDate.length
                  ? [{
                      key: "due",
                      label: "Lihat deadline",
                      children: row.dueOnDate.map((task) => (
                        <div key={task.id} className="text-xs">• {task.title}</div>
                      )),
                    }]
                  : []),
                ...(row.overdue.length
                  ? [{
                      key: "overdue",
                      label: "Lihat overdue",
                      children: row.overdue.map((task) => (
                        <div key={task.id} className="text-xs">
                          • {task.title} ({dateLabel(toDateKey(task.dueDate))})
                        </div>
                      )),
                    }]
                  : []),
              ]}
            />
          )}
        </div>
      ))}

      {hasStacking(breakdowns) && (
        <Alert
          type="warning"
          showIcon
          message="Ada penumpukan deadline pada PIC terpilih. Cek daftar pekerjaan sebelum menetapkan tanggal."
        />
      )}
      <p className="m-0 text-xs text-gray-500">
        Overdue dihitung dari hari ini. Angka deadline belum menunjukkan kapasitas kerja.
      </p>
    </div>
  );
}
