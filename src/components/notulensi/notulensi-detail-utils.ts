import {
  NotulensiAction,
  NotulensiActivity,
  NotulensiAssignee,
  NotulensiProgress,
  NotulensiStatusHistory,
  NotulensiUser,
  NotulensiWorkflowAction,
} from "@myTypes/notulensi";
import dayjs from "dayjs";
import { linkifyHtml } from "@utils/normalize-quill-html";
import {
  extractBoardIdFromUrl,
  extractCardIdFromUrl,
  extractListIdFromUrl,
  extractWorkspaceIdFromUrl,
} from "@utils/url-parser";

export interface CardUrlInfo {
  workspaceId: string;
  boardId: string;
  cardId: string;
  listId: string | null;
  path: string;
}

export const detectCardUrl = (url?: string | null): CardUrlInfo | null => {
  if (!url) return null;
  const workspaceId = extractWorkspaceIdFromUrl(url);
  const boardId = extractBoardIdFromUrl(url);
  const cardId = extractCardIdFromUrl(url);
  if (!workspaceId || !boardId || !cardId) return null;
  const listId = extractListIdFromUrl(url);
  const listQuery = listId ? `&listId=${listId}` : "";
  return {
    workspaceId,
    boardId,
    cardId,
    listId,
    path: `/workspace/${workspaceId}/board/${boardId}?cardId=${cardId}${listQuery}`,
  };
};

export const normalizeOptionalRichText = (content?: string) => content || "";

export const hasRichTextContent = (content?: string) => {
  if (!content) return false;
  if (/<span\b[^>]*(?:data-id|class=["'][^"']*\bmention\b)/i.test(content)) return true;
  if (/<img\b[^>]*\bsrc=["'][^"']+["']/i.test(content)) return true;

  const text = content
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;|&#xA0;/gi, " ")
    .replace(/&(?:amp|lt|gt|quot|#39);/gi, "x")
    .replace(/[\s\u200B-\u200D\uFEFF]/g, "");
  return text.length > 0;
};

export const hasDisplayableRichContent = (content?: string) =>
  hasRichTextContent(content) || Boolean(content && /<(?:img|video|iframe)\b/i.test(content));

export const getAssigneeNames = (assignees: NotulensiAssignee[]) =>
  assignees.length
    ? assignees.map((assignee) => {
        if (!assignee.user) return "Unknown user";
        return assignee.user.role?.name
          ? `${assignee.user.username} (${assignee.user.role.name})`
          : assignee.user.username;
      }).join(", ")
    : "Unassigned";

export const formatNotulensiListDate = (date: string) => dayjs(date).format("DD/MM/YYYY");

export const NOTULENSI_ACTION_META: Record<
  NotulensiWorkflowAction,
  { label: string; danger?: boolean; confirmation?: { title: string; description: string } }
> = {
  start: { label: "Proses" },
  submit_review: { label: "Ajukan Review" },
  request_revision: { label: "Revisi" },
  complete: {
    label: "Selesai",
    confirmation: {
      title: "Selesai task ini?",
      description: "Tindakan ini mengakhiri workflow task.",
    },
  },
  undo_complete: {
    label: "Undone",
    confirmation: {
      title: "Undone task ini?",
      description: "Task kembali ke status sebelum Completed.",
    },
  },
  cancel: {
    label: "Cancel",
    danger: true,
    confirmation: {
      title: "Cancel task ini?",
      description: "Tindakan ini mengakhiri workflow task.",
    },
  },
};

export const getListWorkflowActions = (
  allowedActions: NotulensiAction[] = []
): NotulensiWorkflowAction[] =>
  allowedActions.filter(
    (action): action is NotulensiWorkflowAction => action !== "update_progress"
  );

export const getNotulensiUrl = (origin: string, workspaceId: string, id: string) =>
  `${origin}/workspace/${workspaceId}/notulensi/${id}`;

export const copyNotulensiLink = (
  workspaceId: string,
  id: string,
  origin = window.location.origin,
  clipboard: Pick<Clipboard, "writeText"> | undefined = navigator.clipboard
) => {
  const url = getNotulensiUrl(origin, workspaceId, id);
  if (clipboard?.writeText) return clipboard.writeText(url);

  const textarea = document.createElement("textarea");
  textarea.value = url;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    if (!document.execCommand("copy")) throw new Error("Copy command failed");
    return Promise.resolve();
  } finally {
    textarea.remove();
  }
};

export const NOTULENSI_PROGRESS_OPTIONS: { label: string; value: NotulensiProgress }[] = [
  { label: "0%", value: 0 },
  { label: "25%", value: 25 },
  { label: "50%", value: 50 },
  { label: "75%", value: 75 },
  { label: "100%", value: 100 },
];

export const MAX_NOTULENSI_ATTACHMENT_SIZE = 50 * 1024 * 1024;
export const MAX_NOTULENSI_CONTENT_TEXT_LENGTH = 100000;

export interface NotulensiTimelineEntry {
  id: string;
  kind: "status" | "activity";
  actor: NotulensiUser | null;
  description: string;
  createdAt: string;
}

const PRIORITY_LABELS: Record<string, string> = {
  reg: "Reguler",
  urgent: "Urgent",
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const asText = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
};

const formatActivityDate = (value: unknown): string =>
  value ? dayjs(String(value)).format("DD MMM YYYY") : "-";

export const describeNotulensiActivity = (activity: NotulensiActivity): string => {
  const oldValue = activity.oldValue;
  const newValue = activity.newValue;

  switch (activity.action) {
    case "comment_added":
      return asRecord(newValue).is_reply ? "membalas komentar" : "menambahkan komentar";
    case "comment_edited":
      return "mengubah komentar";
    case "comment_deleted":
      return "menghapus komentar";
    case "attachment_added":
      return `menambahkan lampiran ${asText(asRecord(newValue).name)}`;
    case "attachment_removed":
      return `menghapus lampiran ${asText(asRecord(oldValue).name)}`;
    case "attachment_renamed":
      return `mengganti nama lampiran ${asText(asRecord(oldValue).name)} menjadi ${asText(asRecord(newValue).name)}`;
    case "assignee_added":
      return `menugaskan ${asText(asRecord(newValue).username)}`;
    case "assignee_removed":
      return `melepas ${asText(asRecord(oldValue).username)}`;
    case "title_changed":
      return `mengubah judul dari "${asText(oldValue)}" menjadi "${asText(newValue)}"`;
    case "content_changed":
      return "mengubah isi task";
    case "priority_changed":
      return `mengubah prioritas dari ${PRIORITY_LABELS[String(oldValue)] ?? asText(oldValue)} menjadi ${
        PRIORITY_LABELS[String(newValue)] ?? asText(newValue)
      }`;
    case "due_date_changed":
      return `mengubah deadline dari ${formatActivityDate(oldValue)} menjadi ${formatActivityDate(newValue)}`;
    case "progress_changed":
      return `mengubah progres dari ${asText(oldValue)}% menjadi ${asText(newValue)}%`;
    default:
      return activity.action;
  }
};

/**
 * Status tinggal di tabelnya sendiri dan aktivitas lain di tabel baru, jadi
 * timeline digabung di sini. Keduanya sudah datang terurut menurun dari
 * backend; sort ulang memastikan gabungannya tetap terbaru di atas.
 */
export const buildNotulensiTimeline = (
  statusHistory: NotulensiStatusHistory[] = [],
  activities: NotulensiActivity[] = [],
  describeStatus: (entry: NotulensiStatusHistory) => string
): NotulensiTimelineEntry[] => {
  const entries: NotulensiTimelineEntry[] = [
    ...statusHistory.map((entry) => ({
      id: `status-${entry.id}`,
      kind: "status" as const,
      actor: entry.actor,
      description: describeStatus(entry),
      createdAt: entry.createdAt,
    })),
    ...activities.map((entry) => ({
      id: `activity-${entry.id}`,
      kind: "activity" as const,
      actor: entry.actor,
      description: describeNotulensiActivity(entry),
      createdAt: entry.createdAt,
    })),
  ];

  return entries.sort((a, b) => dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf());
};

export type QueuedInlineImage = { file: File; placeholderUrl: string };

export const getRichTextPlainText = (content?: string) => {
  if (!content) return "";
  const doc = new DOMParser().parseFromString(content, "text/html");
  return (doc.body.textContent || "").replace(/\u00a0/g, " ");
};

export const isNotulensiContentValid = (content?: string) =>
  getRichTextPlainText(content).length <= MAX_NOTULENSI_CONTENT_TEXT_LENGTH;

export const removeQueuedInlineImages = (
  content: string,
  images: QueuedInlineImage[]
) => replaceInlineImageUrls(content, new Map(images.map(({ placeholderUrl }) => [placeholderUrl, ""])));

export const replaceInlineImageUrls = (content: string, urls: Map<string, string>) => {
  if (!content || !urls.size) return content;
  const doc = new DOMParser().parseFromString(content, "text/html");
  doc.querySelectorAll("img").forEach((image) => {
    const replacement = urls.get(image.getAttribute("src") || "");
    if (replacement === undefined) return;
    if (replacement) image.setAttribute("src", replacement);
    else image.remove();
  });
  return doc.body.innerHTML;
};

export const getPastedFiles = (clipboardData: Pick<DataTransfer, "files" | "items">) => {
  const files = Array.from(clipboardData.files || []);
  if (files.length) return files;
  return Array.from(clipboardData.items || [])
    .filter((item) => item.kind === "file")
    .map((item) => item.getAsFile())
    .filter((file): file is File => Boolean(file));
};

export const getCommentQuote = (content?: string, maxLength = 180) => {
  const text = getRichTextPlainText(content).replace(/\s+/g, " ").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
};

export const linkifyNotulensiComment = (content: string) => {
  const doc = new DOMParser().parseFromString(linkifyHtml(content), "text/html");
  doc.querySelectorAll("a").forEach((anchor) => {
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
  });
  return doc.body.innerHTML;
};

export const validateNotulensiAttachments = (files: File[]) => ({
  accepted: files.filter((file) => file.size <= MAX_NOTULENSI_ATTACHMENT_SIZE),
  rejected: files.filter((file) => file.size > MAX_NOTULENSI_ATTACHMENT_SIZE),
});

export const uploadNotulensiAttachmentsSequentially = async (
  files: File[],
  upload: (file: File) => Promise<unknown>,
  onProgress: (current: number, total: number) => void
) => {
  let uploaded = 0;

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    onProgress(index + 1, files.length);
    try {
      await upload(file);
      uploaded += 1;
    } catch {
      // Continue so one failed upload does not block the remaining files.
    }
  }

  return { uploaded, failed: files.length - uploaded };
};
