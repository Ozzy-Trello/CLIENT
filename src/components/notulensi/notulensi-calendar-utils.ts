import { NotulensiCalendarTask } from "@myTypes/notulensi";

/**
 * Pure date/grouping logic for the deadline calendar and the due-date picker.
 * All date grouping uses the browser's local timezone (Ozzy operates in WIB);
 * a task keeps its original deadline date, overdue never shifts to "today".
 */

export const toDateKey = (value: string | Date): string => {
  const date = value instanceof Date ? value : new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const toMonthKey = (dateKey: string): string => dateKey.slice(0, 7);

export const todayKey = (): string => toDateKey(new Date());

export const addMonths = (monthKey: string, count: number): string => {
  const [year, month] = monthKey.split("-").map(Number);
  const total = year * 12 + (month - 1) + count;
  const nextYear = Math.floor(total / 12);
  const nextMonth = (total % 12) + 1;
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}`;
};

export interface CalendarCell {
  dateKey: string | null;
  dayNumber: number | null;
}

/** Monday-first grid, padded to full weeks; null cells are out-of-month. */
export const monthGrid = (monthKey: string): CalendarCell[] => {
  const [year, month] = monthKey.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const offset = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  const total = Math.ceil((offset + daysInMonth) / 7) * 7;

  return Array.from({ length: total }, (_, index) => {
    const day = index - offset + 1;
    if (day < 1 || day > daysInMonth) return { dateKey: null, dayNumber: null };
    return {
      dateKey: `${monthKey}-${String(day).padStart(2, "0")}`,
      dayNumber: day,
    };
  });
};

export const filterByPic = (
  tasks: NotulensiCalendarTask[],
  picUserId: string | "all"
): NotulensiCalendarTask[] =>
  picUserId === "all"
    ? tasks
    : tasks.filter((task) =>
        task.assignees.some((assignee) => assignee.userId === picUserId)
      );

/** One task counts once per date, however many assignees it has. */
export const countsByDate = (
  tasks: NotulensiCalendarTask[]
): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const task of tasks) {
    const key = toDateKey(task.dueDate);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
};

export interface CalendarSummary {
  overdue: NotulensiCalendarTask[];
  inMonth: NotulensiCalendarTask[];
  future: NotulensiCalendarTask[];
}

/**
 * Overdue: active tasks strictly before today, whatever month they sit in.
 * inMonth: tasks due inside the displayed month, past dates included, so it
 * can overlap with overdue. future: after the displayed month, sorted.
 */
export const summarize = (
  tasks: NotulensiCalendarTask[],
  displayedMonth: string,
  today: string
): CalendarSummary => {
  const withKeys = tasks.map((task) => ({ task, key: toDateKey(task.dueDate) }));
  const byDate = (a: { key: string }, b: { key: string }) =>
    a.key.localeCompare(b.key);

  return {
    overdue: withKeys.filter(({ key }) => key < today).sort(byDate).map(({ task }) => task),
    inMonth: withKeys
      .filter(({ key }) => toMonthKey(key) === displayedMonth)
      .sort(byDate)
      .map(({ task }) => task),
    future: withKeys
      .filter(({ key }) => toMonthKey(key) > displayedMonth)
      .sort(byDate)
      .map(({ task }) => task),
  };
};

export const tasksOnDate = (
  tasks: NotulensiCalendarTask[],
  dateKey: string
): NotulensiCalendarTask[] =>
  tasks.filter((task) => toDateKey(task.dueDate) === dateKey);

export interface PicBreakdown {
  userId: string;
  username: string;
  dueOnDate: NotulensiCalendarTask[];
  overdue: NotulensiCalendarTask[];
  projectedAfterSave: number;
}

/**
 * Per-PIC panel for the due-date picker. Overdue is measured against today,
 * not the candidate date. projectedAfterSave = current deadlines + 1, unless
 * the task being edited is already due on that date (avoid double count).
 */
export const picBreakdown = (params: {
  tasks: NotulensiCalendarTask[];
  pics: Array<{ userId: string; username: string }>;
  candidateDate: string;
  today: string;
  editingTaskId?: string | null;
}): PicBreakdown[] => {
  const { tasks, pics, candidateDate, today, editingTaskId } = params;

  return pics.map((pic) => {
    const mine = tasks.filter((task) =>
      task.assignees.some((assignee) => assignee.userId === pic.userId)
    );
    const dueOnDate = mine.filter(
      (task) => toDateKey(task.dueDate) === candidateDate
    );
    const overdue = mine.filter(
      (task) => toDateKey(task.dueDate) < today && task.id !== editingTaskId
    );
    const editingAlreadyCounted = dueOnDate.some(
      (task) => task.id === editingTaskId
    );

    return {
      userId: pic.userId,
      username: pic.username,
      dueOnDate,
      overdue,
      projectedAfterSave: dueOnDate.length + (editingAlreadyCounted ? 0 : 1),
    };
  });
};

/** Prototype's stacking notice: some selected PIC already has >= 3 tasks that day. */
export const STACKING_THRESHOLD = 3;

export const hasStacking = (breakdowns: PicBreakdown[]): boolean =>
  breakdowns.some((item) => item.dueOnDate.length >= STACKING_THRESHOLD);
