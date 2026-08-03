import { NotulensiProgress, NotulensiWorkflowAction } from "@myTypes/notulensi";

export const NOTULENSI_ACTION_META: Record<
  NotulensiWorkflowAction,
  { label: string; danger?: boolean; confirmation?: { title: string; description: string } }
> = {
  start: { label: "Proses" },
  submit_review: { label: "Menunggu Review" },
  request_revision: { label: "Revision" },
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

export const NOTULENSI_PROGRESS_OPTIONS: { label: string; value: NotulensiProgress }[] = [
  { label: "0%", value: 0 },
  { label: "25%", value: 25 },
  { label: "50%", value: 50 },
  { label: "75%", value: 75 },
  { label: "100%", value: 100 },
];
