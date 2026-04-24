import { getOperatorSablon, OperatorSablonRow } from "@api/stitch_attachment";
import { Card } from "@myTypes/card";
import { useQuery } from "@tanstack/react-query";
import { Alert, Empty, Spin, Table, Typography } from "antd";
import { ColumnsType } from "antd/es/table";
import { useMemo } from "react";

interface SablonSectionProps {
  card: Card;
  workspaceId: string;
  boardId: string;
}

interface SablonRowView {
  key: string;
  tanggal: string;
  operator: string;
  jenisOrder: string;
  namaFile: string;
  jumlahDtf: number;
}

const SablonSection: React.FC<SablonSectionProps> = ({ card }) => {
  const {
    data: sablonResponse,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["operator-sablon", card.id],
    queryFn: () => getOperatorSablon(card.id),
    enabled: !!card.id,
    staleTime: 10_000,
  });

  const sablonRows = sablonResponse?.data || [];

  const tableRows = useMemo<SablonRowView[]>(
    () =>
      sablonRows.map((row: OperatorSablonRow, i: number) => ({
        key: `${row.tanggal}-${i}`,
        tanggal: row.tanggal || "-",
        operator: row.operator || "-",
        jenisOrder: row.jenis_order || "-",
        namaFile: row.nama_file || "-",
        jumlahDtf: Number(row.jumlah_dtf || 0),
      })),
    [sablonRows],
  );

  const grandTotal = sablonResponse?.summary?.total_jumlah_dtf
    ?? tableRows.reduce((sum, row) => sum + row.jumlahDtf, 0);

  const formatTanggal = (value: string): string => {
    if (!value || value === "-") return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const columns = useMemo<ColumnsType<SablonRowView>>(
    () => [
      {
        title: "Tanggal",
        dataIndex: "tanggal",
        key: "tanggal",
        width: 170,
        render: (value: string) => formatTanggal(value),
      },
      {
        title: "Operator",
        dataIndex: "operator",
        key: "operator",
        width: 180,
      },
      {
        title: "Jenis Order",
        dataIndex: "jenisOrder",
        key: "jenisOrder",
        width: 140,
      },
      {
        title: "Nama File",
        dataIndex: "namaFile",
        key: "namaFile",
        ellipsis: true,
        width: 180,
      },
      {
        title: "Jml DTF",
        dataIndex: "jumlahDtf",
        key: "jumlahDtf",
        width: 120,
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
        message="Failed to load sablon data"
        description={(error as any)?.message || "Please try again later"}
      />
    );
  }

  if (tableRows.length === 0) {
    return <Empty description="No sablon data yet" />;
  }

  return (
    <div className="bg-white p-4 rounded-lg mt-2">
      <Table<SablonRowView>
        rowKey="key"
        dataSource={tableRows}
        columns={columns}
        pagination={false}
        size="small"
        scroll={{ x: 800 }}
      />
      <div className="flex justify-end pt-3">
        <Typography.Text strong>
          Grand Total DTF: {grandTotal.toLocaleString("en-US")}
        </Typography.Text>
      </div>
    </div>
  );
};

export default SablonSection;
