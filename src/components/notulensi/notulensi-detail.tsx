"use client";

import RichTextEditor from "@components/rich-text-editor";
import {
  NOTULENSI_TRANSITIONS,
  NotulensiPriorityTag,
  NotulensiStatusTag,
  NOTULENSI_STATUS_META,
} from "@components/notulensi/notulensi-status";
import {
  useCreateNotulensiComment,
  useDeleteNotulensi,
  useDeleteNotulensiComment,
  useDeleteNotulensiPrivateNote,
  useNotulensiPrivateNote,
  useTransitionNotulensi,
  useUpdateNotulensiComment,
  useUpdateNotulensiPrivateNote,
} from "@hooks/notulensi";
import { useCurrentAccount } from "@hooks/account";
import { NotulensiComment, NotulensiDetail, NotulensiStatus } from "@myTypes/notulensi";
import {
  Alert,
  Avatar,
  Button,
  Dropdown,
  Input,
  Modal,
  Popconfirm,
  Result,
  Skeleton,
  Space,
  Tabs,
  Timeline,
  Typography,
  message,
} from "antd";
import { AxiosError } from "axios";
import dayjs from "dayjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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
  const router = useRouter();
  const { data: currentAccountData } = useCurrentAccount();
  const currentUser = currentAccountData?.data;
  const isSuperAdmin = currentUser?.role?.name === "Super Admin";
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState("");
  const [privateNoteDraft, setPrivateNoteDraft] = useState("");

  const deleteMutation = useDeleteNotulensi();
  const transitionMutation = useTransitionNotulensi();
  const createCommentMutation = useCreateNotulensiComment();
  const updateCommentMutation = useUpdateNotulensiComment();
  const deleteCommentMutation = useDeleteNotulensiComment();
  const updatePrivateNoteMutation = useUpdateNotulensiPrivateNote();
  const deletePrivateNoteMutation = useDeleteNotulensiPrivateNote();
  const privateNoteQuery = useNotulensiPrivateNote(workspaceId, detail?.id || "");

  const privateNote = privateNoteQuery.data?.data ?? detail?.privateNote ?? null;

  useEffect(() => {
    setPrivateNoteDraft(privateNote?.content || "");
  }, [privateNote?.content]);

  const transitionOptions = useMemo(() => {
    if (!detail) return [];
    return NOTULENSI_TRANSITIONS[detail.status].map((status) => ({
      key: status,
      label: `Move to ${NOTULENSI_STATUS_META[status].label}`,
    }));
  }, [detail]);

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

  const handleTransition = (status: NotulensiStatus) => {
    Modal.confirm({
      title: `Move to ${NOTULENSI_STATUS_META[status].label}?`,
      onOk: async () => {
        try {
          await transitionMutation.mutateAsync({ workspaceId, id: detail.id, status });
          message.success("Status updated");
        } catch (transitionError) {
          message.error(getErrorMessage(transitionError, "Failed to update status"));
        }
      },
    });
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync({ workspaceId, id: detail.id });
      message.success("Instruction deleted");
      router.replace(`/workspace/${workspaceId}/notulensi`);
    } catch (deleteError) {
      message.error(getErrorMessage(deleteError, "Failed to delete instruction"));
    }
  };

  const canEditComment = (comment: NotulensiComment) =>
    comment.permissions?.canEdit ??
    (comment.createdBy === currentUser?.id || Boolean(isSuperAdmin));

  const canDeleteComment = (comment: NotulensiComment) =>
    comment.permissions?.canDelete ??
    (comment.createdBy === currentUser?.id || Boolean(isSuperAdmin));

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
            {detail.permissions.canTransition && transitionOptions.length ? (
              <Dropdown
                menu={{
                  items: transitionOptions,
                  onClick: ({ key }) => handleTransition(key as NotulensiStatus),
                }}
              >
                <Button loading={transitionMutation.isPending}>Change status</Button>
              </Dropdown>
            ) : null}
            {detail.permissions.canEdit ? (
              <Link href={`/workspace/${workspaceId}/notulensi/${detail.id}/edit`}>
                <Button>Edit</Button>
              </Link>
            ) : null}
            {detail.permissions.canDelete ? (
              <Popconfirm title="Delete this instruction?" onConfirm={handleDelete}>
                <Button danger loading={deleteMutation.isPending}>Delete</Button>
              </Popconfirm>
            ) : null}
          </Space>
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
