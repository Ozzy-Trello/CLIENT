"use client";

import RichTextEditor from "@components/rich-text-editor";
import {
  NotulensiPriorityTag,
  NotulensiStatusTag,
  NOTULENSI_STATUS_META,
} from "@components/notulensi/notulensi-status";
import {
  useCreateNotulensiComment,
  useDeleteNotulensiComment,
  useDeleteNotulensiAttachment,
  useDeleteNotulensiPrivateNote,
  useNotulensiPrivateNote,
  useNotulensiAction,
  useUpdateNotulensiProgress,
  useUpdateNotulensiComment,
  useUpdateNotulensiPrivateNote,
  useUploadNotulensiAttachment,
} from "@hooks/notulensi";
import { useCurrentAccount } from "@hooks/account";
import { NotulensiComment, NotulensiDetail, NotulensiProgress, NotulensiWorkflowAction } from "@myTypes/notulensi";
import {
  Alert,
  Avatar,
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
  message,
} from "antd";
import { AxiosError } from "axios";
import dayjs from "dayjs";
import Link from "next/link";
import { Download, Paperclip, Trash2, Upload } from "lucide-react";
import { ChangeEvent, useEffect, useRef, useState } from "react";

const MAX_ATTACHMENT_SIZE = 50 * 1024 * 1024;

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

const getInitials = (value: string) => value.slice(0, 2).toUpperCase();

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
  const [privateNoteDraft, setPrivateNoteDraft] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const actionMutation = useNotulensiAction();
  const progressMutation = useUpdateNotulensiProgress();
  const createCommentMutation = useCreateNotulensiComment();
  const updateCommentMutation = useUpdateNotulensiComment();
  const deleteCommentMutation = useDeleteNotulensiComment();
  const updatePrivateNoteMutation = useUpdateNotulensiPrivateNote();
  const deletePrivateNoteMutation = useDeleteNotulensiPrivateNote();
  const uploadAttachmentMutation = useUploadNotulensiAttachment();
  const deleteAttachmentMutation = useDeleteNotulensiAttachment();
  const privateNoteQuery = useNotulensiPrivateNote(workspaceId, detail?.id || "");

  const privateNote = privateNoteQuery.data?.data ?? detail?.privateNote ?? null;

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

  const handleAction = async (action: NotulensiWorkflowAction) => {
    try {
      await actionMutation.mutateAsync({ workspaceId, id: detail.id, action });
      message.success("Status updated");
    } catch (actionError) {
      message.error(getErrorMessage(actionError, "Failed to update status"));
    }
  };

  const handleProgress = async (progress: NotulensiProgress) => {
    if (progressMutation.isPending) return;
    try {
      await progressMutation.mutateAsync({ workspaceId, id: detail.id, progress });
    } catch (progressError) {
      message.error(getErrorMessage(progressError, "Failed to update progress"));
    }
  };

  const actionMeta: Record<NotulensiWorkflowAction, { label: string; danger?: boolean; terminal?: boolean }> = {
    start: { label: "Proses" },
    submit_review: { label: "Menunggu Review" },
    request_revision: { label: "Revision" },
    complete: { label: "Selesai", terminal: true },
    cancel: { label: "Cancel", danger: true, terminal: true },
  };

  const canEditComment = (comment: NotulensiComment) =>
    comment.permissions?.canEdit ??
    (comment.createdBy === currentUser?.id || Boolean(isSuperAdmin));

  const canDeleteComment = (comment: NotulensiComment) =>
    comment.permissions?.canDelete ??
    (comment.createdBy === currentUser?.id || Boolean(isSuperAdmin));

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_ATTACHMENT_SIZE) {
      message.error("File must be 50 MB or smaller");
      return;
    }
    try {
      await uploadAttachmentMutation.mutateAsync({ workspaceId, id: detail.id, file });
      message.success("Attachment uploaded");
    } catch (uploadError) {
      message.error(getErrorMessage(uploadError, "Failed to upload attachment"));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-4 md:p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href={`/workspace/${workspaceId}/notulensi`}>
              <Button type="link" className="!px-0">Back</Button>
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
          <Space wrap>
            {detail.allowedActions
              .filter((action): action is NotulensiWorkflowAction => action !== "update_progress")
              .map((action) => {
                const meta = actionMeta[action];
                const button = (
                  <Button
                    danger={meta.danger}
                    type={action === "complete" ? "primary" : "default"}
                    loading={actionMutation.isPending}
                    onClick={meta.terminal ? undefined : () => handleAction(action)}
                  >
                    {meta.label}
                  </Button>
                );
                return meta.terminal ? (
                  <Popconfirm
                    key={action}
                    title={`${meta.label} task ini?`}
                    description="Tindakan ini mengakhiri workflow task."
                    onConfirm={() => handleAction(action)}
                  >
                    {button}
                  </Popconfirm>
                ) : <span key={action}>{button}</span>;
              })}
            {detail.permissions.canEdit ? (
              <Link href={`/workspace/${workspaceId}/notulensi/${detail.id}/edit`}>
                <Button>Edit</Button>
              </Link>
            ) : null}
          </Space>
        </div>

        <div className="mb-4 rounded-lg border border-[rgb(var(--color-border))] p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <Typography.Text strong>Progress</Typography.Text>
            <Space>
              {detail.allowedActions.includes("update_progress") ? (
                <Button
                  size="small"
                  disabled={detail.progress === 0 || progressMutation.isPending}
                  loading={progressMutation.isPending}
                  onClick={() => handleProgress(Math.max(0, detail.progress - 25) as NotulensiProgress)}
                >
                  -25
                </Button>
              ) : null}
              <Typography.Text>{detail.progress}%</Typography.Text>
              {detail.allowedActions.includes("update_progress") ? (
                <Button
                  size="small"
                  disabled={detail.progress === 100 || progressMutation.isPending}
                  loading={progressMutation.isPending}
                  onClick={() => handleProgress(Math.min(100, detail.progress + 25) as NotulensiProgress)}
                >
                  +25
                </Button>
              ) : null}
            </Space>
          </div>
          <Progress percent={detail.progress} steps={4} showInfo={false} />
        </div>

        <div className="mb-4 grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
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
            <Avatar.Group>
              {detail.assignees.map((assignee) => (
                <Avatar key={assignee.id}>{getInitials(assignee.user?.username || "?")}</Avatar>
              ))}
            </Avatar.Group>
          </div>
          <div>
            <Typography.Text type="secondary" className="block">Creator</Typography.Text>
            <Typography.Text>{detail.creator?.username || "Unknown user"}</Typography.Text>
          </div>
        </div>

        <RichTextEditor initialValue={detail.content} readOnly minHeight={220} />
      </div>

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
          {detail.permissions.canUploadAttachment ? (
            <>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                type="primary"
                icon={<Upload size={16} />}
                loading={uploadAttachmentMutation.isPending}
                onClick={() => fileInputRef.current?.click()}
              >
                Upload file
              </Button>
            </>
          ) : null}
        </div>
        {detail.attachments.length ? (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {detail.attachments.map((attachment) => {
              const isImage = attachment.mimeType.startsWith("image/");
              return (
                <div key={attachment.id} className="flex min-w-0 items-center gap-3 rounded-xl border border-[rgb(var(--color-border))] p-3">
                  {isImage ? (
                    <Image
                      src={attachment.url}
                      alt={attachment.name}
                      width={56}
                      height={56}
                      className="rounded-lg object-cover"
                      fallback="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="
                    />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-[rgb(var(--color-background))]">
                      <Paperclip size={22} aria-hidden="true" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <Typography.Link href={attachment.url} target="_blank" rel="noopener noreferrer" ellipsis className="block font-medium">
                      {attachment.name}
                    </Typography.Link>
                    <Typography.Text type="secondary" className="block text-xs">
                      {attachment.size} {attachment.sizeUnit} · {attachment.uploader?.username || "Unknown user"}
                    </Typography.Text>
                    <Typography.Text type="secondary" className="block text-xs">
                      {dayjs(attachment.createdAt).format("DD MMM YYYY HH:mm")}
                    </Typography.Text>
                  </div>
                  <Space size={0}>
                    <Button type="text" aria-label={`Open ${attachment.name}`} href={attachment.url} target="_blank" icon={<Download size={16} />} />
                    {detail.permissions.canDeleteAttachment ? (
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
                        <Button type="text" danger aria-label={`Delete ${attachment.name}`} loading={deleteAttachmentMutation.isPending} icon={<Trash2 size={16} />} />
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

      <div className="rounded-2xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-4 md:p-6">
        <Tabs
          items={[
            {
              key: "discussion",
              label: "Discussion",
              children: (
                <div className="flex flex-col gap-4">
                  <Input.TextArea
                    rows={4}
                    value={newComment}
                    onChange={(event) => setNewComment(event.target.value)}
                    placeholder="Add a comment"
                  />
                  <div className="flex justify-end">
                    <Button
                      type="primary"
                      loading={createCommentMutation.isPending}
                      onClick={async () => {
                        if (!newComment.trim()) return;
                        try {
                          await createCommentMutation.mutateAsync({
                            workspaceId,
                            id: detail.id,
                            payload: { content: newComment.trim() },
                          });
                          setNewComment("");
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
                    detail.comments.map((comment) => (
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
                            <Input.TextArea
                              rows={4}
                              value={editingComment}
                              onChange={(event) => setEditingComment(event.target.value)}
                            />
                            <div className="flex flex-wrap justify-end gap-2">
                              <Button onClick={() => setEditingCommentId(null)}>Cancel</Button>
                              <Button
                                type="primary"
                                loading={updateCommentMutation.isPending}
                                disabled={!editingComment.trim()}
                                onClick={async () => {
                                  try {
                                    await updateCommentMutation.mutateAsync({
                                      workspaceId,
                                      id: detail.id,
                                      commentId: comment.id,
                                      payload: { content: editingComment.trim() },
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
                          <Typography.Paragraph className="!mb-0 whitespace-pre-wrap">
                            {comment.content}
                          </Typography.Paragraph>
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
    </div>
  );
}
