"use client";

import {
  Table,
  Typography,
  Tag,
  Card,
  Space,
  Button,
  Select,
  message,
  Popconfirm,
} from "antd";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../../api";
import { usePermissions } from "@hooks/account";
import { useState } from "react";
import { Trash2, RefreshCw } from "lucide-react";
import type { ColumnsType } from "antd/es/table";

const { Title, Text } = Typography;

interface ExecutionLog {
  id: string;
  ruleId: string | null;
  cardId: string | null;
  cardName: string | null;
  boardId: string | null;
  listId: string | null;
  actionType: string | null;
  status: string;
  errorMessage: string | null;
  eventType: string | null;
  createdAt: string;
}

interface LogResponse {
  statusCode: number;
  data: ExecutionLog[];
  total: number;
  limit: number;
  offset: number;
}

const AutomationDashboard = () => {
  const { workspaceId } = useParams();
  const { isSuperAdmin } = usePermissions();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<string | undefined>(
    undefined
  );
  const [page, setPage] = useState(1);
  const pageSize = 30;

  const { data, isLoading, isFetching } = useQuery<LogResponse>({
    queryKey: ["automation-execution-log", statusFilter, page],
    queryFn: async () => {
      const params: Record<string, any> = {
        limit: pageSize,
        offset: (page - 1) * pageSize,
      };
      if (statusFilter) params.status = statusFilter;
      const res = await api.get("/automation-rule/execution-log", { params });
      return res.data;
    },
    refetchInterval: 30000,
  });

  const cleanupMutation = useMutation({
    mutationFn: async (days: number) => {
      const res = await api.delete("/automation-rule/execution-log", {
        params: { days },
      });
      return res.data;
    },
    onSuccess: (data) => {
      message.success(data.message || "Cleanup done");
      queryClient.invalidateQueries({
        queryKey: ["automation-execution-log"],
      });
    },
    onError: () => {
      message.error("Failed to cleanup logs");
    },
  });

  if (!isSuperAdmin()) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Title level={3} type="secondary">
          Access Denied
        </Title>
        <Text type="secondary">
          You don&apos;t have permission to view this page.
        </Text>
      </div>
    );
  }

  const columns: ColumnsType<ExecutionLog> = [
    {
      title: "Time",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 160,
      render: (val: string) => {
        if (!val) return "-";
        const d = new Date(val);
        return d.toLocaleString("id-ID", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 90,
      render: (status: string) => (
        <Tag color={status === "failed" ? "red" : "orange"}>
          {status?.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "Action",
      dataIndex: "actionType",
      key: "actionType",
      width: 160,
      render: (val: string) => (
        <Text code style={{ fontSize: 12 }}>
          {val || "-"}
        </Text>
      ),
    },
    {
      title: "Card",
      dataIndex: "cardName",
      key: "cardName",
      ellipsis: true,
      render: (name: string, record: ExecutionLog) => (
        <div>
          <div>{name || "-"}</div>
          {record.cardId && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              {record.cardId.substring(0, 8)}...
            </Text>
          )}
        </div>
      ),
    },
    {
      title: "Error",
      dataIndex: "errorMessage",
      key: "errorMessage",
      ellipsis: true,
      render: (val: string) => (
        <Text
          type="danger"
          style={{ fontSize: 12 }}
          ellipsis={{ tooltip: val }}
        >
          {val || "-"}
        </Text>
      ),
    },
    {
      title: "Trigger",
      dataIndex: "eventType",
      key: "eventType",
      width: 160,
      render: (val: string) =>
        val ? (
          <Text style={{ fontSize: 12 }}>{val}</Text>
        ) : (
          "-"
        ),
    },
    {
      title: "Rule ID",
      dataIndex: "ruleId",
      key: "ruleId",
      width: 120,
      render: (val: string) =>
        val ? (
          <Text copyable style={{ fontSize: 11 }}>
            {val.substring(0, 8)}...
          </Text>
        ) : (
          "-"
        ),
    },
  ];

  return (
    <div className="page scrollable-page">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <Title level={4} style={{ margin: 0 }}>
            Automation Failures
          </Title>
          <Space>
            <Select
              placeholder="Filter status"
              allowClear
              style={{ width: 140 }}
              value={statusFilter}
              onChange={(val) => {
                setStatusFilter(val);
                setPage(1);
              }}
              options={[
                { label: "Failed", value: "failed" },
                { label: "Skipped", value: "skipped" },
              ]}
            />
            <Button
              icon={<RefreshCw size={14} />}
              onClick={() =>
                queryClient.invalidateQueries({
                  queryKey: ["automation-execution-log"],
                })
              }
              loading={isFetching}
            >
              Refresh
            </Button>
            <Popconfirm
              title="Cleanup old logs"
              description="Delete logs older than 3 days?"
              onConfirm={() => cleanupMutation.mutate(3)}
              okText="Delete"
              okButtonProps={{ danger: true }}
            >
              <Button
                danger
                icon={<Trash2 size={14} />}
                loading={cleanupMutation.isPending}
              >
                Cleanup
              </Button>
            </Popconfirm>
          </Space>
        </div>

        <Card>
          <Table
            columns={columns}
            dataSource={data?.data || []}
            rowKey="id"
            loading={isLoading}
            size="small"
            pagination={{
              current: page,
              pageSize,
              total: data?.total || 0,
              onChange: (p) => setPage(p),
              showTotal: (total) => `${total} total`,
              showSizeChanger: false,
            }}
          />
        </Card>
      </div>
    </div>
  );
};

export default AutomationDashboard;
