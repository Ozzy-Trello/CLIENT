import {
  NotulensiExportResponse,
  NotulensiExportTask,
} from "@myTypes/notulensi";
import * as XLSX from "xlsx";

export const NOTULENSI_EXPORT_HEADERS = {
  Tasks: ["ID", "Code", "Title", "Content", "Status", "Progress", "Priority", "Due Date", "Creator Name", "Creator Email", "Creator Role", "Assignees", "Assignee Roles", "Created At", "Started At", "Completed At", "Cancelled At"],
  "Read Receipts": ["Task Code", "User Name", "User Role", "Opened At"],
  "Status History": ["Task Code", "From Status", "To Status", "Actor Name", "Actor Role", "Created At"],
  Comments: ["Task Code", "Content", "Author Name", "Author Role", "Created At", "Updated At"],
  Attachments: ["Task Code", "Name", "URL", "Size", "Size Unit", "MIME Type", "Uploaded By", "Uploader Role", "Created At"],
} as const;

const taskRow = (row: NotulensiExportTask) => ({
  ID: row.id,
  Code: row.code,
  Title: row.title,
  Content: row.content,
  Status: row.status,
  Progress: row.progress,
  Priority: row.priority,
  "Due Date": row.dueDate || "",
  "Creator Name": row.creatorName ?? "",
  "Creator Email": row.creatorEmail ?? "",
  "Creator Role": row.creatorRole ?? "",
  Assignees: row.assignees.join(", "),
  "Assignee Roles": row.assigneeRoles.join(", "),
  "Created At": row.createdAt,
  "Started At": row.startedAt || "",
  "Completed At": row.completedAt || "",
  "Cancelled At": row.cancelledAt || "",
});

export function createNotulensiWorkbook(payload: NotulensiExportResponse["data"]) {
  const rows = {
    Tasks: payload.tasks.map(taskRow),
    "Read Receipts": payload.readReceipts.map((row) => ({ "Task Code": row.taskCode, "User Name": row.userName ?? "", "User Role": row.userRole ?? "", "Opened At": row.openedAt })),
    "Status History": payload.statusHistory.map((row) => ({ "Task Code": row.taskCode, "From Status": row.fromStatus ?? "", "To Status": row.toStatus, "Actor Name": row.actorName ?? "", "Actor Role": row.actorRole ?? "", "Created At": row.createdAt })),
    Comments: payload.comments.map((row) => ({ "Task Code": row.taskCode, Content: row.content, "Author Name": row.authorName ?? "", "Author Role": row.authorRole ?? "", "Created At": row.createdAt, "Updated At": row.updatedAt })),
    Attachments: payload.attachments.map((row) => ({ "Task Code": row.taskCode, Name: row.name ?? "", URL: row.url ?? "", Size: row.size ?? "", "Size Unit": row.sizeUnit ?? "", "MIME Type": row.mimeType ?? "", "Uploaded By": row.uploadedBy ?? "", "Uploader Role": row.uploaderRole ?? "", "Created At": row.createdAt })),
  };
  const workbook = XLSX.utils.book_new();
  (Object.keys(NOTULENSI_EXPORT_HEADERS) as Array<keyof typeof NOTULENSI_EXPORT_HEADERS>).forEach((name) => {
    const sheet = XLSX.utils.json_to_sheet(rows[name], { header: [...NOTULENSI_EXPORT_HEADERS[name]] });
    if (name === "Attachments") {
      payload.attachments.forEach((attachment, index) => {
        if (attachment.url) sheet[`C${index + 2}`].l = { Target: attachment.url };
      });
    }
    XLSX.utils.book_append_sheet(workbook, sheet, name);
  });
  return workbook;
}
