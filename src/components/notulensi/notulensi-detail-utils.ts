import { NotulensiAction, NotulensiAssignee, NotulensiProgress, NotulensiWorkflowAction } from "@myTypes/notulensi";

export const normalizeOptionalRichText = (content?: string) => content || "";

export const hasRichTextContent = (content?: string) => {
  if (!content) return false;
  if (/<span\b[^>]*(?:data-id|class=["'][^"']*\bmention\b)/i.test(content)) return true;

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
    ? assignees.map((assignee) => assignee.user?.username || "Unknown user").join(", ")
    : "Unassigned";

export const NOTULENSI_ACTION_META: Record<
  NotulensiWorkflowAction,
  { label: string; danger?: boolean; confirmation?: { title: string; description: string } }
> = {
  start: { label: "Proses" },
  submit_review: { label: "Menunggu Review" },
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

const LIST_WORKFLOW_ACTIONS = new Set<NotulensiWorkflowAction>([
  "request_revision",
  "complete",
  "cancel",
]);

export const getListWorkflowActions = (
  allowedActions: NotulensiAction[] = []
): NotulensiWorkflowAction[] =>
  allowedActions.filter(
    (action): action is NotulensiWorkflowAction =>
      action !== "update_progress" && LIST_WORKFLOW_ACTIONS.has(action)
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
