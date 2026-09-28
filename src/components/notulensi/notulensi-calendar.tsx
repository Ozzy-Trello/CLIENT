"use client";

import { NotulensiStatusLabel } from "@components/notulensi/notulensi-status";
import {
  addMonths,
  countsByDate,
  monthGrid,
  summarize,
  tasksOnDate,
  toDateKey,
  toMonthKey,
  todayKey,
} from "@components/notulensi/notulensi-calendar-utils";
import { useCurrentAccount } from "@hooks/account";
import { useNotulensiCalendar, useNotulensiEligibleAssignees } from "@hooks/notulensi";
import { NotulensiCalendarTask, NotulensiScope } from "@myTypes/notulensi";
import { Alert, Button, Select, Spin } from "antd";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

const MONTH_FORMAT = new Intl.DateTimeFormat("id-ID", {
  month: "long",
  year: "numeric",
});
const DATE_FORMAT = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const monthLabel = (monthKey: string) =>
  MONTH_FORMAT.format(new Date(`${monthKey}-01T12:00:00`));
const dateLabel = (dateKey: string) =>
  DATE_FORMAT.format(new Date(`${dateKey}T12:00:00`));

type SummaryView = "late" | "current" | "future";

function TaskLine({
  task,
  workspaceId,
  today,
}: {
  task: NotulensiCalendarTask;
  workspaceId: string;
  today: string;
}) {
  const key = toDateKey(task.dueDate);
  return (
    <Link
      href={`/workspace/${workspaceId}/notulensi/${task.id}`}
      className="block rounded-lg border border-[rgb(var(--color-border))] px-3 py-2 hover:border-blue-400"
    >
      <div className="truncate text-sm font-medium text-[rgb(var(--color-text-primary))]">
        {task.title}
      </div>
      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-gray-500">
        <span>{dateLabel(key)}</span>
        <span>·</span>
        <span className="truncate">
          {task.assignees.map((assignee) => assignee.username).filter(Boolean).join(", ") || "-"}
        </span>
        <NotulensiStatusLabel status={task.status} />
      </div>
      {task.creatorUsername && (
        <div className="mt-0.5 text-xs text-gray-500">
          Dibuat oleh {task.creatorUsername}
        </div>
      )}
      {key < today && (
        <div className="mt-0.5 text-xs font-semibold text-red-600">
          Overdue · deadline asli
        </div>
      )}
    </Link>
  );
}

const scopeOptions: { value: NotulensiScope; label: string }[] = [
  { value: "related", label: "All Related" },
  { value: "created", label: "Created by me" },
  { value: "assigned", label: "Assigned to me" },
  { value: "all", label: "All workspace" },
];

export default function NotulensiCalendar({ workspaceId }: { workspaceId: string }) {
  const today = todayKey();
  const [month, setMonth] = useState(() => toMonthKey(today));
  const [selectedDate, setSelectedDate] = useState(today);
  const [view, setView] = useState<SummaryView>("current");
  // Same filter model as the list: scope defaults to All Related, assignees
  // blank. Picking assignees widens visibility server-side so any member can
  // inspect another PIC's workload.
  const [scope, setScope] = useState<NotulensiScope>("related");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);

  const { data: accountData } = useCurrentAccount();
  const allowAll = accountData?.data?.role?.name === "Super Admin";

  const calendarQuery = useNotulensiCalendar(workspaceId, true, {
    scope: assigneeIds.length ? undefined : scope,
    assigneeIds,
  });
  const assigneesQuery = useNotulensiEligibleAssignees(workspaceId);

  const tasks = useMemo(
    () => calendarQuery.data?.data ?? [],
    [calendarQuery.data]
  );
  const counts = useMemo(() => countsByDate(tasks), [tasks]);
  const summary = useMemo(
    () => summarize(tasks, month, today),
    [tasks, month, today]
  );
  const grid = useMemo(() => monthGrid(month), [month]);

  const assigneeOptions = useMemo(
    () =>
      (assigneesQuery.data?.data ?? []).map((user) => ({
        value: user.id,
        label: user.username,
      })),
    [assigneesQuery.data]
  );

  if (calendarQuery.isError) {
    return (
      <Alert
        type="error"
        showIcon
        message="Gagal memuat kalender deadline"
        action={<Button onClick={() => calendarQuery.refetch()}>Retry</Button>}
      />
    );
  }

  const goToMonth = (nextMonth: string) => {
    setMonth(nextMonth);
    setSelectedDate(nextMonth === toMonthKey(today) ? today : `${nextMonth}-01`);
    setView("current");
  };

  const detailTasks =
    view === "late"
      ? summary.overdue
      : view === "future"
        ? summary.future
        : tasksOnDate(tasks, selectedDate);

  const summaryCards: Array<{
    key: SummaryView;
    label: string;
    count: number;
    caption: string;
    accent?: string;
  }> = [
    {
      key: "late",
      label: "Overdue belum selesai",
      count: summary.overdue.length,
      caption: "Termasuk bulan sebelumnya",
      accent: "text-red-600",
    },
    {
      key: "current",
      label: "Deadline bulan ditampilkan",
      count: summary.inMonth.length,
      caption: monthLabel(month),
    },
    {
      key: "future",
      label: "Bulan mendatang",
      count: summary.future.length,
      caption: "Setelah bulan ditampilkan",
    },
  ];

  let lastFutureMonth = "";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={scope}
          options={scopeOptions.filter(
            (option) => option.value !== "all" || allowAll
          )}
          onChange={setScope}
          disabled={assigneeIds.length > 0}
          className="min-w-[160px]"
          aria-label="Scope"
        />
        <Select
          mode="multiple"
          value={assigneeIds}
          options={assigneeOptions}
          onChange={setAssigneeIds}
          loading={assigneesQuery.isLoading}
          placeholder="Assignees"
          className="min-w-[220px]"
          showSearch
          optionFilterProp="label"
          allowClear
          aria-label="Filter assignees"
        />
        <span className="text-xs text-gray-500">
          Memilih assignees menampilkan seluruh task PIC tersebut.
        </span>
        {calendarQuery.isFetching && <Spin size="small" />}
      </div>



      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" aria-label="Ringkasan pekerjaan">
        {summaryCards.map((card) => (
          <button
            key={card.key}
            type="button"
            onClick={() => setView(card.key)}
            className={`rounded-xl border bg-[rgb(var(--color-surface))] p-3 text-left transition-shadow ${
              view === card.key
                ? "border-blue-600 shadow-[inset_0_0_0_1px_rgb(37,99,235)]"
                : "border-[rgb(var(--color-border))] hover:border-slate-400"
            }`}
          >
            <span className="text-sm text-[rgb(var(--color-text-primary))]">{card.label}</span>
            <b className={`block text-2xl ${card.accent ?? ""}`}>{card.count}</b>
            <span className="text-xs text-gray-500">{card.caption}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          icon={<ChevronLeft size={16} />}
          aria-label="Bulan sebelumnya"
          onClick={() => goToMonth(addMonths(month, -1))}
        />
        <h3 className="m-0 min-w-[150px] text-center text-base font-semibold">
          {monthLabel(month)}
        </h3>
        <Button
          icon={<ChevronRight size={16} />}
          aria-label="Bulan berikutnya"
          onClick={() => goToMonth(addMonths(month, 1))}
        />
        <Button onClick={() => goToMonth(toMonthKey(today))}>Bulan ini</Button>
        <input
          type="month"
          value={month}
          aria-label="Pilih bulan dan tahun"
          onChange={(event) => {
            if (/^\d{4}-\d{2}$/.test(event.target.value)) {
              goToMonth(event.target.value);
            }
          }}
          className="rounded-lg border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] px-2 py-1"
        />
        <span className="text-xs text-gray-500">Klik tanggal untuk melihat task.</span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <div className="mb-1 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-500">
            {WEEKDAYS.map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {grid.map((cell, index) =>
              cell.dateKey ? (
                <button
                  key={cell.dateKey}
                  type="button"
                  aria-pressed={selectedDate === cell.dateKey}
                  aria-label={`${dateLabel(cell.dateKey)}, ${counts.get(cell.dateKey) ?? 0} task jatuh tempo`}
                  onClick={() => {
                    setSelectedDate(cell.dateKey!);
                    setView("current");
                  }}
                  className={`flex min-h-16 flex-col items-start gap-1 rounded-lg border p-1.5 text-left ${
                    selectedDate === cell.dateKey
                      ? "border-blue-600 shadow-[inset_0_0_0_1px_rgb(37,99,235)]"
                      : "border-[rgb(var(--color-border))] hover:border-slate-400"
                  } ${cell.dateKey === today ? "bg-blue-50" : "bg-[rgb(var(--color-surface))]"}`}
                >
                  <span className="text-xs font-semibold">{cell.dayNumber}</span>
                  {(counts.get(cell.dateKey) ?? 0) > 0 && (
                    <span
                      className={`rounded px-1 text-[11px] font-semibold text-white ${
                        cell.dateKey < today ? "bg-red-500" : "bg-blue-600"
                      }`}
                    >
                      {counts.get(cell.dateKey)} task
                    </span>
                  )}
                </button>
              ) : (
                <span key={`empty-${index}`} aria-hidden="true" />
              )
            )}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Task tetap berada pada tanggal deadline aslinya. Overdue lama juga muncul dalam ringkasan.
          </p>
        </div>

        <aside aria-live="polite" className="flex flex-col gap-2">
          <h3 className="m-0 text-base font-semibold">
            {view === "late"
              ? "Overdue belum selesai"
              : view === "future"
                ? "Bulan mendatang"
                : dateLabel(selectedDate)}
          </h3>
          <div className="text-xs text-gray-500">
            {detailTasks.length} task ·{" "}
            {assigneeIds.length
              ? assigneeIds
                  .map((id) => assigneeOptions.find((option) => option.value === id)?.label)
                  .filter(Boolean)
                  .join(", ")
              : scopeOptions.find((option) => option.value === scope)?.label}
          </div>
          {calendarQuery.isLoading ? (
            <Spin />
          ) : detailTasks.length ? (
            detailTasks.map((task) => {
              const taskMonth = toMonthKey(toDateKey(task.dueDate));
              const showGroup = view === "future" && taskMonth !== lastFutureMonth;
              lastFutureMonth = taskMonth;
              return (
                <div key={task.id}>
                  {showGroup && (
                    <div className="mb-1 mt-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {monthLabel(taskMonth)}
                    </div>
                  )}
                  <TaskLine task={task} workspaceId={workspaceId} today={today} />
                </div>
              );
            })
          ) : (
            <p className="text-xs text-gray-500">Belum ada task dalam daftar ini.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
