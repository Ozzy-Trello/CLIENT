import {
  getAllRequests,
  markRequestDone,
  updateRequest,
  updateWarehouseReturn,
} from "@api/accurate";
import { useUpdateRequestFields } from "@hooks/accurate";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Badge,
  Button,
  Checkbox,
  Input,
  message,
  Modal,
  Select,
  Table,
  Tag,
  Card,
  Space,
} from "antd";
import { debounce } from "lodash";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { formatRequestQuantity } from "@utils/request-format";
import { Filter, RotateCcw, Warehouse } from "lucide-react";
import { RequestItem, ApiResponse } from "@myTypes/request";
import UserSelectionForModal from "@components/UserSelectionForModal";

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
  const [requestReceivedValues, setRequestReceivedValues] = useState<
    Record<string, number>
  >({});
  const [beliValues, setBeliValues] = useState<Record<string, boolean>>({});
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
  });
  const [filterBelumDiterima, setFilterBelumDiterima] = useState(false);
  const [filterBelumBeli, setFilterBelumBeli] = useState(false);
  const [filterBelumDiotorisasi, setFilterBelumDiotorisasi] = useState(false);

  const queryClient = useQueryClient();

  // Build filter object based on current filter states
  const filterParams = useMemo(() => {
    const baseFilter: Record<string, any> = {
      isRejected: false,
    };

    // Handle verification filter
    if (filterBelumDiotorisasi) {
      baseFilter.isVerified = false;
    } else {
      baseFilter.isVerified = true;
    }

    // Handle production received filter
    if (filterBelumDiterima) {
      baseFilter.productionReceived = false;
    }
    if (filterBelumBeli) {
      baseFilter.beli = false;
      baseFilter.excludeType = "persediaan";
    }

    return baseFilter;
  }, [
    filterBelumDiterima,
    filterBelumDiotorisasi,
    filterBelumBeli,
  ]);

  const { data, isLoading, refetch } = useQuery<ApiResponse<RequestItem>>({
    queryKey: [
      "requests",
      pagination.page,
      pagination.limit,
      "gudang",
      filterParams,
    ] as const,
    queryFn: () =>
      getAllRequests(pagination.page, pagination.limit, filterParams),
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      refetch();
    }
  }, [open, refetch]);

  useEffect(() => {
    if (!data) return;

    const initialSentValues: Record<string, number> = {};
    const initialReceivedValues: Record<string, number> = {};
    const initialLeftValues: Record<string, number> = {};
    const initialBeliValues: Record<string, boolean> = {};
    data.data.forEach((item) => {
      const numericSent = Number(item.requestSent);
      if (!Number.isNaN(numericSent)) {
        initialSentValues[item.id] = numericSent;
      }

      const numericReceived = Number(item.requestReceived);
      if (!Number.isNaN(numericReceived)) {
        initialReceivedValues[item.id] = numericReceived;
      }
      const computedLeft = Number(
        item.requestLeft ??
          item.request_left ??
          (numericSent ?? 0) - (numericReceived ?? 0)
      );
      initialLeftValues[item.id] = Number.isNaN(computedLeft)
        ? 0
        : Math.max(computedLeft, 0);
      initialBeliValues[item.id] = Boolean(item.beli);
    });
    setRequestSentValues(initialSentValues);
    setRequestReceivedValues(initialReceivedValues);
    setRequestLeftValues(initialLeftValues);
    setBeliValues(initialBeliValues);
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

  const { mutate: updateBeliStatus } = useMutation({
    mutationFn: ({ id, beli }: { id: string; beli: boolean }) =>
      updateRequest(id, { beli }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
    },
    onError: () => {
      message.error("Failed to update beli status");
    },
  });

  const { mutate: updateRequestFields } = useUpdateRequestFields();

  const { mutate: updateRequestReceivedAndLeft } = useMutation({
    mutationFn: ({
      id,
      request_received,
      request_left,
    }: {
      id: string;
      request_received: number;
      request_left: number;
    }) =>
      updateRequest(id, {
        requestReceived: request_received,
        requestLeft: request_left,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
    },
    onError: () => {
      message.error("Failed to update used quantity");
    },
  });

  const { mutate: updateWarehouseReturnStatus } = useMutation({
    mutationFn: ({ id, returned }: { id: string; returned: boolean }) =>
      updateWarehouseReturn(id, returned),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      message.success("Warehouse return status updated");
    },
    onError: () => {
      message.error("Failed to update warehouse return status");
    },
  });

  const { mutate: updateRequestLeftOnly } = useMutation({
    mutationFn: ({ id, request_left }: { id: string; request_left: number }) =>
      updateRequest(id, { requestLeft: request_left }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
    },
    onError: () => {
      message.error("Failed to update remaining quantity");
    },
  });

  const [markingDone, setMarkingDone] = useState<string | null>(null);
  const [requestLeftValues, setRequestLeftValues] = useState<
    Record<string, number>
  >({});

  const requestReceivedDebounceMap = useRef<
    Record<string, (payload: { amount: number; left: number }) => void>
  >({});
  const requestLeftDebounceMap = useRef<Record<string, (value: number) => void>>(
    {}
  );

  const handleSendRequest = (id: string): void => {
    const amount = requestSentValues[id];
    if (!amount) {
      message.error("Please enter an amount");
      return;
    }

    sendRequest({ id, amount });
  };

  const handleBeliChange = (id: string, value: "ya" | "tidak") => {
    const newBeliValue = value === "ya";
    setBeliValues((prev) => ({
      ...prev,
      [id]: newBeliValue,
    }));
    updateBeliStatus({ id, beli: newBeliValue });
  };

  const handleWarehouseReturn = (id: string, checked: boolean) => {
    updateWarehouseReturnStatus({ id, returned: checked });
  };
  const handleRequestReceivedUpdate = (
    id: string,
    amount: number,
    left: number
  ) => {
    if (!requestReceivedDebounceMap.current[id]) {
      requestReceivedDebounceMap.current[id] = debounce(
        (payload: { amount: number; left: number }) => {
          updateRequestReceivedAndLeft({
            id,
            request_received: payload.amount,
            request_left: payload.left,
          });
        },
        500
      );
    }

    requestReceivedDebounceMap.current[id]({ amount, left });
  };

  const handleRequestReceivedChange = (
    id: string,
    rawValue: string,
    sentValue: number
  ) => {
    const numericValue = rawValue === "" ? 0 : Number(rawValue);
    const normalizedValue = Number.isNaN(numericValue) ? 0 : numericValue;
    const leftAmount = Math.max(sentValue - normalizedValue, 0);

    setRequestReceivedValues((prev) => ({
      ...prev,
      [id]: normalizedValue,
    }));

    setRequestLeftValues((prev) => ({
      ...prev,
      [id]: leftAmount,
    }));

    handleRequestReceivedUpdate(id, normalizedValue, leftAmount);
  };

  const handleRequestLeftChange = (id: string, rawValue: string) => {
    const numericValue = rawValue === "" ? 0 : Number(rawValue);
    const normalizedValue = Number.isNaN(numericValue) ? 0 : numericValue;

    setRequestLeftValues((prev) => ({
      ...prev,
      [id]: normalizedValue,
    }));

    if (!requestLeftDebounceMap.current[id]) {
      requestLeftDebounceMap.current[id] = debounce((value: number) => {
        updateRequestLeftOnly({ id, request_left: value });
      }, 500);
    }

    requestLeftDebounceMap.current[id](normalizedValue);
  };

  const handleMarkDone = async (id: string) => {
    setMarkingDone(id);
    try {
      await markRequestDone(id);
      message.success("Request marked as done!");
      refetch(); // Refresh the data
    } catch (err) {
      message.error("Failed to mark request as done");
    } finally {
      setMarkingDone(null);
    }
  };

  const columns = [
    {
      title: "Nama PO",
      dataIndex: "cardName",
      key: "card_name",
      ellipsis: true,
      width: "auto",
    },
    {
      title: "Type",
      dataIndex: "requestType",
      key: "request_type",
      ellipsis: true,
      width: "auto",
    },
    {
      title: "Item",
      dataIndex: "itemName",
      key: "requested_item_id",
      ellipsis: true,
      width: "auto",
    },
    {
      title: "Request",
      key: "request_amount",
      ellipsis: true,
      width: "auto",
      render: (_: any, record: RequestItem) => (
        <span>
          {formatRequestQuantity(record.requestAmount)} {record.satuan || ""}
        </span>
      ),
    },
    {
      title: "Deskripsi",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
      width: "auto",
    },
    {
      title: "Verified",
      key: "is_verified",
      ellipsis: true,
      width: "auto",
      render: (_: unknown, record: RequestItem) => {
        if (record.isVerified) {
          return <Tag color="green">Verified</Tag>;
        }
        return <Tag color="default">Pending</Tag>;
      },
    },
    {
      title: "Jumlah Dikirim",
      dataIndex: "requestSent",
      key: "requestSent",
      ellipsis: true,
      width: "auto",
      render: (_: unknown, record: RequestItem) => (
        <Input
          type="number"
          step="0.01"
          value={
            requestSentValues[record.id] !== undefined
              ? requestSentValues[record.id]
              : record.requestSent !== null && record.requestSent !== undefined
              ? Number(record.requestSent)
              : ""
          }
          onChange={(e) =>
            setRequestSentValues((prev) => ({
              ...prev,
              [record.id]: Number(e.target.value),
            }))
          }
          onPressEnter={() => handleSendRequest(record.id)}
          style={{ width: "100%" }}
        />
      ),
    },
    {
      title: "Dikirim Oleh",
      dataIndex: "sentBy",
      key: "sentBy",
      ellipsis: true,
      width: "auto",
      render: (value: string, record: RequestItem) => (
        <UserSelectionForModal
          value={value}
          placeholder="Pilih pengirim"
          onChange={(selectedUserId: string) => {
            updateRequestFields({
              id: record.id,
              updates: { sent_by: selectedUserId },
            });
          }}
        />
      ),
    },
    {
      title: "Beli",
      key: "beli",
      ellipsis: true,
      width: "auto",
      render: (_: unknown, record: RequestItem) => {
        const isPersediaanProduct =
          (record?.type || "").toLowerCase() === "persediaan";
        const persistedValue =
          beliValues[record.id] !== undefined
            ? beliValues[record.id]
            : Boolean(record.beli);
        const isCompleted = record.is_done || record.isDone;
        const currentValue = isPersediaanProduct ? false : persistedValue;
        const disabled = isPersediaanProduct || isCompleted;
        return (
          <Select
            value={currentValue ? "ya" : "tidak"}
            options={[
              { value: "ya", label: "Ya" },
              { value: "tidak", label: "Tidak" },
            ]}
            onChange={(value) =>
              handleBeliChange(record.id, value as "ya" | "tidak")
            }
            disabled={disabled}
            style={{ width: "100%" }}
          />
        );
      },
    },
    // {
    //   title: "Action",
    //   key: "action",
    //   width: 50,
    //   render: (_: unknown, record: RequestItem) => (
    //     <Button
    //       type="primary"
    //       onClick={() => handleSendRequest(record.id)}
    //       disabled={!requestSentValues[record.id] || !!record.requestSent}
    //     >
    //       Kirim
    //     </Button>
    //   ),
    // },
    {
      title: "Diterima Produksi",
      key: "productionReceived",
      ellipsis: true,
      width: "auto",
      render: (_: unknown, record: RequestItem) => {
        const productionReceived =
          record.productionReceived ?? record.productionRecieved ?? false;
        return <Checkbox checked={productionReceived} disabled />;
      },
    },
    {
      title: "Terpakai",
      key: "requestReceivedInput",
      ellipsis: true,
      width: "auto",
      render: (_: unknown, record: RequestItem) => {
        const sentValue =
          requestSentValues[record.id] ??
          (record.requestSent !== null && record.requestSent !== undefined
            ? Number(record.requestSent)
            : 0);
        return (
          <Input
            type="number"
            step="0.01"
            value={
              requestReceivedValues[record.id] !== undefined
                ? requestReceivedValues[record.id]
                : record.requestReceived !== null &&
                  record.requestReceived !== undefined
                ? Number(record.requestReceived)
                : ""
            }
            onChange={(e) =>
              handleRequestReceivedChange(record.id, e.target.value, sentValue)
            }
            disabled={record.isDone}
            style={{ width: "100%" }}
          />
        );
      },
    },
    {
      title: "Kembali Ke Gudang",
      dataIndex: "warehouseReturned",
      key: "warehouseReturned",
      ellipsis: true,
      width: "auto",
      render: (value: boolean, record: RequestItem) => (
        <Checkbox
          checked={value}
          onChange={(e) =>
            handleWarehouseReturn(record.id, e.target.checked)
          }
          disabled={record.isDone}
        />
      ),
    },
    {
      title: "Sisa Bahan",
      key: "requestLeft",
      ellipsis: true,
      width: "auto",
      render: (_: unknown, record: RequestItem) => {
        const computedLeft =
          requestLeftValues[record.id] ??
          record.requestLeft ??
          record.request_left ??
          Math.max(
            (record.requestSent ?? 0) - (record.requestReceived ?? 0),
            0
          );
        const isReturned = record.warehouseReturned ?? false;
        return (
          <Input
            type="number"
            step="0.01"
            value={computedLeft}
            disabled={!isReturned || record.isDone}
            onChange={(e) => handleRequestLeftChange(record.id, e.target.value)}
            style={{ width: "100%" }}
          />
        );
      },
    },
    {
      title: "Status",
      key: "status",
      ellipsis: true,
      width: "auto",
      render: (_: unknown, record: RequestItem) => {
        if (record.is_done || record.isDone) {
          return (
            <span style={{ color: "#52c41a", fontWeight: "bold" }}>Done</span>
          );
        }
        if (record.is_rejected || record.isRejected) {
          return (
            <span style={{ color: "#f5222d", fontWeight: "bold" }}>
              Rejected
            </span>
          );
        }
        if (record.productionReceived) {
          return <span style={{ color: "#52c41a" }}>Diterima produksi</span>;
        }
        if (record.requestSent) {
          if (record.requestReceived) {
            return (
              <span style={{ color: "#1890ff" }}>
                Diterima {record.requestReceived} {record.satuan || "satuan"}
              </span>
            );
          }
          return <span style={{ color: "#1890ff" }}>Dikirim ke produksi</span>;
        }
        return <span style={{ color: "#999999" }}>Belum dikirim</span>;
      },
    },
    {
      title: "Action",
      key: "done_action",
      width: 100,
      align: "center" as const,
      render: (_: unknown, record: RequestItem) => (
        <Button
          type="primary"
          size="small"
          onClick={() => handleMarkDone(record.id)}
          disabled={
            record.is_done ||
            record.isDone ||
            record.is_rejected ||
            record.isRejected
          }
          loading={markingDone === record.id}
          style={{ minWidth: "70px" }}
        >
          {record.is_done || record.isDone ? "Done" : "Accept"}
        </Button>
      ),
    },
  ];

  // Calculate active filters count
  const activeFiltersCount = [
    filterBelumDiterima,
    filterBelumDiotorisasi,
    filterBelumBeli,
  ].filter(Boolean).length;

  // Reset all filters function
  const resetFilters = () => {
    setFilterBelumDiterima(false);
    setFilterBelumDiotorisasi(false);
    setFilterBelumBeli(false);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  return (
    <Modal
      title={
        <Space align="center">
          <Warehouse size={20} style={{ color: "#1890ff" }} />
          <span style={{ fontSize: "18px", fontWeight: 600 }}>Gudang</span>
          <Badge
            count={data?.pagination?.total || 0}
            style={{ backgroundColor: "#52c41a" }}
            overflowCount={999}
          />
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={1600}
      styles={{
        body: {
          padding: "24px",
          backgroundColor: "#fafafa",
        },
      }}
    >
      <Card
        size="small"
        style={{
          marginBottom: 20,
          borderRadius: 8,
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          border: "1px solid #e8e8e8",
        }}
        title={
          <Space align="center">
            <Filter size={16} style={{ color: "#1890ff" }} />
            <span style={{ fontWeight: 600 }}>🔍 Filter Requests</span>
            {activeFiltersCount > 0 && (
              <Badge
                count={activeFiltersCount}
                style={{ backgroundColor: "#faad14" }}
              />
            )}
          </Space>
        }
        extra={
          activeFiltersCount > 0 && (
            <Button
              type="text"
              size="small"
              icon={<RotateCcw size={14} />}
              onClick={resetFilters}
              style={{
                color: "#666",
                fontSize: "12px",
                height: "24px",
                padding: "0 8px",
              }}
            >
              Reset
            </Button>
          )
        }
      >
        <Space
          direction="horizontal"
          size="large"
          style={{ width: "100%", flexWrap: "wrap" }}
        >
          <Checkbox
            checked={filterBelumDiterima}
            onChange={(e) => {
              setFilterBelumDiterima(e.target.checked);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            style={{
              fontSize: "14px",
              fontWeight: filterBelumDiterima ? 600 : 400,
              color: filterBelumDiterima ? "#1890ff" : "#666",
            }}
          >
            📦 Belum Diterima
          </Checkbox>
          <Checkbox
            checked={filterBelumDiotorisasi}
            onChange={(e) => {
              setFilterBelumDiotorisasi(e.target.checked);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            style={{
              fontSize: "14px",
              fontWeight: filterBelumDiotorisasi ? 600 : 400,
              color: filterBelumDiotorisasi ? "#1890ff" : "#666",
            }}
          >
            ✅ Belum Diotorisasi
          </Checkbox>
          <Checkbox
            checked={filterBelumBeli}
            onChange={(e) => {
              setFilterBelumBeli(e.target.checked);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            style={{
              fontSize: "14px",
              fontWeight: filterBelumBeli ? 600 : 400,
              color: filterBelumBeli ? "#1890ff" : "#666",
            }}
          >
            🧾 Belum Beli
          </Checkbox>
        </Space>
      </Card>
      <Card
        style={{
          borderRadius: 8,
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          border: "1px solid #e8e8e8",
        }}
      >
        <Table
          columns={columns}
          dataSource={data?.data || []}
          loading={isLoading}
          rowKey="id"
          scroll={{ x: "max-content" }}
          size="small"
          locale={{
            emptyText: (
              <div
                style={{ padding: "40px", textAlign: "center", color: "#999" }}
              >
                <Warehouse
                  size={48}
                  style={{ color: "#d9d9d9", marginBottom: "16px" }}
                />
                <div>Tidak ada data request</div>
              </div>
            ),
          }}
          pagination={{
            current: pagination.page,
            pageSize: pagination.limit,
            total: data?.pagination?.total || 0,
            onChange: (page, pageSize) =>
              setPagination({ ...pagination, page, limit: pageSize }),
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} dari ${total} requests`,
            pageSizeOptions: ["10", "20", "50", "100"],
          }}
          style={{
            backgroundColor: "white",
          }}
        />
      </Card>
    </Modal>
  );
};

export default ModalRequestSent;
