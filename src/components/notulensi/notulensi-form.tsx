"use client";

import RichTextEditor from "@components/rich-text-editor";
import NotulensiUserSelect from "@components/notulensi/notulensi-user-select";
import { NOTULENSI_PRIORITY_META } from "@components/notulensi/notulensi-status";
import {
  MAX_NOTULENSI_ATTACHMENT_SIZE,
  normalizeOptionalRichText,
  validateNotulensiAttachments,
} from "@components/notulensi/notulensi-detail-utils";
import { selectUser } from "@store/app_slice";
import {
  useNotulensiEligibleAssignees,
  useNotulensiMentionUsers,
} from "@hooks/notulensi";
import {
  CreateNotulensiPayload,
  NotulensiDetail,
  NotulensiPriority,
  UpdateNotulensiPayload,
} from "@myTypes/notulensi";
import { Button, Checkbox, DatePicker, Form, Input, Result, Select, Typography, message } from "antd";
import dayjs, { Dayjs } from "dayjs";
import { Paperclip, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChangeEvent, DragEvent, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";

type FormValues = {
  title: string;
  content: string;
  assigneeIds: string[];
  priority: NotulensiPriority;
  dueDate?: Dayjs;
};

type Props = {
  mode: "create" | "edit";
  initialData?: NotulensiDetail;
  loading?: boolean;
  submitting?: boolean;
  canEdit?: boolean;
  onSubmit: (
    payload: CreateNotulensiPayload | UpdateNotulensiPayload,
    queuedFiles?: File[]
  ) => Promise<void> | void;
  cancelHref: string;
};

export default function NotulensiForm({
  mode,
  initialData,
  loading,
  submitting,
  canEdit = true,
  onSubmit,
  cancelHref,
}: Props) {
  const [form] = Form.useForm<FormValues>();
  const [queuedFiles, setQueuedFiles] = useState<File[]>([]);
  const [isDraggingAttachment, setIsDraggingAttachment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentUser = useSelector(selectUser);
  const params = useParams();
  const workspaceId = Array.isArray(params.workspaceId)
    ? params.workspaceId[0]
    : params.workspaceId || "";
  const eligibleAssignees = useNotulensiEligibleAssignees(workspaceId);
  const mentionUsers = useNotulensiMentionUsers(workspaceId);
  const canAssignSelf = Boolean(
    currentUser?.id && eligibleAssignees.data?.data.some((user) => user.id === currentUser.id)
  );
  const assignSelfReason = !currentUser?.id
    ? "Current user unavailable"
    : eligibleAssignees.isLoading
      ? "Checking assignment eligibility"
      : eligibleAssignees.isError
        ? "Could not verify assignment eligibility"
        : !canAssignSelf
          ? "You are not eligible for assignment in this workspace"
          : undefined;

  const queueFiles = (files: File[]) => {
    const { accepted, rejected } = validateNotulensiAttachments(files);
    setQueuedFiles((current) => [...current, ...accepted]);
    if (rejected.length) {
      message.error(`${rejected.length} attachment${rejected.length === 1 ? "" : "s"} exceeded 50 MB`);
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    queueFiles(Array.from(event.target.files || []));
    event.target.value = "";
  };

  const initialValues = useMemo<FormValues | undefined>(() => {
    if (!initialData) {
      return {
        priority: "reg",
        assigneeIds: [],
        title: "",
        content: "",
      };
    }

    return {
      title: initialData.title,
      content: initialData.content,
      assigneeIds: initialData.assignees.map((assignee) => assignee.userId),
      priority: initialData.priority,
      dueDate: initialData.dueDate ? dayjs(initialData.dueDate) : undefined,
    };
  }, [initialData]);

  if (mode === "edit" && !loading && !canEdit) {
    return <Result status="403" title="Editing is not allowed" subTitle="This instruction cannot be edited by your account." />;
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-[900px] rounded-2xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-4 md:p-6">
      <Form<FormValues>
        form={form}
        layout="vertical"
        initialValues={initialValues}
        disabled={loading || !canEdit}
        onFinish={async (values) => {
          const payload = {
            title: values.title.trim(),
            content: normalizeOptionalRichText(values.content),
            priority: values.priority,
            dueDate: values.dueDate?.toISOString() || null,
            assigneeIds: values.assigneeIds,
          };

          await onSubmit(
            payload as CreateNotulensiPayload | UpdateNotulensiPayload,
            mode === "create" ? queuedFiles : undefined
          );
        }}
      >
        <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
          <Form.Item
            name="title"
            label="Title"
            rules={[
              { required: true, message: "Title is required" },
              { max: 255, message: "Title must be 255 characters or less" },
            ]}
            className="md:col-span-2"
          >
            <Input placeholder="Instruction title" />
          </Form.Item>

          <Form.Item
            name="content"
            label="Content"
            className="md:col-span-2"
          >
            <RichTextEditor
              initialValue={initialData?.content || ""}
              mentionUsers={mentionUsers.data?.data || []}
              allowWorkspaceAllMention={false}
              minHeight={220}
              maxHeight="none"
              className="w-full"
            />
          </Form.Item>

          <Form.Item
            name="assigneeIds"
            label="Assignees"
            rules={[{ required: true, type: "array", min: 1, message: "Select at least one assignee" }]}
          >
            <NotulensiUserSelect />
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(previous, current) => previous.assigneeIds !== current.assigneeIds}>
            {() => (
              <Checkbox
                disabled={!canAssignSelf}
                checked={Boolean(currentUser?.id && form.getFieldValue("assigneeIds")?.includes(currentUser.id))}
                title={assignSelfReason}
                onChange={(event) => {
                  if (!canAssignSelf || !currentUser?.id) return;
                  const ids = form.getFieldValue("assigneeIds") || [];
                  form.setFieldValue(
                    "assigneeIds",
                    event.target.checked
                      ? Array.from(new Set([...ids, currentUser.id]))
                      : ids.filter((id: string) => id !== currentUser.id)
                  );
                  form.validateFields(["assigneeIds"]);
                }}
              >
                Assign to me
                {assignSelfReason ? ` (${assignSelfReason})` : ""}
              </Checkbox>
            )}
          </Form.Item>

          <Form.Item name="priority" label="Priority" rules={[{ required: true, message: "Priority is required" }]}>
            <Select
              options={Object.entries(NOTULENSI_PRIORITY_META).map(([value, meta]) => ({
                value,
                label: meta.label,
              }))}
            />
          </Form.Item>

          <Form.Item name="dueDate" label="Due date">
            <DatePicker showTime className="w-full" />
          </Form.Item>

          {mode === "create" ? (
            <div className="md:col-span-2">
              <div className="mb-2">
                <Typography.Text strong>
                  <Paperclip className="mr-2 inline" size={16} aria-hidden="true" />
                  Attachments
                </Typography.Text>
                <Typography.Text type="secondary" className="ml-2">
                  Files up to {MAX_NOTULENSI_ATTACHMENT_SIZE / 1024 / 1024} MB each
                </Typography.Text>
              </div>
              <div
                className={`rounded-xl border-2 border-dashed p-5 text-center transition-colors ${
                  isDraggingAttachment
                    ? "border-[rgb(var(--color-primary))] bg-[rgb(var(--color-background))]"
                    : "border-[rgb(var(--color-border))]"
                }`}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setIsDraggingAttachment(true);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "copy";
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
                  queueFiles(Array.from(event.dataTransfer.files));
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
                  {isDraggingAttachment ? "Drop files to queue" : "Drag and drop files here"}
                </Typography.Text>
                <Button icon={<Upload size={16} />} onClick={() => fileInputRef.current?.click()}>
                  Choose files
                </Button>
              </div>
              {queuedFiles.length ? (
                <div className="mt-3 flex flex-col gap-2">
                  {queuedFiles.map((file, index) => (
                    <div
                      key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                      className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-[rgb(var(--color-border))] px-3 py-2"
                    >
                      <Typography.Text ellipsis title={file.name} className="min-w-0">
                        {file.name}
                      </Typography.Text>
                      <Button
                        type="text"
                        danger
                        icon={<Trash2 size={16} />}
                        aria-label={`Remove ${file.name}`}
                        onClick={() => setQueuedFiles((files) => files.filter((_, fileIndex) => fileIndex !== index))}
                      />
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex flex-col gap-3 pb-[env(safe-area-inset-bottom)] md:flex-row md:justify-end md:pb-0">
          <Link href={cancelHref} className="w-full md:w-auto">
            <Button block>Cancel</Button>
          </Link>
          <Button type="primary" htmlType="submit" loading={submitting} className="w-full md:w-auto">
            {mode === "create" ? "Create instruction" : "Save changes"}
          </Button>
        </div>
      </Form>
    </div>
  );
}
