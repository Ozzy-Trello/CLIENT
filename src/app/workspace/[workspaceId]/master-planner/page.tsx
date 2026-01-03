"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import dayjs, { Dayjs } from "dayjs";
import { DatePicker } from "antd";
import {
  useCreateMasterPlanner,
  useDeleteMasterPlanner,
  useMasterPlanners,
  useUpdateMasterPlanner,
} from "@hooks/master-planner";
import {
  MasterPlanner,
  MasterPlannerCreateRequest,
  PlannerConfig,
} from "@myTypes/master-planner";

const { Title, Text } = Typography;
const { TextArea } = Input;

type MultiDateProps = {
  label: string;
  value?: Dayjs[];
  onChange?: (val: Dayjs[]) => void;
};

const MultiDatePicker: React.FC<MultiDateProps> = ({ label, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const dates = value || [];

  const handleAdd = (date: Dayjs | null) => {
    if (!date) return;
    const exists = dates.some((d) => d.isSame(date, "day"));
    const next = exists ? dates : [...dates, date];
    onChange?.(next);
    setOpen(true); // keep open for multiple picks
  };

  const handleRemove = (date: Dayjs) => {
    const next = dates.filter((d) => !d.isSame(date, "day"));
    onChange?.(next);
  };

  return (
    <Space direction="vertical" style={{ width: "100%" }}>
      <Space wrap>
        <Button size="small" onClick={() => setOpen(true)}>
          Select {label.toLowerCase()}
        </Button>
        <DatePicker
          open={open}
          onOpenChange={(o) => setOpen(o)}
          onChange={handleAdd}
          allowClear={false}
          style={{
            position: "absolute",
            opacity: 0,
            pointerEvents: "none",
            width: 0,
            height: 0,
          }}
        />
        <Button size="small" type="link" onClick={() => setOpen(false)}>
          Done
        </Button>
      </Space>
      <Space wrap>
        {dates.length === 0 && (
          <Text type="secondary">No {label.toLowerCase()} selected</Text>
        )}
        {dates.map((d) => (
          <Tag
            key={d.format("YYYY-MM-DD")}
            closable
            onClose={() => handleRemove(d)}
          >
            {d.format("DD MMM YYYY")}
          </Tag>
        ))}
      </Space>
    </Space>
  );
};

const defaultConfig: PlannerConfig = {
  holidays: [],
  halfDays: [],
  lines: [],
};

const formatDate = (value?: string) => {
  if (!value) return "-";
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("DD MMM YYYY HH:mm") : "-";
};

const PlannerConfigPreview: React.FC<{ config?: PlannerConfig }> = ({
  config,
}) => {
  const holidays = config?.holidays?.length || 0;
  const halfDays =
    (config as any)?.half_days?.length || config?.halfDays?.length || 0;
  const lines = config?.lines || [];
  return (
    <Space size="small" wrap>
      <Tag color="blue">Lines: {lines.length}</Tag>
      <Tag color="green">Holidays: {holidays}</Tag>
      <Tag color="orange">Half days: {halfDays}</Tag>
      {lines.slice(0, 2).map((l) => (
        <Tag key={l.name} color="purple">
          {l.name}
        </Tag>
      ))}
    </Space>
  );
};

export default function MasterPlannerPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<MasterPlanner | null>(null);
  const [form] = Form.useForm();

  const { data: planners = [], isLoading } = useMasterPlanners();
  const createMutation = useCreateMasterPlanner();
  const updateMutation = useUpdateMasterPlanner();
  const deleteMutation = useDeleteMasterPlanner();

  useEffect(() => {
    const cfg: PlannerConfig = editing?.plannerConfig || defaultConfig;
    form.setFieldsValue({
      name: editing?.name ?? "",
      holidays: (cfg.holidays || []).map((d) => dayjs(d)),
      halfDays:
        (cfg as any)?.half_days?.map((d: string) => dayjs(d)) ||
        (cfg.halfDays || []).map((d) => dayjs(d)),
      lines:
        cfg.lines?.map((l) => ({
          name: l.name,
          capacity: l.capacity,
          halfDayCapacity: (l as any).half_day_capacity || l.halfDayCapacity,
        })) || [],
    });
  }, [editing, form]);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditing(null);
    form.resetFields();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      const normalizeDates = (arr?: Dayjs[]) =>
        (arr || []).map((d) => d.format("YYYY-MM-DD"));

      const payload: MasterPlannerCreateRequest = {
        name: values.name,
        plannerConfig: {
          holidays: normalizeDates(values.holidays),
          half_days: normalizeDates(values.halfDays),
          lines: (values.lines || []).map((l: any) => ({
            name: l.name,
            capacity: Number(l.capacity) || 0,
            half_day_capacity:
              l.halfDayCapacity !== undefined ? Number(l.halfDayCapacity) : 0,
          })),
        },
      };

      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, payload });
        message.success("Master planner updated");
      } else {
        await createMutation.mutateAsync(payload);
        message.success("Master planner created");
      }
      handleCloseModal();
    } catch (error) {
      // validation handled above
    }
  };

  const handleDelete = async (id: number) => {
    await deleteMutation.mutateAsync(id);
    message.success("Master planner deleted");
  };

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (value: string) => <Text strong>{value}</Text>,
    },
    {
      title: "Config",
      dataIndex: "plannerConfig",
      key: "plannerConfig",
      render: (config: PlannerConfig) => <PlannerConfigPreview config={config} />,
    },
    {
      title: "Updated",
      dataIndex: "updatedAt",
      key: "updatedAt",
      render: (val: string) => <Text type="secondary">{formatDate(val)}</Text>,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: any, record: MasterPlanner) => (
        <Space>
          <Button
            size="small"
            onClick={() => {
              setEditing(record);
              setIsModalOpen(true);
            }}
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete master planner?"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button danger size="small">
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-4">
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <Space
          style={{ width: "100%", justifyContent: "space-between", flexWrap: "wrap" }}
        >
          <Title level={3} style={{ margin: 0 }}>
            Master Planner
          </Title>
          <Button
            type="primary"
            onClick={() => {
              setEditing(null);
              setIsModalOpen(true);
            }}
          >
            New Master Planner
          </Button>
        </Space>

        <Card>
          <Table
            rowKey="id"
            loading={isLoading}
            columns={columns}
            dataSource={planners}
            pagination={false}
            locale={{
              emptyText: "No master planners yet",
            }}
          />
        </Card>
      </Space>

      <Modal
        open={isModalOpen}
        title={editing ? "Edit Master Planner" : "New Master Planner"}
        onCancel={handleCloseModal}
        onOk={handleSubmit}
        confirmLoading={
          createMutation.isPending || updateMutation.isPending
        }
        styles={{
          body:{
            padding:'1rem',
          }
        }}
        okText={editing ? "Update" : "Create"}
      >
        <Form layout="vertical" form={form}>
          <Form.Item
            label="Name"
            name="name"
            rules={[{ required: true, message: "Name is required" }]}
          >
            <Input placeholder="Planner name" />
          </Form.Item>
          <Card title="Holidays" size="small">
            <Form.Item name="holidays">
              <MultiDatePicker label="holidays" />
            </Form.Item>
          </Card>

          <Card title="Half Days" size="small" style={{ marginTop: 12 }}>
            <Form.Item name="halfDays">
              <MultiDatePicker label="half days" />
            </Form.Item>
          </Card>

          <Form.List name="lines">
            {(fields, { add, remove }) => (
              <Card
                title="Lines"
                size="small"
                style={{ marginTop: 12 }}
                extra={
                  <Button type="dashed" onClick={() => add()} size="small">
                    Add line
                  </Button>
                }
              >
                {fields.length === 0 && (
                  <Text type="secondary">No lines added</Text>
                )}
                <Space direction="vertical" style={{ width: "100%" }}>
                  {fields.map((field) => (
                    <Card key={field.key} size="small">
                      <Space
                        direction="vertical"
                        style={{ width: "100%" }}
                        size="small"
                      >
                        <Form.Item
                          {...field}
                          name={[field.name, "name"]}
                          label="Line name"
                          rules={[
                            { required: true, message: "Line name is required" },
                          ]}
                        >
                          <Input placeholder="e.g. Line 1" />
                        </Form.Item>
                        <Form.Item
                          {...field}
                          name={[field.name, "capacity"]}
                          label="Capacity"
                          rules={[
                            {
                              required: true,
                              message: "Capacity is required",
                            },
                          ]}
                        >
                          <InputNumber
                            min={0}
                            style={{ width: "100%" }}
                            placeholder="1500"
                          />
                        </Form.Item>
                        <Form.Item
                          {...field}
                          name={[field.name, "halfDayCapacity"]}
                          label="Half-day capacity"
                        >
                          <InputNumber
                            min={0}
                            style={{ width: "100%" }}
                            placeholder="750"
                          />
                        </Form.Item>
                        <Button
                          danger
                          size="small"
                          onClick={() => remove(field.name)}
                        >
                          Remove line
                        </Button>
                      </Space>
                    </Card>
                  ))}
                </Space>
              </Card>
            )}
          </Form.List>
        </Form>
      </Modal>
    </div>
  );
}
