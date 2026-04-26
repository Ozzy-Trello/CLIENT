"use client";

import { useState } from "react";
import { Table, Button, Tag, Space, Switch, Input, Popconfirm, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useAdminSessions, useRevokeSession, useRevokeAllSessions } from "@hooks/admin_sessions";
import type { SessionRow } from "@api/admin_sessions";

export default function AdminSessionsPage() {
  const [activeOnly, setActiveOnly] = useState(true);
  const [userIdFilter, setUserIdFilter] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useAdminSessions({
    active: activeOnly,
    userId: userIdFilter || undefined,
    page,
  });

  const revokeOne = useRevokeSession();
  const revokeAll = useRevokeAllSessions();

  const columns: ColumnsType<SessionRow> = [
    {
      title: "Status",
      width: 70,
      render: (_, row) =>
        row.revoked_at ? (
          <Tag color="default">Revoked</Tag>
        ) : (
          <Tag color="green">Active</Tag>
        ),
    },
    { title: "User ID", dataIndex: "user_id", ellipsis: true, width: 200 },
    { title: "IP", dataIndex: "ip_address", width: 130 },
    {
      title: "Device",
      render: (_, row) =>
        [row.browser_name, row.browser_version, row.os_name]
          .filter(Boolean)
          .join(" / ") || "—",
    },
    {
      title: "Location",
      render: (_, row) =>
        [row.geo_city, row.geo_country].filter(Boolean).join(", ") || "—",
    },
    {
      title: "Last seen",
      render: (_, row) => new Date(row.last_seen_at).toLocaleString(),
    },
    {
      title: "Actions",
      render: (_, row) =>
        row.revoked_at ? null : (
          <Space>
            <Popconfirm
              title="Revoke this session?"
              onConfirm={() =>
                revokeOne.mutate(row.id, {
                  onSuccess: () => message.success("Session revoked"),
                  onError: () => message.error("Failed"),
                })
              }
            >
              <Button size="small" danger>
                Kick
              </Button>
            </Popconfirm>
            <Popconfirm
              title={`Kick ALL sessions for user ${row.user_id}?`}
              onConfirm={() =>
                revokeAll.mutate(row.user_id, {
                  onSuccess: () => message.success("All sessions revoked"),
                  onError: () => message.error("Failed"),
                })
              }
            >
              <Button size="small" danger type="dashed">
                Kick all
              </Button>
            </Popconfirm>
          </Space>
        ),
    },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Active Sessions</h1>
      <Space className="mb-4">
        <Switch
          checked={activeOnly}
          onChange={setActiveOnly}
          checkedChildren="Active only"
          unCheckedChildren="Show all"
        />
        <Input.Search
          placeholder="Filter by user ID"
          allowClear
          onSearch={setUserIdFilter}
          style={{ width: 280 }}
        />
      </Space>
      <Table
        columns={columns}
        dataSource={data?.data ?? []}
        loading={isLoading}
        rowKey="id"
        pagination={{
          current: page,
          total: data?.total,
          pageSize: 20,
          onChange: setPage,
        }}
      />
    </div>
  );
}
