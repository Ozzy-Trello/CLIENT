import {
  getAllRequests,
  updateRequest,
  updateWarehouseReturn,
  updateWarehouseFinalAmount,
} from "@/app/api/accurate";
import { Button, Checkbox, Input, Modal, Table, message } from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useState, useEffect, useRef } from "react";
import { debounce } from "lodash";

interface ApiResponse<T> {
  data: T[];
  pagination?: {
    total: number;
  };
}

interface RequestItem {
  id: string;
  cardName: string;
  requestType: string;
  itemName: string;
  requestAmount: number;
  adjustmentName: string;
  description: string;
  requestSent?: number;
  isVerified?: boolean;
  productionReceived?: boolean;
  warehouseReturned?: boolean;
  warehouseFinalUsedAmount?: number;
  requestReceived?: number;
}

interface ModalRequestSentProps {
  open: boolean;
  onClose: () => void;
}

const ModalRequestSent: React.FC<ModalRequestSentProps> = ({
  open,
  onClose,
}): JSX.Element => {
  const [requestSentValues, setRequestSentValues] = useState<
    Record<string, number>
  >({});
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
  });

  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery<ApiResponse<RequestItem>>({
    queryKey: [
      "requests",
      pagination.page,
      pagination.limit,
      "verified",
    ] as const,
    queryFn: () =>
      getAllRequests(pagination.page, pagination.limit, {
        isVerified: true,
      }),
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      refetch();
    }
  }, [open, refetch]);

  useEffect(() => {
    if (!data) return;

    const initialValues: Record<string, number> = {};
    data.data.forEach((item) => {
      if (item.requestSent) {
        initialValues[item.id] = item.requestSent;
      }
    });
    setRequestSentValues(initialValues);
    setPagination((prev) => ({
      ...prev,
      total: data.pagination?.total || 0,
    }));
  }, [data]);

  const { mutate: sendRequest } = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      updateRequest(id, amount),
    onSuccess: (_, { id }) => {
      message.success("Lihat Request (Gudang) successfully");
      queryClient.invalidateQueries({ queryKey: ["requests"] });
    },
    onError: () => {
      message.error("Failed to send request");
    },
  });

  const { mutate: updateWarehouseReturnStatus } = useMutation({
    mutationFn: ({ id, returned }: { id: string; returned: boolean }) =>
      updateWarehouseReturn(id, returned),
    onSuccess: () => {
      message.success("Warehouse return status updated");
      queryClient.invalidateQueries({ queryKey: ["requests"] });
    },
    onError: () => {
      message.error("Failed to update warehouse return status");
    },
  });

  const { mutate: updateFinalAmount } = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      updateWarehouseFinalAmount(id, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
    },
    onError: () => {
      message.error("Failed to update final amount");
    },
  });

  const [finalAmountValues, setFinalAmountValues] = useState<{
    [key: string]: number;
  }>({});

  const debouncedUpdateFunctions = useRef<{
    [key: string]: (amount: number) => void;
  }>({});

  const handleSendRequest = (id: string): void => {
    const amount = requestSentValues[id];
    if (!amount) {
      message.error("Please enter an amount");
      return;
    }

    sendRequest({ id, amount });
  };

  const handleWarehouseReturn = (id: string, checked: boolean) => {
    updateWarehouseReturnStatus({ id, returned: checked });
  };

  const handleFinalAmountUpdate = (id: string, amount: number) => {
    // Update local state immediately for UI
    setFinalAmountValues((prev) => ({
      ...prev,
      [id]: amount,
    }));

    // Debounce the API call
    if (!debouncedUpdateFunctions.current[id]) {
      debouncedUpdateFunctions.current[id] = debounce((amount: number) => {
        updateFinalAmount({ id, amount });
      }, 500);
    }

    debouncedUpdateFunctions.current[id](amount);
  };

  const columns = [
    { title: "Nama PO", dataIndex: "cardName", key: "card_name" },
    { title: "Type", dataIndex: "requestType", key: "request_type" },
    { title: "Item", dataIndex: "itemName", key: "requested_item_id" },
    { title: "Jumlah", dataIndex: "requestAmount", key: "request_amount" },
    { title: "Adjustment", dataIndex: "adjustmentName", key: "adjustment_no" },
    { title: "Deskripsi", dataIndex: "description", key: "description" },
    {
      title: "Jumlah Dikirim",
      dataIndex: "requestSent",
      key: "requestSent",
      render: (_: unknown, record: RequestItem) => (
        <Input
          type="number"
          value={
            requestSentValues[record.id] !== undefined
              ? requestSentValues[record.id]
              : record.requestSent ?? ""
          }
          disabled={record.requestSent !== null}
          onChange={(e) =>
            setRequestSentValues((prev) => ({
              ...prev,
              [record.id]: Number(e.target.value),
            }))
          }
          onPressEnter={() => handleSendRequest(record.id)}
          style={{ width: 120 }}
        />
      ),
    },
    {
      title: "Action",
      key: "action",
      width: 50,
      render: (_: unknown, record: RequestItem) => (
        <Button
          type="primary"
          onClick={() => handleSendRequest(record.id)}
          disabled={!requestSentValues[record.id] || !!record.requestSent}
        >
          Kirim
        </Button>
      ),
    },
    {
      title: "Diterima Produksi",
      dataIndex: "productionReceived",
      key: "productionReceived",
      render: (value: boolean) => <Checkbox checked={value} disabled />,
    },
    {
      title: "Kembali Ke Gudang",
      dataIndex: "warehouseReturned",
      key: "warehouseReturned",
      render: (value: boolean, record: RequestItem) => (
        <Checkbox
          checked={value}
          onChange={(e) => handleWarehouseReturn(record.id, e.target.checked)}
        />
      ),
    },
    {
      title: "Sisa Bahan",
      dataIndex: "warehouseFinalUsedAmount",
      key: "warehouseFinalUsedAmount",
      render: (_: unknown, record: RequestItem) => (
        <Input
          type="number"
          value={
            finalAmountValues[record.id] ??
            record.warehouseFinalUsedAmount ??
            (record.requestReceived ? record.requestReceived : "")
          }
          onChange={(e) =>
            handleFinalAmountUpdate(record.id, Number(e.target.value))
          }
          max={record.requestSent}
          disabled={!record.warehouseReturned}
          style={{ width: 120 }}
        />
      ),
    },
    {
      title: "Status",
      key: "status",
      width: 200,
      render: (_: unknown, record: RequestItem) => {
        console.log(record, "<< ini ");
        if (record.productionReceived) {
          return <span style={{ color: "#52c41a" }}>Diterima produksi</span>;
        }
        if (record.requestSent) {
          if (record.requestReceived) {
            return (
              <span style={{ color: "#1890ff" }}>
                Diterima {record.requestReceived} satuan
              </span>
            );
          }
          return <span style={{ color: "#1890ff" }}>Dikirim ke produksi</span>;
        }
        return <span style={{ color: "#999999" }}>Belum dikirim</span>;
      },
    },
    {
      title: "Request",
      dataIndex: "productionUserName",
    },
  ];

  return (
    <Modal
      title="Lihat Request (Gudang)"
      open={open}
      onCancel={onClose}
      footer={null}
      width={1600}
      styles={{
        body: {
          padding: "2rem",
        },
      }}
    >
      <Table
        columns={columns}
        dataSource={data?.data || []}
        loading={isLoading}
        rowKey="id"
        pagination={{
          current: pagination.page,
          pageSize: pagination.limit,
          total: pagination.total,
          onChange: (page, pageSize) =>
            setPagination({ ...pagination, page, limit: pageSize }),
        }}
      />
    </Modal>
  );
};

export default ModalRequestSent;
