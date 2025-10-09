import {
  getAllRequests,
  markRequestDone,
  updateRequest,
  updateWarehouseFinalAmount,
  updateWarehouseReturn,
} from "@api/accurate";
import { useAccountListForModal } from "@hooks/account";
import { useUpdateRequestFields } from "@hooks/accurate";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Avatar,
  Button,
  Checkbox,
  Input,
  message,
  Modal,
  Select,
  Table,
  Typography,
  Tag,
  Card,
  Space,
  Divider,
  Badge,
} from "antd";
import { debounce } from "lodash";
import { useParams } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Filter, RotateCcw, Warehouse } from "lucide-react";
import { RequestItem, ApiResponse } from "@myTypes/request";

interface ModalRequestSentProps {
  open: boolean;
  onClose: () => void;
}

// Custom UserSelection component for modal that works without boardId
const UserSelectionForModal: React.FC<{
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
}> = ({ value, onChange, placeholder = "Select a User" }) => {
  const { workspaceId } = useParams();

  const { data: accountListData, isLoading: accountListLoading } =
    useAccountListForModal({
      workspaceId: Array.isArray(workspaceId)
        ? (workspaceId[0] as string)
        : (workspaceId as string),
    });

  const options = useMemo(() => {
    if (!accountListData?.data) return [];

    return accountListData.data.map((item) => ({
      value: item.id,
      label: (
        <div className="flex justify-start items-center gap-3">
          <Avatar
            size={20}
            className="bg-blue-50 text-blue-500 border border-blue-100"
          >
            {item.username?.substring(0, 2)?.toUpperCase()}
          </Avatar>
          <Typography.Text>{item.username}</Typography.Text>
        </div>
      ),
    }));
  }, [accountListData]);

  return (
    <Select
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      loading={accountListLoading}
      options={options}
      style={{ width: "100%" }}
      showSearch
      filterOption={(input, option) =>
        (option?.label as any)?.props?.children?.[1]?.props?.children
          ?.toLowerCase()
          ?.includes(input.toLowerCase()) ?? false
      }
    />
  );
};

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
  const [filterBelumDiterima, setFilterBelumDiterima] = useState(false);
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

    return baseFilter;
  }, [filterBelumDiterima, filterBelumDiotorisasi]);

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

  const { mutate: updateRequestFields } = useUpdateRequestFields();

  const [finalAmountValues, setFinalAmountValues] = useState<{
    [key: string]: number;
  }>({});

  const [markingDone, setMarkingDone] = useState<string | null>(null);

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
      width: "auto"
    },
    { 
      title: "Type", 
      dataIndex: "requestType", 
      key: "request_type",
      ellipsis: true,
      width: "auto"
    },
    { 
      title: "Item", 
      dataIndex: "itemName", 
      key: "requested_item_id",
      ellipsis: true,
      width: "auto"
    },
    {
      title: "Jumlah",
      key: "request_amount",
      ellipsis: true,
      width: "auto",
      render: (_: any, record: RequestItem) => (
        <span>
          {record.requestAmount} {record.satuan || ""}
        </span>
      ),
    },
    { 
      title: "Adjustment", 
      dataIndex: "adjustmentName", 
      key: "adjustment_no",
      ellipsis: true,
      width: "auto"
    },
    { 
      title: "Deskripsi", 
      dataIndex: "description", 
      key: "description",
      ellipsis: true,
      width: "auto"
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
          value={
            requestSentValues[record.id] !== undefined
              ? requestSentValues[record.id]
              : record.requestSent ?? ""
          }
          disabled={record.requestSent !== null && record.requestSent !== 0}
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
      dataIndex: "productionReceived",
      key: "productionReceived",
      ellipsis: true,
      width: "auto",
      render: (value: boolean) => <Checkbox checked={value} disabled />,
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
          onChange={(e) => handleWarehouseReturn(record.id, e.target.checked)}
          disabled={record.isDone}
        />
      ),
    },
    {
      title: "Sisa Bahan",
      dataIndex: "warehouseFinalUsedAmount",
      key: "warehouseFinalUsedAmount",
      ellipsis: true,
      width: "auto",
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
          disabled={!record.warehouseReturned || record.isDone}
          style={{ width: "100%" }}
        />
      ),
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
    {
      title: "Diterima Oleh",
      dataIndex: "receivedBy",
      key: "receivedBy",
      ellipsis: true,
      width: "auto",
      render: (value: string, record: RequestItem) => (
        <UserSelectionForModal
          value={value}
          placeholder="Pilih penerima"
          onChange={(selectedUserId: string) => {
            updateRequestFields({
              id: record.id,
              updates: { received_by: selectedUserId },
            });
          }}
        />
      ),
    },
  ];





  // Calculate active filters count
  const activeFiltersCount = [filterBelumDiterima, filterBelumDiotorisasi].filter(Boolean).length;

  // Reset all filters function
  const resetFilters = () => {
    setFilterBelumDiterima(false);
    setFilterBelumDiotorisasi(false);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  return (
    <Modal
      title={
        <Space align="center">
          <Warehouse size={20} style={{ color: '#1890ff' }} />
          <span style={{ fontSize: '18px', fontWeight: 600 }}>Gudang</span>
          <Badge 
            count={data?.pagination?.total || 0} 
            style={{ backgroundColor: '#52c41a' }}
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
          backgroundColor: '#fafafa',
        },
      }}
    >
      <Card 
        size="small" 
        style={{ 
          marginBottom: 20,
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          border: '1px solid #e8e8e8'
        }}
        title={
          <Space align="center">
            <Filter size={16} style={{ color: '#1890ff' }} />
            <span style={{ fontWeight: 600 }}>🔍 Filter Requests</span>
            {activeFiltersCount > 0 && (
              <Badge 
                count={activeFiltersCount} 
                style={{ backgroundColor: '#faad14' }}
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
                color: '#666',
                fontSize: '12px',
                height: '24px',
                padding: '0 8px'
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
          style={{ width: '100%', flexWrap: 'wrap' }}
        >
          <Checkbox
            checked={filterBelumDiterima}
            onChange={(e) => {
              setFilterBelumDiterima(e.target.checked);
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
            style={{ 
              fontSize: '14px',
              fontWeight: filterBelumDiterima ? 600 : 400,
              color: filterBelumDiterima ? '#1890ff' : '#666'
            }}
          >
            📦 Belum Diterima
          </Checkbox>
          <Checkbox
            checked={filterBelumDiotorisasi}
            onChange={(e) => {
              setFilterBelumDiotorisasi(e.target.checked);
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
            style={{ 
              fontSize: '14px',
              fontWeight: filterBelumDiotorisasi ? 600 : 400,
              color: filterBelumDiotorisasi ? '#1890ff' : '#666'
            }}
          >
            ✅ Belum Diotorisasi
          </Checkbox>
        </Space>
      </Card>
      <Card
        style={{
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          border: '1px solid #e8e8e8'
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
              <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
                <Warehouse size={48} style={{ color: '#d9d9d9', marginBottom: '16px' }} />
                <div>Tidak ada data request</div>
              </div>
            )
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
            pageSizeOptions: ['10', '20', '50', '100'],
          }}
          style={{
            backgroundColor: 'white'
          }}
        />
      </Card>
    </Modal>
  );
};

export default ModalRequestSent;
