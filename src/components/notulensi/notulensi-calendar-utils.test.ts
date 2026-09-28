import {
  addMonths,
  countsByDate,
  filterByAnyPic,
  filterByPic,
  hasStacking,
  monthGrid,
  picBreakdown,
  summarize,
  toDateKey,
} from "./notulensi-calendar-utils";
import { NotulensiCalendarTask } from "@myTypes/notulensi";

const task = (
  id: string,
  dueDate: string,
  assignees: Array<[string, string]>
): NotulensiCalendarTask => ({
  id,
  code: `NTL-${id}`,
  title: `Task ${id}`,
  status: "in_progress",
  priority: "reg",
  dueDate,
  assignees: assignees.map(([userId, username]) => ({ userId, username })),
});

// Mirrors the prototype's sample data around 2026-10-19.
const TODAY = "2026-10-19";
const TASKS = [
  task("1", "2026-09-20T10:00:00", [["wahyu", "Wahyu"], ["rifqi", "Rifqi"]]),
  task("2", "2026-09-29T10:00:00", [["wahyu", "Wahyu"]]),
  task("3", "2026-10-15T10:00:00", [["rifqi", "Rifqi"]]),
  task("4", "2026-10-20T10:00:00", [["wahyu", "Wahyu"], ["rifqi", "Rifqi"]]),
  task("5", "2026-10-20T10:00:00", [["wahyu", "Wahyu"]]),
  task("6", "2026-10-20T10:00:00", [["wahyu", "Wahyu"]]),
  task("7", "2026-10-20T10:00:00", [["wahyu", "Wahyu"]]),
  task("11", "2026-11-03T10:00:00", [["wahyu", "Wahyu"], ["henry", "Henry"]]),
  task("13", "2026-12-04T10:00:00", [["henry", "Henry"]]),
];

describe("date and month helpers", () => {
  it("groups by local date and crosses year boundaries", () => {
    expect(toDateKey("2026-10-20T10:00:00")).toBe("2026-10-20");
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
  });

  it("builds a Monday-first grid padded to full weeks", () => {
    const grid = monthGrid("2026-10");
    // 1 Oct 2026 is a Thursday: three leading nulls.
    expect(grid.slice(0, 4).map((cell) => cell.dayNumber)).toEqual([null, null, null, 1]);
    expect(grid.length % 7).toBe(0);
    expect(grid.filter((cell) => cell.dateKey).length).toBe(31);
  });
});

describe("summary counts (prototype scenarios)", () => {
  it("overdue includes previous months; month view includes past dates; future groups after the month", () => {
    const { overdue, inMonth, future } = summarize(TASKS, "2026-10", TODAY);
    expect(overdue.map((item) => item.id)).toEqual(["1", "2", "3"]);
    expect(inMonth.map((item) => item.id)).toEqual(["3", "4", "5", "6", "7"]);
    expect(future.map((item) => item.id)).toEqual(["11", "13"]);
  });

  it("a multi-assignee task counts once on the combined calendar but appears for each PIC", () => {
    expect(countsByDate(TASKS).get("2026-10-20")).toBe(4);
    expect(countsByDate(filterByPic(TASKS, "wahyu")).get("2026-10-20")).toBe(4);
    expect(countsByDate(filterByPic(TASKS, "rifqi")).get("2026-10-20")).toBe(1);
  });

  it("picker grid counts a task once even when several selected PICs share it", () => {
    // Task 4 belongs to both Wahyu and Rifqi: still one entry on 20 Oct.
    const combined = countsByDate(filterByAnyPic(TASKS, ["wahyu", "rifqi"]));
    expect(combined.get("2026-10-20")).toBe(4);
    expect(combined.get("2026-09-20")).toBe(1);
    expect(countsByDate(filterByAnyPic(TASKS, ["henry"])).get("2026-10-20")).toBeUndefined();
    expect(filterByAnyPic(TASKS, [])).toEqual([]);
  });
});

describe("picker breakdown", () => {
  const pics = [
    { userId: "wahyu", username: "Wahyu" },
    { userId: "rifqi", username: "Rifqi" },
  ];

  it("shows per-PIC deadlines, overdue against today, and +1 projection", () => {
    const rows = picBreakdown({
      tasks: TASKS,
      pics,
      candidateDate: "2026-10-20",
      today: TODAY,
    });
    const wahyu = rows.find((row) => row.userId === "wahyu")!;
    const rifqi = rows.find((row) => row.userId === "rifqi")!;

    expect(wahyu.dueOnDate).toHaveLength(4);
    expect(wahyu.overdue.map((item) => item.id)).toEqual(["1", "2"]);
    expect(wahyu.projectedAfterSave).toBe(5);
    expect(rifqi.dueOnDate).toHaveLength(1);
    expect(rifqi.projectedAfterSave).toBe(2);
  });

  it("does not double-count the task being edited", () => {
    const rows = picBreakdown({
      tasks: TASKS,
      pics,
      candidateDate: "2026-10-20",
      today: TODAY,
      editingTaskId: "4",
    });
    const wahyu = rows.find((row) => row.userId === "wahyu")!;
    // Task 4 already sits on the date: saving it again adds nothing.
    expect(wahyu.projectedAfterSave).toBe(4);
  });

  it("excludes the edited task from its own overdue list", () => {
    const rows = picBreakdown({
      tasks: TASKS,
      pics: [{ userId: "wahyu", username: "Wahyu" }],
      candidateDate: "2026-10-25",
      today: TODAY,
      editingTaskId: "1",
    });
    expect(rows[0].overdue.map((item) => item.id)).toEqual(["2"]);
  });

  it("warns at three or more tasks on the chosen date, never below", () => {
    const rows = picBreakdown({
      tasks: TASKS,
      pics,
      candidateDate: "2026-10-20",
      today: TODAY,
    });
    expect(hasStacking(rows)).toBe(true);

    const calm = picBreakdown({
      tasks: TASKS,
      pics,
      candidateDate: "2026-10-15",
      today: TODAY,
    });
    expect(hasStacking(calm)).toBe(false);
  });
});
