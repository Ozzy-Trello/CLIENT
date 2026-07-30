"use client";

import RichTextEditor from "@components/rich-text-editor";
import NotulensiUserSelect from "@components/notulensi/notulensi-user-select";
import { NOTULENSI_PRIORITY_META, NOTULENSI_STATUS_META } from "@components/notulensi/notulensi-status";
import {
  CreateNotulensiPayload,
  NotulensiDetail,
  NotulensiPriority,
  NotulensiStatus,
  UpdateNotulensiPayload,
} from "@myTypes/notulensi";
import { Button, DatePicker, Form, Grid, Input, Result, Select } from "antd";
import dayjs, { Dayjs } from "dayjs";
import Link from "next/link";
import { useMemo } from "react";

type FormValues = {
  title: string;
  content: string;
  assigneeIds: string[];
  priority: NotulensiPriority;
  dueDate?: Dayjs;
  status?: "draft" | "open";
};

type Props = {
  mode: "create" | "edit";
  initialData?: NotulensiDetail;
  loading?: boolean;
  submitting?: boolean;
  canEdit?: boolean;
  onSubmit: (payload: CreateNotulensiPayload | UpdateNotulensiPayload) => Promise<void> | void;
  cancelHref: string;
};

const stripHtml = (value: string) =>
  value.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").trim();

const CREATE_STATUS_OPTIONS: Array<Extract<NotulensiStatus, "draft" | "open">> = [
  "draft",
  "open",
];

export default function NotulensiForm({
  mode,
  initialData,
  loading,
  submitting,
  canEdit = true,
  onSubmit,
  cancelHref,
}: Props) {
  const screens = Grid.useBreakpoint();
  const [form] = Form.useForm<FormValues>();

  const initialValues = useMemo<FormValues | undefined>(() => {
    if (!initialData) {
      return {
        priority: "medium",
        status: "draft",
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
    <div className="mx-auto max-w-[900px] rounded-2xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-4 md:p-6">
      <Form<FormValues>
        form={form}
        layout="vertical"
        initialValues={initialValues}
        disabled={loading || !canEdit}
        onFinish={async (values) => {
          const payload = {
            title: values.title.trim(),
            content: values.content,
            priority: values.priority,
            dueDate: values.dueDate?.toISOString() || null,
            assigneeIds: values.assigneeIds,
            ...(mode === "create" ? { status: values.status || "draft" } : {}),
          };

          await onSubmit(payload as CreateNotulensiPayload | UpdateNotulensiPayload);
        }}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
            rules={[
              { required: true, message: "Content is required" },
              {
                validator: async (_, value) => {
                  if (!stripHtml(value || "")) {
                    throw new Error("Content cannot be empty");
                  }
                },
              },
            ]}
          >
            <Form.Item noStyle shouldUpdate>
              {() => (
                <RichTextEditor
                  initialValue={form.getFieldValue("content") || ""}
                  minHeight={220}
                  className="w-full"
                  onChange={(content) => form.setFieldValue("content", content)}
                />
              )}
            </Form.Item>
          </Form.Item>

          <Form.Item
            name="assigneeIds"
            label="Assignees"
            rules={[{ required: true, type: "array", min: 1, message: "Select at least one assignee" }]}
          >
            <NotulensiUserSelect />
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
            <Form.Item name="status" label="Initial status" rules={[{ required: true, message: "Status is required" }]}>
              <Select
                options={CREATE_STATUS_OPTIONS.map((value) => ({
                  value,
                  label: NOTULENSI_STATUS_META[value].label,
                }))}
              />
            </Form.Item>
          ) : null}
        </div>

        <div className={`mt-6 flex gap-3 ${screens.md ? "justify-end" : "flex-col"}`}>
          <Link href={cancelHref}>
            <Button block={!screens.md}>Cancel</Button>
          </Link>
          <Button type="primary" htmlType="submit" loading={submitting} block={!screens.md}>
            {mode === "create" ? "Create instruction" : "Save changes"}
          </Button>
        </div>
      </Form>
    </div>
  );
}
