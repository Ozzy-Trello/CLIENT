"use client";

import RichTextEditor from "@components/rich-text-editor";
import NotulensiUserSelect from "@components/notulensi/notulensi-user-select";
import { NOTULENSI_PRIORITY_META } from "@components/notulensi/notulensi-status";
import { selectUser } from "@store/app_slice";
import { useNotulensiEligibleAssignees } from "@hooks/notulensi";
import {
  CreateNotulensiPayload,
  NotulensiDetail,
  NotulensiPriority,
  UpdateNotulensiPayload,
} from "@myTypes/notulensi";
import { Button, Checkbox, DatePicker, Form, Grid, Input, Result, Select } from "antd";
import dayjs, { Dayjs } from "dayjs";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
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
  onSubmit: (payload: CreateNotulensiPayload | UpdateNotulensiPayload) => Promise<void> | void;
  cancelHref: string;
};

const stripHtml = (value: string) =>
  value.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").trim();

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
  const currentUser = useSelector(selectUser);
  const params = useParams();
  const workspaceId = Array.isArray(params.workspaceId)
    ? params.workspaceId[0]
    : params.workspaceId || "";
  const eligibleAssignees = useNotulensiEligibleAssignees(workspaceId);
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
            <RichTextEditor
              initialValue={initialData?.content || ""}
              minHeight={220}
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
