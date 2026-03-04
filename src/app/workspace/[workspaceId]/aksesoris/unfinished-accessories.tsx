"use client";

import { useMemo, useState } from "react";
import type { ColumnsType } from "antd/es/table";
import { Empty, Spin, Table, Typography } from "antd";
import dayjs from "dayjs";
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
        render: (_: string, record) => {
          const listId = record.listId;
          const href = listId
            ? `/workspace/${workspaceId}/board/${record.boardId}?listId=${listId}&cardId=${record.cardId}`
            : `/workspace/${workspaceId}/board/${record.boardId}?cardId=${record.cardId}`;

          return (
            <Link href={href} prefetch={false}>
              <Typography.Link strong>{record.cardName}</Typography.Link>
            </Link>
          );
        },
      },
      {
        title: "List",
        dataIndex: "listName",
        key: "listName",
        width: 180,
      },
      {
        title: "Due Date",
        dataIndex: "dueDate",
        key: "dueDate",
        width: 140,
        render: (value?: string | null) =>
          value ? dayjs(value).format("DD MMM YYYY") : "-",
      },
      {
        title: "Progress",
        key: "progress",
        width: 120,
        render: (_: unknown, record) => {
          const percent =
            record.totalAccessories > 0
              ? Math.round(
                  (record.doneAccessories / record.totalAccessories) * 100
                )
              : 0;

          return (
            <Typography.Text type="secondary">
              {record.doneAccessories}/{record.totalAccessories} ({percent}%)
            </Typography.Text>
          );
        },
      },
      {
        title: "Aksesoris",
        key: "accessories",
        ellipsis: true,
        render: (_: unknown, record) => {
          const names = (record.accessories || [])
            .map((item) => item.accessoryName)
            .filter(Boolean)
            .join(", ");

          return (
            <Typography.Text
              title={names}
              style={{ display: "block", maxWidth: 560 }}
            >
              {names || "-"}
            </Typography.Text>
          );
        },
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
