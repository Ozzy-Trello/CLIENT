import { getOperatorBordir, OperatorBordirRow } from "@api/stitch_attachment";
import { Card } from "@myTypes/card";
import { useQuery } from "@tanstack/react-query";
import { Alert, Empty, Spin, Table, Typography } from "antd";
import { ColumnsType } from "antd/es/table";
import { useMemo } from "react";

interface StitchSectionProps {
  card: Card;
  workspaceId: string;
  boardId: string;
}

interface StitchRowView {
  key: string;
  fileName: string;
  stitch: number;
  amount: number;
  total: number;
  designerName: string;
}

const StitchSection: React.FC<StitchSectionProps> = ({
  card,
}) => {
  const {
    data: bordirResponse,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["operator-bordir", card.id],
    queryFn: () => getOperatorBordir(card.id),
    enabled: !!card.id,
    staleTime: 10_000,
  });

  const bordirRows = bordirResponse?.data || [];

  const tableRows = useMemo<StitchRowView[]>(
    () =>
      bordirRows.map((row: OperatorBordirRow) => ({
        key: row.uuid,
        fileName: row.namaFile || "-",
        stitch: Number(row.stitch || 0),
        amount: Number(row.jumlahBordirPcs || 0),
        total: Number(row.totalStitch || 0),
        designerName: row.desainer || "-",
      })),
    [bordirRows],
  );

  const grandTotal = bordirResponse?.summary?.totalStitch
    ?? tableRows.reduce((sum, row) => sum + row.total, 0);

  const columns = useMemo<ColumnsType<StitchRowView>>(
    () => [
      {
        title: "Nama File",
        dataIndex: "fileName",
        key: "fileName",
        ellipsis: true,
      },
      {
        title: "Stitch",
        dataIndex: "stitch",
        key: "stitch",
        width: 120,
      },
      {
        title: "Jml",
        dataIndex: "amount",
        key: "amount",
        width: 100,
      },
      {
        title: "Total Stitch",
        dataIndex: "total",
        key: "total",
        width: 140,
        render: (value: number) => (
          <Typography.Text strong>{value.toLocaleString("en-US")}</Typography.Text>
        ),
      },
      {
        title: "Desainer",
        dataIndex: "designerName",
        key: "designerName",
        width: 220,
      },
    ],
    [],
  );

  if (isLoading) {
    return (
      <div className="p-4 flex justify-center">
        <Spin />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert
        type="error"
        message="Failed to load stitch data"
        description={(error as any)?.message || "Please try again later"}
      />
    );
  }

  if (tableRows.length === 0) {
    return <Empty description="No stitch data yet" />;
  }

  return (
    <div className="bg-white p-4 rounded-lg mt-2">
      <Table<StitchRowView>
        rowKey="key"
        dataSource={tableRows}
        columns={columns}
        pagination={false}
        size="small"
        scroll={{ x: 900 }}
      />
      <div className="flex justify-end pt-3">
        <Typography.Text strong>
          Grand Total Stitch: {grandTotal.toLocaleString("en-US")}
        </Typography.Text>
      </div>
    </div>
  );
};

export default StitchSection;
