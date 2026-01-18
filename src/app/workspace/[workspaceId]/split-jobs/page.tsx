"use client";

import React, { useMemo } from "react";
import { Card, Table, Typography, Space, Tag } from "antd";
import dayjs from "dayjs";
import { useParams } from "next/navigation";
import { useAllSplitJobs } from "@hooks/split_job";

const { Title, Text } = Typography;

const formatNumber = (val: any) => {
  if (val === null || val === undefined) return "-";
  const num = typeof val === "number" ? val : Number(String(val).replace(/,/g, ""));
  if (!Number.isFinite(num)) return "-";
  const hasFraction = Math.abs(num - Math.trunc(num)) > 1e-6;
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  });
};

const formatDate = (val?: string | null) => {
  if (!val) return "-";
  const d = dayjs(val);
  return d.isValid() ? d.format("DD MMM YYYY") : "-";
};

export default function SplitJobsPage() {
  const params = useParams();
  const workspaceId = Array.isArray(params?.workspaceId)
    ? params.workspaceId[0]
    : (params?.workspaceId as string | undefined);

  const { data = [], isLoading } = useAllSplitJobs(workspaceId);

  const cardGroups = useMemo(() => data, [data]);

  const columns = [
    {
      title: "Template",
      dataIndex: "templateName",
      key: "templateName",
      render: (v: string | undefined) => v || "-",
    },
    {
      title: "Custom Field",
      dataIndex: "customFieldName",
      key: "customFieldName",
      render: (v: string | undefined) => v || "-",
    },
    {
      title: "Split Name",
      dataIndex: "name",
      key: "name",
      render: (v: string) => <Text strong>{v}</Text>,
    },
    {
      title: "Value",
      dataIndex: "value",
      key: "value",
      render: (v: number) => formatNumber(v),
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (v: string | null) => formatDate(v),
    },
    {
      title: "Updated",
      dataIndex: "updatedAt",
      key: "updatedAt",
      render: (v: string | null) => formatDate(v),
    },
  ];

  return (
    <div className="p-4">
      <Title level={3} style={{ marginBottom: 16 }}>
        Split Jobs
      </Title>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        {cardGroups.length === 0 && (
          <Card>
            <Text type="secondary">No split jobs found.</Text>
          </Card>
        )}
        {cardGroups.map((card) => (
          <Card key={card.cardId || card.cardName} title={
            <Space direction="vertical" size={0}>
              <Text strong>{card.cardName}</Text>
              <Space size="small">
                {card.boardName && <Tag>{card.boardName}</Tag>}
                {card.listName && <Tag color="blue">{card.listName}</Tag>}
                {card.dueDate && <Tag color="gold">Due {formatDate(card.dueDate)}</Tag>}
              </Space>
            </Space>
          }>
            <Table
              loading={isLoading}
              dataSource={card.items.map((item) => ({
                ...item,
                key: item.id,
                templateName: item.templateName || "-",
                customFieldName: item.customFieldName || "-",
              }))}
              columns={columns}
              size="small"
              pagination={{ pageSize: 20 }}
              scroll={{ x: "max-content" }}
            />
          </Card>
        ))}
      </Space>
    </div>
  );
}
