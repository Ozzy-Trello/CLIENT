"use client";

import RichTextEditor from "@components/rich-text-editor";
import AttachmentPreviewModal from "@components/attachment-preview-modal";
import ChecklistComponent from "@components/checklist";
import {
  NotulensiPriorityTag,
  NotulensiStatusTag,
  NOTULENSI_STATUS_META,
} from "@components/notulensi/notulensi-status";
import {
  NOTULENSI_ACTION_META,
  MAX_NOTULENSI_ATTACHMENT_SIZE,
  NOTULENSI_PROGRESS_OPTIONS,
  copyNotulensiLink,
  getCommentQuote,
  getPastedFiles,
  getAssigneeNames,
  hasDisplayableRichContent,
  hasRichTextContent,
  linkifyNotulensiComment,
  uploadNotulensiAttachmentsSequentially,
  validateNotulensiAttachments,
} from "@components/notulensi/notulensi-detail-utils";
import {
  useCreateNotulensiComment,
  useDeleteNotulensiComment,
  useDeleteNotulensi,
  useDeleteNotulensiAttachment,
  useDeleteNotulensiPrivateNote,
  useNotulensiPrivateNote,
  useNotulensiMentionUsers,
  useNotulensiAction,
  useRenameNotulensiAttachment,
  useRefreshNotulensi,
  useUpdateNotulensiProgress,
  useUpdateNotulensi,
  useUpdateNotulensiComment,
  useUpdateNotulensiPrivateNote,
  useUploadNotulensiAttachment,
} from "@hooks/notulensi";
import NotulensiUserSelect from "@components/notulensi/notulensi-user-select";
import { useCurrentAccount } from "@hooks/account";
import { CardAttachment, EnumAttachmentType, EnumCardAttachmentType } from "@myTypes/card";
import { NotulensiComment, NotulensiDetail, NotulensiProgress, NotulensiWorkflowAction } from "@myTypes/notulensi";
import { buildFileProxyUrl } from "@utils/file-url";
import {
  isImageFile,
  isPDFFile,
  isVideoFile,
} from "@app/workspace/[workspaceId]/board/[boardId]/card-details/attachment-helpers";
import {
  Alert,
  Button,
  Image,
  Input,
  Popconfirm,
  Result,
  Skeleton,
  Space,
  Tabs,
  Timeline,
  Typography,
  Progress,
  Select,
  message,
} from "antd";
import { AxiosError } from "axios";
import dayjs from "dayjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Copy, Download, ExternalLink, ListChecks, Paperclip, Pencil, Trash2, Upload, X } from "lucide-react";
import { ChangeEvent, ClipboardEvent, DragEvent, useEffect, useRef, useState } from "react";

type Props = {
  workspaceId: string;
  detail?: NotulensiDetail;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof AxiosError) {
    return (
      (error.response?.data as { message?: string } | undefined)?.message ||
      error.message ||
      fallback
    );
  }
  return fallback;
};

export default function NotulensiDetailView({
  workspaceId,
  detail,
  loading,
  error,
  onRetry,
}: Props) {
  const { data: currentAccountData } = useCurrentAccount();
  const currentUser = currentAccountData?.data;
  const isSuperAdmin = currentUser?.role?.name === "Super Admin";
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<NotulensiComment | null>(null);
  const [privateNoteDraft, setPrivateNoteDraft] = useState("");
  const [pendingAction, setPendingAction] = useState<NotulensiWorkflowAction | null>(null);
  const [isDraggingAttachment, setIsDraggingAttachment] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [renamingAttachmentId, setRenamingAttachmentId] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState("");
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewInitialIndex, setPreviewInitialIndex] = useState(0);
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const isUploadingAttachments = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const actionMutation = useNotulensiAction();
  const progressMutation = useUpdateNotulensiProgress();
  const updateNotulensiMutation = useUpdateNotulensi();
  const createCommentMutation = useCreateNotulensiComment();
  const updateCommentMutation = useUpdateNotulensiComment();
  const deleteCommentMutation = useDeleteNotulensiComment();
  const updatePrivateNoteMutation = useUpdateNotulensiPrivateNote();
  const deletePrivateNoteMutation = useDeleteNotulensiPrivateNote();
  const uploadAttachmentMutation = useUploadNotulensiAttachment();
  const refreshNotulensi = useRefreshNotulensi();
  const deleteAttachmentMutation = useDeleteNotulensiAttachment();
  const renameAttachmentMutation = useRenameNotulensiAttachment();
  const deleteNotulensiMutation = useDeleteNotulensi();
  const privateNoteQuery = useNotulensiPrivateNote(workspaceId, detail?.id || "");
  const mentionUsersQuery = useNotulensiMentionUsers(workspaceId);
  const mentionUsers = mentionUsersQuery.data?.data || [];

  useEffect(() => {
    setAssigneeIds(detail?.assignees.map((assignee) => assignee.userId) || []);
  }, [detail?.id, detail?.updatedAt]);

  const privateNote = privateNoteQuery.data?.data ?? detail?.privateNote ?? null;

  const previewableAttachments: CardAttachment[] = (detail?.attachments || [])
    .filter((attachment) => {
      const name = attachment.name || "";
      const mimeType = attachment.mimeType || undefined;
      return Boolean(
        attachment.url &&
        (isImageFile(name, mimeType) || isPDFFile(name, mimeType) || isVideoFile(name, mimeType))
      );
    })
    .map((attachment) => ({
      id: attachment.id,
      isCover: false,
      cardId: "",
      attachableType: EnumAttachmentType.File,
      attachableId: attachment.fileId,
      type: EnumCardAttachmentType.Attachment,
      createdAt: attachment.createdAt,
      file: {
        id: attachment.fileId,
        name: attachment.name || "Unnamed attachment",
        url: attachment.url || "",
        size: attachment.size || 0,
        sizeUnit: attachment.sizeUnit || "",
        mimeType: attachment.mimeType || "",
        createdBy: attachment.uploadedBy,
        createdAt: attachment.createdAt,
      },
    }));

  useEffect(() => {
    setPrivateNoteDraft(privateNote?.content || "");
  }, [privateNote?.content]);

  if (loading) {
    return <Skeleton active paragraph={{ rows: 10 }} />;
  }

  if (error || !detail) {
    return (
      <Result
        status="error"
        title="Instruction not available"
        subTitle="The instruction could not be loaded right now."
        extra={[
          <Button key="retry" type="primary" onClick={onRetry}>
            Retry
          </Button>,
          <Link key="back" href={`/workspace/${workspaceId}/notulensi`}>
            <Button>Back</Button>
          </Link>,
        ]}
      />
    );
  }

  const savedAssigneeIds = detail.assignees
    .map((assignee) => assignee.userId)
    .sort();
  const selectedAssigneeIds = [...assigneeIds].sort();
  const hasAssigneeChanges =
    savedAssigneeIds.length !== selectedAssigneeIds.length ||
    savedAssigneeIds.some((id, index) => id !== selectedAssigneeIds[index]);

  const handleAction = async (action: NotulensiWorkflowAction) => {
    if (pendingAction) return;
    setPendingAction(action);
    try {
      await actionMutation.mutateAsync({ workspaceId, id: detail.id, action });
      await refreshNotulensi(workspaceId);
      message.success("Status updated");
    } catch (actionError) {
      message.error(getErrorMessage(actionError, "Failed to update status"));
    } finally {
      setPendingAction(null);
    }
  };

  const handleCopyLink = async () => {
    try {
      await copyNotulensiLink(workspaceId, detail.id);
      message.success("Link copied");
    } catch {
      message.error("Failed to copy link");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteNotulensiMutation.mutateAsync({ workspaceId, id: detail.id });
      message.success("Task deleted");
      router.push(`/workspace/${workspaceId}/notulensi`);
    } catch (deleteError) {
      message.error(getErrorMessage(deleteError, "Failed to delete task"));
    }
  };

  const handleProgress = async (progress: NotulensiProgress) => {
    if (progressMutation.isPending || progress === detail.progress) return;
    try {
      await progressMutation.mutateAsync({ workspaceId, id: detail.id, progress });
    } catch (progressError) {
      message.error(getErrorMessage(progressError, "Failed to update progress"));
    }
  };

  const handleAssignees = async () => {
    if (!assigneeIds.length || !hasAssigneeChanges || updateNotulensiMutation.isPending) return;
    try {
      await updateNotulensiMutation.mutateAsync({
        workspaceId,
        id: detail.id,
        payload: { assigneeIds },
      });
      message.success("Assignees updated");
    } catch (updateError) {
      message.error(getErrorMessage(updateError, "Failed to update assignees"));
    }
  };

  const canEditComment = (comment: NotulensiComment) =>
    comment.permissions?.canEdit ??
    (comment.createdBy === currentUser?.id || Boolean(isSuperAdmin));

  const canDeleteComment = (comment: NotulensiComment) =>
    comment.permissions?.canDelete ??
    (comment.createdBy === currentUser?.id || Boolean(isSuperAdmin));

  const handleFiles = async (files: File[]) => {
    if (!files.length) return;
    if (isUploadingAttachments.current) {
      message.warning("An attachment upload is already in progress");
      return;
    }
    isUploadingAttachments.current = true;

    const { accepted, rejected } = validateNotulensiAttachments(files);
    let result;
    try {
      result = await uploadNotulensiAttachmentsSequentially(accepted, (file) =>
        uploadAttachmentMutation.mutateAsync({ workspaceId, id: detail.id, file, invalidate: false }),
        (current, total) => setUploadProgress({ current, total })
      );
      if (accepted.length) await refreshNotulensi(workspaceId);
    } finally {
      setUploadProgress(null);
      isUploadingAttachments.current = false;
    }

    if (!rejected.length && !result.failed) {
      message.success(`${result.uploaded} attachment${result.uploaded === 1 ? "" : "s"} uploaded`);
    } else {
      const errors = [
        rejected.length ? `${rejected.length} exceeded 50 MB` : "",
        result.failed ? `${result.failed} failed to upload` : "",
      ].filter(Boolean).join("; ");
      message.error(`${result.uploaded} of ${files.length} attachments uploaded; ${errors}.`);
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    void handleFiles(files);
  };

  const handleDownload = (url?: string | null, name?: string | null) => {
    if (!url) return;
    const link = document.createElement("a");
    link.href = buildFileProxyUrl(url);
    link.download = name || "download";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenPreview = (attachmentId: string) => {
    const index = previewableAttachments.findIndex((attachment) => attachment.id === attachmentId);
    if (index < 0) return;
    setPreviewInitialIndex(index);
    setPreviewModalOpen(true);
  };

  const handleRenameAttachment = async (attachmentId: string) => {
    if (!attachmentName.trim()) return;
    try {
      await renameAttachmentMutation.mutateAsync({
        workspaceId,
        id: detail.id,
        attachmentId,
        payload: { name: attachmentName.trim() },
      });
      setRenamingAttachmentId(null);
      message.success("Attachment renamed");
    } catch (renameError) {
      message.error(getErrorMessage(renameError, "Failed to rename attachment"));
    }
  };

  return (
    <div className="grid min-w-0 grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(380px,0.8fr)]">
      <div className="flex min-w-0 flex-col gap-4">
      <div className="rounded-2xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-4 md:p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href={`/workspace/${workspaceId}/notulensi`}>
              <Button type="default" icon={<ArrowLeft size={16} />}>Back</Button>
            </Link>
            <Typography.Text type="secondary" className="block text-sm">
              {detail.code}
            </Typography.Text>
            <Typography.Title level={3} className="!mb-2 !mt-1">
              {detail.title}
            </Typography.Title>
            <div className="flex flex-wrap gap-2">
              <NotulensiStatusTag status={detail.status} />
              <NotulensiPriorityTag priority={detail.priority} />
              <Typography.Text>
                Due: {detail.dueDate ? dayjs(detail.dueDate).format("DD MMM YYYY HH:mm") : "No due date"}
              </Typography.Text>
            </div>
          </div>
          <Space wrap className="ml-auto justify-end">
            {detail.allowedActions
              .filter((action): action is NotulensiWorkflowAction => action !== "update_progress")
              .map((action) => {
                const meta = NOTULENSI_ACTION_META[action];
                const button = (
                  <Button
                    danger={meta.danger}
                    type={action === "complete" ? "primary" : "default"}
                    loading={pendingAction === action}
                    onClick={meta.confirmation ? undefined : () => handleAction(action)}
                  >
                    {meta.label}
                  </Button>
                );
                return meta.confirmation ? (
                  <Popconfirm
                    key={action}
                    title={meta.confirmation.title}
                    description={meta.confirmation.description}
                    onConfirm={() => handleAction(action)}
                  >
                    {button}
                  </Popconfirm>
                ) : <span key={action}>{button}</span>;
              })}
            <Button icon={<Copy size={16} />} onClick={handleCopyLink}>
              Copy Link
            </Button>
            {detail.permissions?.canEdit ? (
              <Link href={`/workspace/${workspaceId}/notulensi/${detail.id}/edit`}>
                <Button>Edit</Button>
              </Link>
            ) : null}
            {detail.permissions?.canDelete ? (
              <Popconfirm
                title={`Permanently delete "${detail.title}"?`}
                description="This task and its data will be permanently deleted. This action cannot be undone."
                okText="Delete permanently"
                okButtonProps={{ danger: true }}
                onConfirm={handleDelete}
              >
                <Button
                  danger
                  icon={<Trash2 size={16} />}
                  loading={deleteNotulensiMutation.isPending}
                >
                  Delete
                </Button>
              </Popconfirm>
            ) : null}
          </Space>
        </div>

        <div className="mb-4 rounded-lg border border-[rgb(var(--color-border))] p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <Typography.Text strong>Progress</Typography.Text>
            {detail.allowedActions.includes("update_progress") ? (
              <Select<NotulensiProgress>
                aria-label="Progress"
                value={detail.progress}
                options={NOTULENSI_PROGRESS_OPTIONS}
                loading={progressMutation.isPending}
                disabled={progressMutation.isPending}
                onChange={handleProgress}
                className="w-24"
              />
            ) : (
              <Typography.Text>{detail.progress}%</Typography.Text>
            )}
          </div>
          <Progress percent={detail.progress} steps={4} showInfo={false} />
        </div>

        <div className="mb-4 grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
          <Typography.Text>Updated: {dayjs(detail.updatedAt).format("DD MMM YYYY HH:mm")}</Typography.Text>
          <Typography.Text>Opened by you: {detail.currentUserOpenedAt ? dayjs(detail.currentUserOpenedAt).format("DD MMM YYYY HH:mm") : "Not opened"}</Typography.Text>
          <Typography.Text>Started: {detail.startedAt ? dayjs(detail.startedAt).format("DD MMM YYYY HH:mm") : "-"}</Typography.Text>
          <Typography.Text>Completed: {detail.completedAt ? dayjs(detail.completedAt).format("DD MMM YYYY HH:mm") : "-"}</Typography.Text>
          <Typography.Text>Cancelled: {detail.cancelledAt ? dayjs(detail.cancelledAt).format("DD MMM YYYY HH:mm") : "-"}</Typography.Text>
        </div>

        <div className="mb-4">
          <Typography.Text type="secondary" className="mb-2 block">Read receipts</Typography.Text>
          {detail.readReceipts.length ? detail.readReceipts.map((receipt) => (
            <Typography.Text key={receipt.userId} className="block text-sm">
              {receipt.user?.username || "Unknown user"}: {dayjs(receipt.openedAt).format("DD MMM YYYY HH:mm")}
            </Typography.Text>
          )) : <Typography.Text type="secondary">No reads yet</Typography.Text>}
        </div>

        <div className="mb-4 flex flex-wrap gap-4 text-sm">
          <div>
            <Typography.Text type="secondary" className="block">Assignees</Typography.Text>
            {detail.permissions?.canAssign ? (
              <Space.Compact className="mt-1 w-full min-w-0 sm:min-w-[280px]">
                <NotulensiUserSelect
                  value={assigneeIds}
                  onChange={setAssigneeIds}
                  disabled={updateNotulensiMutation.isPending}
                />
                <Button
                  type="primary"
                  onClick={handleAssignees}
                  loading={updateNotulensiMutation.isPending}
                  disabled={!assigneeIds.length || !hasAssigneeChanges}
                >
                  Save
                </Button>
              </Space.Compact>
            ) : (
              <Typography.Text>
                {getAssigneeNames(detail.assignees)}
              </Typography.Text>
            )}
          </div>
          <div>
            <Typography.Text type="secondary" className="block">Creator</Typography.Text>
            <Typography.Text>{detail.creator?.username || "Unknown user"}</Typography.Text>
          </div>
        </div>

        {hasDisplayableRichContent(detail.content) ? (
          <RichTextEditor initialValue={detail.content} readOnly minHeight={80} />
        ) : (
          <Typography.Text type="secondary">No description</Typography.Text>
        )}
      </div>

      {detail.cardId ? (
        <div className="min-w-0 rounded-2xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-4 md:p-6">
          <div className="mb-4">
            <Typography.Title level={4} className="!mb-0 !mt-0">
              <ListChecks className="mr-2 inline" size={18} aria-hidden="true" />
              Checklists
            </Typography.Title>
            <Typography.Text type="secondary">Changes are synced with the linked card.</Typography.Text>
          </div>
          <ChecklistComponent
            cardId={detail.cardId}
            readOnly={!detail.permissions?.canAssign}
          />
        </div>
      ) : null}

      <div
        className="rounded-2xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-4 md:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Typography.Title level={4} className="!mb-0 !mt-0">
              <Paperclip className="mr-2 inline" size={18} aria-hidden="true" />
              Attachments
            </Typography.Title>
            <Typography.Text type="secondary">Files up to 50 MB</Typography.Text>
          </div>
          {detail.permissions?.canUploadAttachment ? (
            <div
              tabIndex={0}
              aria-label="Attachment paste and drop zone"
              className={`w-full rounded-xl border-2 border-dashed p-5 text-center transition-colors ${
                uploadProgress
                  ? "cursor-not-allowed border-[rgb(var(--color-border))] opacity-60"
                  : isDraggingAttachment
                  ? "border-[rgb(var(--color-primary))] bg-[rgb(var(--color-background))]"
                  : "border-[rgb(var(--color-border))]"
              }`}
              aria-disabled={Boolean(uploadProgress)}
              onDragEnter={(event) => {
                event.preventDefault();
                if (!uploadProgress) setIsDraggingAttachment(true);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = uploadProgress ? "none" : "copy";
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setIsDraggingAttachment(false);
                }
              }}
              onDrop={(event: DragEvent<HTMLDivElement>) => {
                event.preventDefault();
                setIsDraggingAttachment(false);
                void handleFiles(Array.from(event.dataTransfer.files));
              }}
              onPaste={(event: ClipboardEvent<HTMLDivElement>) => {
                const files = getPastedFiles(event.clipboardData);
                if (!files.length || uploadProgress) return;
                event.preventDefault();
                void handleFiles(files);
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                multiple
                onChange={handleFileChange}
              />
              <Typography.Text strong className="mb-2 block">
                {uploadProgress
                  ? "Attachment upload in progress"
                  : isDraggingAttachment
                    ? "Drop files to upload"
                    : "Drag, drop, or paste files here"}
              </Typography.Text>
              {uploadProgress ? (
                <Typography.Text role="status" aria-live="polite" className="mb-2 block">
                  Uploading {uploadProgress.current} of {uploadProgress.total}
                </Typography.Text>
              ) : (
                <Typography.Text type="secondary" className="mb-2 block">
                  Select one or more files, up to {MAX_NOTULENSI_ATTACHMENT_SIZE / 1024 / 1024} MB each
                </Typography.Text>
              )}
              <Button
                type="primary"
                icon={<Upload size={16} />}
                loading={Boolean(uploadProgress)}
                disabled={Boolean(uploadProgress)}
                onClick={() => fileInputRef.current?.click()}
              >
                Choose files
              </Button>
            </div>
          ) : null}
        </div>
        {detail.attachments.length ? (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {detail.attachments.map((attachment) => {
              const label = attachment.name || "Unnamed attachment";
              const size = attachment.size == null
                ? "Size unavailable"
                : [attachment.size, attachment.sizeUnit].filter(Boolean).join(" ");
              const isImage = Boolean(
                attachment.url && isImageFile(label, attachment.mimeType || undefined)
              );
              const isPreviewable = previewableAttachments.some((item) => item.id === attachment.id);
              const canRename = Boolean(
                detail.permissions?.canDeleteAttachment || detail.permissions?.canUploadAttachment
              );
              return (
                <div key={attachment.id} className="flex min-w-0 items-center gap-3 rounded-xl border border-[rgb(var(--color-border))] p-3">
                  {isImage ? (
                    <button type="button" disabled={!isPreviewable} onClick={() => handleOpenPreview(attachment.id)}>
                      <Image
                        preview={false}
                        src={attachment.url || undefined}
                        alt={label}
                        width={56}
                        height={56}
                        className="rounded-lg object-cover"
                        fallback="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="
                      />
                    </button>
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-[rgb(var(--color-background))]">
                      <Paperclip size={22} aria-hidden="true" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    {renamingAttachmentId === attachment.id ? (
                      <Input
                        size="small"
                        value={attachmentName}
                        autoFocus
                        onChange={(event) => setAttachmentName(event.target.value)}
                        onPressEnter={() => handleRenameAttachment(attachment.id)}
                      />
                    ) : isPreviewable ? (
                      <button type="button" className="block max-w-full truncate text-left font-medium hover:underline" onClick={() => handleOpenPreview(attachment.id)}>
                        {label}
                      </button>
                    ) : attachment.url ? (
                      <a className="block max-w-full truncate font-medium hover:underline" href={attachment.url} target="_blank" rel="noopener noreferrer">
                        {label}
                      </a>
                    ) : <Typography.Text ellipsis className="block font-medium">{label}</Typography.Text>}
                    <Typography.Text type="secondary" className="block text-xs">
                      {size} · {attachment.uploader?.username || "Unknown user"}
                    </Typography.Text>
                    <Typography.Text type="secondary" className="block text-xs">
                      {dayjs(attachment.createdAt).format("DD MMM YYYY HH:mm")}
                    </Typography.Text>
                  </div>
                  <Space size={0}>
                    {renamingAttachmentId === attachment.id ? (
                      <>
                        <Button
                          type="text"
                          aria-label={`Save name for ${label}`}
                          icon={<Check size={16} />}
                          loading={renameAttachmentMutation.isPending}
                          disabled={!attachmentName.trim()}
                          onClick={() => handleRenameAttachment(attachment.id)}
                        />
                        <Button type="text" aria-label="Cancel rename" icon={<X size={16} />} onClick={() => setRenamingAttachmentId(null)} />
                      </>
                    ) : canRename ? (
                      <Button
                        type="text"
                        aria-label={`Rename ${label}`}
                        icon={<Pencil size={16} />}
                        onClick={() => {
                          setRenamingAttachmentId(attachment.id);
                          setAttachmentName(label);
                        }}
                      />
                    ) : null}
                    {attachment.url ? (
                      <>
                        <Button type="text" aria-label={`Download ${label}`} onClick={() => handleDownload(attachment.url, label)} icon={<Download size={16} />} />
                        <a href={attachment.url} target="_blank" rel="noopener noreferrer" aria-label={`Open original ${label}`} className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-[rgb(var(--color-background))]">
                          <ExternalLink size={16} />
                        </a>
                      </>
                    ) : null}
                    {detail.permissions?.canDeleteAttachment ? (
                      <Popconfirm
                        title="Delete this attachment?"
                        onConfirm={async () => {
                          try {
                            await deleteAttachmentMutation.mutateAsync({ workspaceId, id: detail.id, attachmentId: attachment.id });
                            message.success("Attachment deleted");
                          } catch (deleteError) {
                            message.error(getErrorMessage(deleteError, "Failed to delete attachment"));
                          }
                        }}
                      >
                        <Button type="text" danger aria-label={`Delete ${label}`} loading={deleteAttachmentMutation.isPending} icon={<Trash2 size={16} />} />
                      </Popconfirm>
                    ) : null}
                  </Space>
                </div>
              );
            })}
          </div>
        ) : (
          <Typography.Text type="secondary">No attachments</Typography.Text>
        )}
      </div>

      </div>
      <div className="rounded-2xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-4 md:p-6 xl:sticky xl:top-4 xl:max-h-[calc(100dvh-2rem)] xl:overflow-y-auto">
        <Tabs
          items={[
            {
              key: "discussion",
              label: "Discussion",
              children: (
                <div className="flex flex-col gap-4">
                  {replyingTo ? (
                    <div className="flex items-start justify-between gap-3 rounded-lg bg-[rgb(var(--color-background))] px-3 py-2 text-sm">
                      <div className="min-w-0">
                        <Typography.Text strong>Replying to {replyingTo.creator?.username || "Unknown user"}</Typography.Text>
                        <Typography.Text type="secondary" className="block truncate">{getCommentQuote(replyingTo.content) || "Comment"}</Typography.Text>
                      </div>
                      <Button type="text" size="small" onClick={() => setReplyingTo(null)}>Cancel</Button>
                    </div>
                  ) : null}
                  <RichTextEditor
                    minHeight={100}
                    value={newComment}
                    onChange={setNewComment}
                    placeholder="Add a comment"
                    mentionUsers={mentionUsers}
                    allowWorkspaceAllMention={false}
                  />
                  <div className="flex justify-end">
                    <Button
                      type="primary"
                      loading={createCommentMutation.isPending}
                      disabled={!hasRichTextContent(newComment)}
                      onClick={async () => {
                        if (!hasRichTextContent(newComment)) return;
                        try {
                          await createCommentMutation.mutateAsync({
                            workspaceId,
                            id: detail.id,
                            payload: {
                              content: newComment,
                              ...(replyingTo ? { replyToCommentId: replyingTo.id } : {}),
                            },
                          });
                          setNewComment("");
                          setReplyingTo(null);
                          message.success("Comment added");
                        } catch (commentError) {
                          message.error(getErrorMessage(commentError, "Failed to add comment"));
                        }
                      }}
                    >
                      Post comment
                    </Button>
                  </div>
                  {detail.comments.length ? (
                    [...detail.comments]
                      .sort((a, b) => dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf())
                      .map((comment) => (
                      <div
                        key={comment.id}
                        className="rounded-lg border border-[rgb(var(--color-border))] p-3"
                      >
                        <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <Typography.Text strong>{comment.creator?.username || "Unknown user"}</Typography.Text>
                            <Typography.Text type="secondary" className="ml-2 text-xs">
                              {dayjs(comment.updatedAt).format("DD MMM YYYY HH:mm")}
                            </Typography.Text>
                          </div>
                          <Space wrap>
                            <Button type="link" onClick={() => setReplyingTo(comment)}>Reply</Button>
                            {canEditComment(comment) ? (
                              <Button
                                type="link"
                                onClick={() => {
                                  setEditingCommentId(comment.id);
                                  setEditingComment(comment.content);
                                }}
                              >
                                Edit
                              </Button>
                            ) : null}
                            {canDeleteComment(comment) ? (
                              <Popconfirm
                                title="Delete this comment?"
                                onConfirm={async () => {
                                  try {
                                    await deleteCommentMutation.mutateAsync({
                                      workspaceId,
                                      id: detail.id,
                                      commentId: comment.id,
                                    });
                                    message.success("Comment deleted");
                                  } catch (deleteCommentError) {
                                    message.error(
                                      getErrorMessage(deleteCommentError, "Failed to delete comment")
                                    );
                                  }
                                }}
                              >
                                <Button type="link" danger>
                                  Delete
                                </Button>
                              </Popconfirm>
                            ) : null}
                          </Space>
                        </div>
                        {editingCommentId === comment.id ? (
                          <div className="flex flex-col gap-3">
                            <RichTextEditor
                              minHeight={100}
                              value={editingComment}
                              onChange={setEditingComment}
                              mentionUsers={mentionUsers}
                              allowWorkspaceAllMention={false}
                            />
                            <div className="flex flex-wrap justify-end gap-2">
                              <Button onClick={() => setEditingCommentId(null)}>Cancel</Button>
                              <Button
                                type="primary"
                                loading={updateCommentMutation.isPending}
                                disabled={!hasRichTextContent(editingComment)}
                                onClick={async () => {
                                  try {
                                    await updateCommentMutation.mutateAsync({
                                      workspaceId,
                                      id: detail.id,
                                      commentId: comment.id,
                                      payload: { content: editingComment },
                                    });
                                    setEditingCommentId(null);
                                    message.success("Comment updated");
                                  } catch (updateCommentError) {
                                    message.error(
                                      getErrorMessage(updateCommentError, "Failed to update comment")
                                    );
                                  }
                                }}
                              >
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {comment.replyTo ? (
                              <div className="mb-2 rounded-md bg-[rgb(var(--color-background))] px-3 py-2 text-sm">
                                <Typography.Text strong>{comment.replyTo.creator?.username || "Unknown user"}</Typography.Text>
                                <Typography.Text type="secondary" className="ml-2">{getCommentQuote(comment.replyTo.content) || "Comment"}</Typography.Text>
                              </div>
                            ) : null}
                            <RichTextEditor initialValue={comment.content} readOnly minHeight={60} maxHeight={180} transformReadOnlyHtml={linkifyNotulensiComment} />
                          </>
                        )}
                      </div>
                    ))
                  ) : (
                    <Alert type="info" message="No discussion yet" showIcon />
                  )}
                </div>
              ),
            },
            {
              key: "history",
              label: "History",
              children: (
                <Timeline
                  items={detail.statusHistory.map((item) => ({
                    children: (
                      <div>
                        <Typography.Text strong>
                          {item.actor?.username || "System"}
                        </Typography.Text>
                        <Typography.Paragraph className="!mb-0 text-sm">
                          {item.fromStatus
                            ? `${NOTULENSI_STATUS_META[item.fromStatus].label} -> ${NOTULENSI_STATUS_META[item.toStatus].label}`
                            : `Set to ${NOTULENSI_STATUS_META[item.toStatus].label}`}
                        </Typography.Paragraph>
                        <Typography.Text type="secondary" className="text-xs">
                          {dayjs(item.createdAt).format("DD MMM YYYY HH:mm")}
                        </Typography.Text>
                      </div>
                    ),
                  }))}
                />
              ),
            },
            {
              key: "private-note",
              label: "Private note",
              children: (
                <div className="flex flex-col gap-4">
                  <Alert
                    type="info"
                    showIcon
                    message="Only you can see this, including workspace administrators."
                  />
                  <Input.TextArea
                    rows={6}
                    value={privateNoteDraft}
                    onChange={(event) => setPrivateNoteDraft(event.target.value)}
                    placeholder="Write a private note"
                  />
                  <div className="flex flex-wrap justify-end gap-2">
                    {privateNote ? (
                      <Popconfirm
                        title="Delete your private note?"
                        onConfirm={async () => {
                          try {
                            await deletePrivateNoteMutation.mutateAsync({ workspaceId, id: detail.id });
                            setPrivateNoteDraft("");
                            message.success("Private note deleted");
                          } catch (privateNoteDeleteError) {
                            message.error(
                              getErrorMessage(privateNoteDeleteError, "Failed to delete private note")
                            );
                          }
                        }}
                      >
                        <Button danger loading={deletePrivateNoteMutation.isPending}>Delete</Button>
                      </Popconfirm>
                    ) : null}
                    <Button
                      type="primary"
                      loading={updatePrivateNoteMutation.isPending}
                      disabled={!privateNoteDraft.trim()}
                      onClick={async () => {
                        try {
                          await updatePrivateNoteMutation.mutateAsync({
                            workspaceId,
                            id: detail.id,
                            payload: { content: privateNoteDraft.trim() },
                          });
                          message.success("Private note saved");
                        } catch (privateNoteError) {
                          message.error(getErrorMessage(privateNoteError, "Failed to save private note"));
                        }
                      }}
                    >
                      Save note
                    </Button>
                  </div>
                </div>
              ),
            },
          ]}
        />
      </div>
      <AttachmentPreviewModal
        open={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        attachments={previewableAttachments}
        initialIndex={previewInitialIndex}
        isImageFile={isImageFile}
        isPDFFile={isPDFFile}
        onDownload={handleDownload}
      />
    </div>
  );
}
