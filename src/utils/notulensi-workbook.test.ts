import * as XLSX from "xlsx";
import { createNotulensiWorkbook, NOTULENSI_EXPORT_HEADERS } from "./notulensi-workbook";

describe("notulensi workbook", () => {
  const payload = {
    tasks: [{
      id: "task-1", code: "N-1", title: "Prepare report", content: "Compile July metrics",
      status: "completed" as const, progress: 100 as const, priority: "urgent" as const,
      dueDate: "2026-07-30T09:00:00.000Z", creatorName: "Alya", creatorEmail: "alya@example.com",
      creatorRole: "Manager", assignees: ["Bima", "Citra"], assigneeRoles: ["Analyst", "Reviewer"],
      createdAt: "2026-07-28T08:00:00.000Z", startedAt: "2026-07-28T09:00:00.000Z",
      completedAt: "2026-07-30T08:30:00.000Z", cancelledAt: null,
      privateNote: "private-note", projectType: "secret-project", reminderToken: "reminder-secret",
      securityLevel: "restricted",
    }],
    readReceipts: [{ taskCode: "N-1", userName: "Dewi", userRole: "Director", openedAt: "2026-07-29T10:00:00.000Z" }],
    statusHistory: [{ taskCode: "N-1", fromStatus: "in_progress" as const, toStatus: "completed" as const, actorName: "Alya", actorRole: "Manager", createdAt: "2026-07-30T08:30:00.000Z" }],
    comments: [{ taskCode: "N-1", content: "Approved", authorName: "Dewi", authorRole: "Director", createdAt: "2026-07-30T08:00:00.000Z", updatedAt: "2026-07-30T08:05:00.000Z" }],
    attachments: [{ taskCode: "N-1", name: "report.xlsx", url: "https://files.example.com/report.xlsx", size: 42, sizeUnit: "KB", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", uploadedBy: "Bima", uploaderRole: "Analyst", createdAt: "2026-07-29T12:00:00.000Z" }],
  };

  it("maps every backend export field into exact allowlisted sheets", () => {
    const workbook = createNotulensiWorkbook(payload);

    expect(workbook.SheetNames).toEqual([
      "Tasks",
      "Read Receipts",
      "Status History",
      "Comments",
      "Attachments",
    ]);
    expect(XLSX.utils.sheet_to_json(workbook.Sheets.Tasks, { header: 1 })).toEqual([
      NOTULENSI_EXPORT_HEADERS.Tasks,
      ["task-1", "N-1", "Prepare report", "Compile July metrics", "completed", 100, "urgent", "2026-07-30T09:00:00.000Z", "Alya", "alya@example.com", "Manager", "Bima, Citra", "Analyst, Reviewer", "2026-07-28T08:00:00.000Z", "2026-07-28T09:00:00.000Z", "2026-07-30T08:30:00.000Z", ""],
    ]);
    expect(XLSX.utils.sheet_to_json(workbook.Sheets["Read Receipts"], { header: 1 })).toEqual([
      NOTULENSI_EXPORT_HEADERS["Read Receipts"], ["N-1", "Dewi", "Director", "2026-07-29T10:00:00.000Z"],
    ]);
    expect(XLSX.utils.sheet_to_json(workbook.Sheets["Status History"], { header: 1 })).toEqual([
      NOTULENSI_EXPORT_HEADERS["Status History"], ["N-1", "in_progress", "completed", "Alya", "Manager", "2026-07-30T08:30:00.000Z"],
    ]);
    expect(XLSX.utils.sheet_to_json(workbook.Sheets.Comments, { header: 1 })).toEqual([
      NOTULENSI_EXPORT_HEADERS.Comments, ["N-1", "Approved", "Dewi", "Director", "2026-07-30T08:00:00.000Z", "2026-07-30T08:05:00.000Z"],
    ]);
    expect(XLSX.utils.sheet_to_json(workbook.Sheets.Attachments, { header: 1 })).toEqual([
      NOTULENSI_EXPORT_HEADERS.Attachments, ["N-1", "report.xlsx", "https://files.example.com/report.xlsx", 42, "KB", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Bima", "Analyst", "2026-07-29T12:00:00.000Z"],
    ]);
    expect(workbook.Sheets.Attachments.C2.l).toEqual({
      Target: "https://files.example.com/report.xlsx",
    });
    expect(Object.values(workbook.Sheets).flatMap((sheet) => (XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][]).flat())).not.toEqual(expect.arrayContaining(["private-note", "secret-project", "reminder-secret", "restricted"]));
  });

  it("keeps exact headers when every dataset is empty", () => {
    const workbook = createNotulensiWorkbook({ tasks: [], readReceipts: [], statusHistory: [], comments: [], attachments: [] });
    for (const name of workbook.SheetNames) {
      expect(XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1 })).toEqual([
        NOTULENSI_EXPORT_HEADERS[name as keyof typeof NOTULENSI_EXPORT_HEADERS],
      ]);
    }
  });

  it("writes nullable backend export fields as blank cells", () => {
    const workbook = createNotulensiWorkbook({
      ...payload,
      tasks: [{ ...payload.tasks[0], creatorName: null, creatorEmail: null, creatorRole: null }],
      readReceipts: [{ ...payload.readReceipts[0], userName: null, userRole: null }],
      statusHistory: [{ ...payload.statusHistory[0], actorName: null, actorRole: null }],
      comments: [{ ...payload.comments[0], authorName: null, authorRole: null }],
      attachments: [{ ...payload.attachments[0], name: null, url: null, size: null, sizeUnit: null, mimeType: null, uploadedBy: null, uploaderRole: null }],
    });

    expect(XLSX.utils.sheet_to_json(workbook.Sheets.Tasks, { header: 1 })[1]).toEqual(
      expect.arrayContaining([""])
    );
    expect(XLSX.utils.sheet_to_json(workbook.Sheets.Attachments, { header: 1 })[1]).toEqual([
      "N-1", "", "", "", "", "", "", "", "2026-07-29T12:00:00.000Z",
    ]);
  });
});
