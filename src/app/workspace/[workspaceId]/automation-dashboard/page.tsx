"use client";

import {
  Table,
  Typography,
  Card,
  Space,
  Button,
  Input,
  message,
  Popconfirm,
  Empty,
  Tag,
} from "antd";
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
  cardShortId: number | null;
  boardId: string | null;
  boardName: string | null;
  listId: string | null;
  listName: string | null;
  actionType: string | null;
  actionLabel: string | null;
  status: string;
  errorMessage: string | null;
  failureMessage: string | null;
  eventType: string | null;
  eventLabel: string | null;
  triggerLabel: string | null;
  filterLabel: string | null;
  ruleSummary: string | null;
  stage: string | null;
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
  const { isSuperAdmin } = usePermissions();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [searchDraft, setSearchDraft] = useState("");
  const [cardNameSearch, setCardNameSearch] = useState("");
  const pageSize = 30;
  const statuses = ["failed", "recovered"];

  const { data, isLoading, isFetching } = useQuery<LogResponse>({
    queryKey: [
      "automation-execution-log",
      statuses.join(","),
      page,
      cardNameSearch,
    ],
    queryFn: async () => {
      const params: Record<string, any> = {
        limit: pageSize,
        offset: (page - 1) * pageSize,
        statuses: statuses.join(","),
      };
      if (cardNameSearch) {
        params.card_name = cardNameSearch;
      }
      const res = await api.get("/automation-rule/execution-log", { params });
      return res.data;
    },
    refetchInterval: 30000,
  });

  const submitCardSearch = (value: string) => {
    const nextValue = value.trim();
    setPage(1);
    setCardNameSearch(nextValue);
  };

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
      width: 120,
      render: (value: string) => {
        const normalized = (value || "").toLowerCase();
        const color =
          normalized === "recovered"
            ? "green"
            : normalized === "failed"
              ? "red"
              : "default";
        const label =
          normalized === "recovered"
            ? "RECOVERED"
            : normalized === "failed"
              ? "FAILED"
              : (value || "UNKNOWN").toUpperCase();
        return <Tag color={color}>{label}</Tag>;
      },
    },
    {
      title: "Card",
      dataIndex: "cardName",
      key: "cardName",
      width: 260,
      render: (_: string, record: ExecutionLog) => (
        <div>
          <div>{record.cardName || "System event"}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {[
              record.boardName,
              record.listName,
              record.cardShortId ? `#${record.cardShortId}` : null,
            ]
              .filter(Boolean)
              .join(" / ") ||
              (record.cardId ? "Card context unavailable" : "Infrastructure / queue / subscriber event")}
          </Text>
        </div>
      ),
    },
    {
      title: "Failed Step",
      dataIndex: "actionLabel",
      key: "actionLabel",
      width: 280,
      render: (_: string, record: ExecutionLog) => (
        <div>
          <div>{record.actionLabel || record.actionType || "Unknown step"}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.stage || "Failure"}
          </Text>
        </div>
      ),
    },
    {
      title: "Details",
      dataIndex: "failureMessage",
      key: "failureMessage",
      render: (_: string, record: ExecutionLog) => (
        <Text
          type={record.status === "failed" ? "danger" : undefined}
          style={{ fontSize: 12, whiteSpace: "pre-wrap" }}
        >
          {record.failureMessage || record.errorMessage || "No error details"}
        </Text>
      ),
    },
    {
      title: "Trigger",
      dataIndex: "triggerLabel",
      key: "triggerLabel",
      width: 280,
      render: (_: string, record: ExecutionLog) => (
        <div>
          <div>{record.triggerLabel || record.eventLabel || "Unknown trigger"}</div>
          {record.eventLabel &&
            record.triggerLabel &&
            record.eventLabel !== record.triggerLabel && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                Event: {record.eventLabel}
              </Text>
            )}
        </div>
      ),
    },
    {
      title: "Rule",
      dataIndex: "ruleSummary",
      key: "ruleSummary",
      width: 260,
      render: (_: string, record: ExecutionLog) => (
        <div>
          <div>{record.ruleSummary || "Rule context unavailable"}</div>
          {record.ruleId ? (
            <Text copyable style={{ fontSize: 11 }}>
              {record.ruleId.substring(0, 8)}...
            </Text>
          ) : (
            <Text type="secondary" style={{ fontSize: 11 }}>
              No rule ID
            </Text>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="page scrollable-page">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <Title level={4} style={{ margin: 0 }}>
            Automation Failures & Recovery
          </Title>
          <Space>
            <Input.Search
              placeholder="Search card name"
              allowClear
              value={searchDraft}
              onChange={(event) => {
                const nextValue = event.target.value;
                setSearchDraft(nextValue);
                if (!nextValue.trim()) {
                  submitCardSearch("");
                }
              }}
              onSearch={(value) => {
                setSearchDraft(value);
                submitCardSearch(value);
              }}
              style={{ width: 280 }}
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
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No automation failures or recovery events"
                />
              ),
            }}
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
