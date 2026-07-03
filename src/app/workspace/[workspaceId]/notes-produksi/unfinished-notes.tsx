"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColumnsType } from "antd/es/table";
import { Empty, Popover, Select, Spin, Table, Tag, Typography } from "antd";
import dayjs from "dayjs";
import Link from "next/link";
import { UnfinishedCardNoteCard } from "@api/card_notes";
import { useUnfinishedCardNotes } from "@hooks/useUnfinishedCardNotes";
import { useRoles } from "@hooks/useRoles";
import { useSelector } from "react-redux";
import { selectUser } from "@store/app_slice";

interface UnfinishedNotesProps {
  workspaceId: string;
}

const SHOW_ALL_VALUE = "__show_all__";

const noteDivisionName = (note: UnfinishedCardNoteCard["notes"][number]) =>
  note.divisionName ?? note.division_name ?? "PIC";

const UnfinishedNotes: React.FC<UnfinishedNotesProps> = ({ workspaceId }) => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selectedPicRoleId, setSelectedPicRoleId] = useState<string | undefined>();
  const { roles, loading: rolesLoading } = useRoles(workspaceId);
  const currentUser = useSelector(selectUser);
  const defaultPicRoleId = currentUser?.role?.id;

  useEffect(() => {
    if (selectedPicRoleId !== undefined) return;
    setSelectedPicRoleId(defaultPicRoleId || SHOW_ALL_VALUE);
  }, [defaultPicRoleId, selectedPicRoleId]);

  const resolvedPicRoleId =
    selectedPicRoleId === SHOW_ALL_VALUE ? undefined : selectedPicRoleId;

  const { unfinishedCards, pagination, isLoading } = useUnfinishedCardNotes(
    workspaceId,
    page,
    limit,
    resolvedPicRoleId,
  );

  const picOptions = useMemo(
    () => [
      { label: "Show All", value: SHOW_ALL_VALUE },
      ...roles.map((role) => ({ label: role.name, value: role.id })),
    ],
    [roles],
  );

  const columns: ColumnsType<UnfinishedCardNoteCard> = useMemo(
    () => [
      {
        title: "Card Name",
        dataIndex: "cardName",
        key: "cardName",
        render: (_: string, record) => {
          const href = record.listId
            ? `/workspace/${workspaceId}/board/${record.boardId}?listId=${record.listId}&cardId=${record.cardId}`
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
        width: 180,
        render: (_: unknown, record) => {
          const percent = record.totalNotes > 0
            ? Math.round((record.doneNotes / record.totalNotes) * 100)
            : 0;
          const popoverContent = (
            <div className="min-w-[260px] space-y-2">
              <div className="flex gap-2">
                <Tag color="green">Done: {record.doneNotes}</Tag>
                <Tag color="red">Undone: {record.undoneNotes}</Tag>
                <Tag>Total: {record.totalNotes}</Tag>
              </div>
              <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
                {(record.notes || []).map((note) => (
                  <div key={note.id} className="text-xs leading-5">
                    <Tag color={note.done ? "green" : "red"}>
                      {note.done ? "Done" : "Undone"}
                    </Tag>
                    <Tag>{noteDivisionName(note)}</Tag>
                    <span>{note.note}</span>
                  </div>
                ))}
              </div>
            </div>
          );

          return (
            <Popover content={popoverContent} trigger="click" placement="topLeft">
              <button type="button" className="text-left">
                <Typography.Text type="secondary">
                  {record.doneNotes}/{record.totalNotes} ({percent}%)
                </Typography.Text>
              </button>
            </Popover>
          );
        },
      },
      {
        title: "Notes Produksi",
        key: "notes",
        ellipsis: true,
        render: (_: unknown, record) => {
          const notes = (record.notes || [])
            .map((item) => item.note)
            .filter(Boolean)
            .join(", ");

          return (
            <Typography.Text title={notes} style={{ display: "block", maxWidth: 560 }}>
              {notes || "-"}
            </Typography.Text>
          );
        },
      },
    ],
    [workspaceId],
  );

  return (
    <Spin spinning={isLoading}>
      <div className="mb-3 flex items-center gap-2">
        <Typography.Text className="font-medium text-gray-700">PIC</Typography.Text>
        <Select
          className="min-w-[240px]"
          allowClear
          loading={rolesLoading}
          options={picOptions}
          placeholder="Semua PIC"
          value={selectedPicRoleId ?? SHOW_ALL_VALUE}
          onChange={(value) => {
            setSelectedPicRoleId(value ?? SHOW_ALL_VALUE);
            setPage(1);
          }}
          showSearch
          optionFilterProp="label"
        />
      </div>
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
              description="Tidak ada notes produksi yang belum selesai"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ),
        }}
      />
    </Spin>
  );
};

export default UnfinishedNotes;
