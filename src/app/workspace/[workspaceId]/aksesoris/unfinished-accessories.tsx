"use client";

import { useMemo, useState } from "react";
import type { ColumnsType } from "antd/es/table";
import { Button, Empty, Progress, Spin, Table, Typography } from "antd";
import Link from "next/link";
import { UnfinishedAccessoryCard } from "@api/unfinished-accessory";
import { useUnfinishedAccessories } from "@hooks/useUnfinishedAccessories";

interface UnfinishedAccessoriesProps {
  workspaceId: string;
}

const UnfinishedAccessories: React.FC<UnfinishedAccessoriesProps> = ({
  workspaceId,
}) => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const { unfinishedCards, pagination, isLoading } = useUnfinishedAccessories(
    workspaceId,
    page,
    limit
  );

  const columns: ColumnsType<UnfinishedAccessoryCard> = useMemo(
    () => [
      {
        title: "Card Name",
        dataIndex: "cardName",
        key: "cardName",
        render: (_: string, record) => (
          <Link
            href={`/workspace/${workspaceId}/board/${record.boardId}?cardId=${record.cardId}`}
          >
            <Typography.Text strong>{record.cardName}</Typography.Text>
          </Link>
        ),
      },
      {
        title: "Board Name",
        dataIndex: "boardName",
        key: "boardName",
      },
      {
        title: "List",
        dataIndex: "listName",
        key: "listName",
      },
      {
        title: "Progress",
        key: "progress",
        render: (_: unknown, record) => {
          const percent =
            record.totalAccessories > 0
              ? Math.round(
                  (record.doneAccessories / record.totalAccessories) * 100
                )
              : 0;

          return (
            <div style={{ minWidth: 180 }}>
              <Progress percent={percent} size="small" />
              <Typography.Text type="secondary">
                {record.doneAccessories}/{record.totalAccessories}
              </Typography.Text>
            </div>
          );
        },
      },
      {
        title: "Actions",
        key: "actions",
        render: (_: unknown, record) => (
          <Link
            href={`/workspace/${workspaceId}/board/${record.boardId}?cardId=${record.cardId}`}
          >
            <Button type="link" style={{ padding: 0 }}>
              Open Card
            </Button>
          </Link>
        ),
      },
    ],
    [workspaceId]
  );

  return (
    <Spin spinning={isLoading}>
      <Table
        rowKey={(record) => record.cardId}
        dataSource={unfinishedCards}
        columns={columns}
        pagination={{
          current: pagination?.page ?? page,
          pageSize: pagination?.limit ?? limit,
          total: pagination?.totalData ?? 0,
          showSizeChanger: true,
          onChange: (nextPage, nextPageSize) => {
            if (nextPageSize !== limit) {
              setLimit(nextPageSize);
              setPage(1);
              return;
            }
            setPage(nextPage);
          },
        }}
        locale={{
          emptyText: (
            <Empty
              description="Tidak ada aksesoris yang belum selesai"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ),
        }}
      />
    </Spin>
  );
};

export default UnfinishedAccessories;
