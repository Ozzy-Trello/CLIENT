import {
  getAllRequests,
  updateProductionReceived,
  updateRequest,
} from "@api/accurate";
import { useUpdateRequestFields } from "@hooks/accurate";
import { ApiResponse, RequestItem } from "@myTypes/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Empty,
  message,
  Modal,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { EditOutlined } from "@ant-design/icons";
import { debounce } from "lodash";
import { Factory, Filter, RefreshCw, Truck } from "lucide-react";
import { useParams } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { formatRequestQuantity } from "@utils/request-format";
import UserSelectionForModal from "@components/UserSelectionForModal";

const formatDateValue = (value?: string | number | Date) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "-";
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const { Title, Text } = Typography;

interface ModalRequestProduksiProps {
  open: boolean;
  onClose: () => void;
}

const ModalRequestProduksi: React.FC<ModalRequestProduksiProps> = ({
  open,
  onClose,
}): JSX.Element => {
  const { workspaceId } = useParams();
  const queryClient = useQueryClient();
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
  });
  const [requestSentValues, setRequestSentValues] = useState<
    Record<string, number>
  >({});
  const [filterBelumDikirim, setFilterBelumDikirim] = useState(false);
  const [filterBelumDiterima, setFilterBelumDiterima] = useState(false);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);

  const debouncedRefetch = useRef(
    debounce(() => {
      refetch();
    }, 300)
  ).current;

  // Build filter object based on current filter states
  const filterParams = useMemo(() => {
    const baseFilter: Record<string, any> = {
      workspace_id: workspaceId as string,
    };

    // Handle request sent filter
    if (filterBelumDikirim) {
      baseFilter.requestSent = null; // or 0, depending on API implementation
    }

    // Handle production received filter
    if (filterBelumDiterima) {
      baseFilter.productionReceived = false;
    }

    return baseFilter;
  }, [workspaceId, filterBelumDikirim, filterBelumDiterima]);

  const { data, isLoading, refetch } = useQuery<ApiResponse<RequestItem>>({
    queryKey: [
      "requests",
      workspaceId,
      pagination.page,
      pagination.limit,
      "production",
      filterParams,
    ],
    queryFn: () =>
      getAllRequests(pagination.page, pagination.limit, filterParams),
    enabled: open && !!workspaceId,
  });

  useEffect(() => {
    if (open) {
      refetch();
    }
  }, [open, refetch]);

  const updateRequestMutation = useMutation({
    mutationFn: ({ id, requestSent }: { id: string; requestSent: number }) =>
      updateRequest(id, requestSent),
    onSuccess: () => {
      message.success("Jumlah dikirim berhasil diperbarui");
      queryClient.invalidateQueries({
        queryKey: ["requests", workspaceId],
      });
      debouncedRefetch();
    },
    onError: (error) => {
      console.error("Error updating request:", error);
      message.error("Gagal memperbarui jumlah dikirim");
    },
  });

  const updateProductionReceivedMutation = useMutation({
    mutationFn: ({
      id,
      productionReceived,
    }: {
      id: string;
      productionReceived: boolean;
    }) => updateProductionReceived(id, productionReceived),
    onSuccess: () => {
      message.success("Status produksi diterima berhasil diperbarui");
      queryClient.invalidateQueries({
        queryKey: ["requests", workspaceId],
      });
      debouncedRefetch();
    },
    onError: (error) => {
      console.error("Error updating production received:", error);
      message.error("Gagal memperbarui status produksi diterima");
    },
  });

  const { mutate: updateRequestFields } = useUpdateRequestFields();
  const undoDoneMutation = useMutation({
    mutationFn: (id: string) => updateRequest(id, { is_done: false }),
    onMutate: (id) => setUnlockingId(id),
    onSuccess: () => {
      message.success("Request dibuka untuk diedit");
      queryClient.invalidateQueries({ queryKey: ["requests", workspaceId] });
      debouncedRefetch();
    },
    onError: () => {
      message.error("Gagal membuka request");
    },
    onSettled: () => setUnlockingId(null),
  });

  const handleUnlockRequest = (record: RequestItem) => {
    if (record.is_done || record.isDone) {
      undoDoneMutation.mutate(record.id);
    }
  };

  const handleSendRequest = (id: string) => {
    const requestSent = requestSentValues[id];
    if (requestSent !== undefined && requestSent > 0) {
      updateRequestMutation.mutate({ id, requestSent });
      setRequestSentValues((prev) => {
        const newValues = { ...prev };
        delete newValues[id];
        return newValues;
      });
    }
  };

  const handleProductionReceived = (id: string, checked: boolean) => {
    updateProductionReceivedMutation.mutate({
      id,
      productionReceived: checked,
    });
  };

  useEffect(() => {
    if (data?.pagination?.total) {
      setPagination((prev) => ({
        ...prev,
        total: data.pagination!.total,
      }));
    }
  }, [data]);

  const columns = [
    {
      title: "Nama PO",
      dataIndex: "cardName",
      key: "card_name",
      width: 180,
      render: (text: string) => (
        <Tooltip title={text}>
          <Text strong style={{ color: "#1890ff" }}>
            {text}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: "Type",
      dataIndex: "requestType",
      key: "request_type",
      width: 120,
      render: (type: string) => {
        const getTypeColor = (type: string) => {
          switch (type?.toLowerCase()) {
            case "new_request":
              return "blue";
            case "reject":
              return "red";
            case "kekurangan":
              return "orange";
            default:
              return "default";
          }
        };
        return (
          <Tag color={getTypeColor(type)}>
            {type?.replace("_", " ").toUpperCase()}
          </Tag>
        );
      },
    },
    {
      title: "Tanggal",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 140,
      ellipsis: true,
      render: (_: any, record: RequestItem) => (
        <Text>{formatDateValue(record.createdAt)}</Text>
      ),
    },
    {
      title: "Item",
      dataIndex: "itemName",
      key: "requested_item_id",
      width: 200,
      render: (text: string) => (
        <Tooltip title={text}>
          <Text ellipsis style={{ maxWidth: 180 }}>
            {text}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: "Jumlah",
      key: "request_amount",
      width: 120,
      align: "center" as const,
      render: (_: any, record: RequestItem) => (
        <Text strong>
          {formatRequestQuantity(record.requestAmount)} {record.satuan || ""}
        </Text>
      ),
    },
    {
      title: "Deskripsi",
      dataIndex: "description",
      key: "description",
      width: 200,
      render: (text: string) => (
        <Tooltip title={text}>
          <Text ellipsis style={{ maxWidth: 180 }}>
            {text || "-"}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: "Jumlah Dikirim",
      dataIndex: "requestSent",
      key: "requestSent",
      width: 140,
      align: "center" as const,
      render: (_: unknown, record: RequestItem) => {
        const hasSent = record.requestSent !== null && record.requestSent !== 0;
        return hasSent ? (
          <Tag color="green">
            {formatRequestQuantity(record.requestSent)} {record.satuan || ""}
          </Tag>
        ) : (
          <Tag color="default">Belum Dikirim</Tag>
        );
      },
    },
    {
      title: "Diterima",
      key: "productionReceived",
      width: 160,
      align: "center" as const,
      render: (_: unknown, record: RequestItem) => {
        const productionReceived =
          record.productionReceived ?? record.productionRecieved ?? false;
        const isDone = record.is_done || record.isDone;
        return (
          <Checkbox
            checked={productionReceived}
            onChange={(e) =>
              handleProductionReceived(record.id, e.target.checked)
            }
            disabled={isDone}
          />
        );
      },
    },
    {
      title: "Diterima Oleh",
      dataIndex: "receivedBy",
      key: "receivedBy",
      width: 200,
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
          disabled={record.is_done || record.isDone}
        />
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 80,
      align: "center" as const,
      render: (_: unknown, record: RequestItem) => {
        const isDone = record.is_done || record.isDone;
        return (
          <Tooltip
            title={
              isDone
                ? "Edit (buka ulang)"
                : "Sudah terbuka untuk diedit"
            }
          >
            <Button
              type="text"
              icon={<EditOutlined />}
              disabled={!isDone}
              loading={unlockingId === record.id}
              onClick={() => handleUnlockRequest(record)}
            />
          </Tooltip>
        );
      },
    },
  ];

  const totalRequests = data?.pagination?.total || 0;
  const activeFilters = [filterBelumDikirim, filterBelumDiterima].filter(
    Boolean
  ).length;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width="95%"
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Factory size={20} style={{ color: "#1890ff" }} />
          <Title level={4} style={{ margin: 0, color: "#1890ff" }}>
            Manajemen Request Produksi
          </Title>
          <Badge
            count={totalRequests}
            style={{
              backgroundColor: "#f0f0f0",
              color: "#666",
              border: "1px solid #d9d9d9",
            }}
          />
        </div>
      }
      styles={{
        body: {
          padding: "24px",
          backgroundColor: "#fafafa",
        },
        header: {
          backgroundColor: "#fff",
          borderBottom: "1px solid #f0f0f0",
          padding: "16px 24px",
        },
      }}
    >
      {/* Enhanced Filter Section */}
      <Card
        size="small"
        style={{
          marginBottom: 20,
          borderRadius: 8,
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        }}
        title={
          <Space>
            <Filter size={16} style={{ color: "#1890ff" }} />
            <span style={{ fontWeight: 600 }}>Filter & Pencarian</span>
            {activeFilters > 0 && (
              <Badge
                count={activeFilters}
                style={{ backgroundColor: "#1890ff" }}
              />
            )}
          </Space>
        }
        extra={
          <Space size="small">
            <Button
              type="text"
              size="small"
              icon={<RefreshCw size={14} />}
              onClick={() => refetch()}
            >
              Refresh
            </Button>
            {activeFilters > 0 && (
              <Button
                type="link"
                size="small"
                onClick={() => {
                  setFilterBelumDikirim(false);
                  setFilterBelumDiterima(false);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
              >
                Reset Filter
              </Button>
            )}
          </Space>
        }
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16,
            padding: "8px 0",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Truck size={16} style={{ color: "#ff7a00" }} />
            <Checkbox
              checked={filterBelumDikirim}
              onChange={(e) => {
                setFilterBelumDikirim(e.target.checked);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
            >
              <Text strong>Belum Dikirim</Text>
            </Checkbox>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Factory size={16} style={{ color: "#52c41a" }} />
            <Checkbox
              checked={filterBelumDiterima}
              onChange={(e) => {
                setFilterBelumDiterima(e.target.checked);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
            >
              <Text strong>Belum Diterima Produksi</Text>
            </Checkbox>
          </div>
        </div>
      </Card>

      {/* Enhanced Table */}
      <Card
        style={{
          borderRadius: 8,
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        }}
        styles={{
          body: {
            padding: 0,
          },
        }}
      >
        {isLoading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: 300,
              flexDirection: "column",
              gap: 16,
            }}
          >
            <Spin size="large" />
            <Text type="secondary">Memuat data request...</Text>
          </div>
        ) : !data?.data || data.data.length === 0 ? (
          <div style={{ padding: 40 }}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <div style={{ textAlign: "center" }}>
                  <Text type="secondary" style={{ fontSize: 16 }}>
                    {activeFilters > 0
                      ? "Tidak ada data yang sesuai dengan filter"
                      : "Belum ada request produksi"}
                  </Text>
                  {activeFilters > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <Button
                        type="primary"
                        ghost
                        onClick={() => {
                          setFilterBelumDikirim(false);
                          setFilterBelumDiterima(false);
                          setPagination((prev) => ({ ...prev, page: 1 }));
                        }}
                      >
                        Reset Filter
                      </Button>
                    </div>
                  )}
                </div>
              }
            />
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={data?.data || []}
            loading={isLoading}
            rowKey="id"
            scroll={{ x: 1400 }}
            size="middle"
            pagination={{
              current: pagination.page,
              pageSize: pagination.limit,
              total: data?.pagination?.total || 0,
              onChange: (page, pageSize) =>
                setPagination({ ...pagination, page, limit: pageSize }),
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} dari ${total} request`,
              pageSizeOptions: ["10", "20", "50", "100"],
            }}
            rowClassName={(record, index) =>
              index % 2 === 0 ? "table-row-light" : "table-row-dark"
            }
            style={
              {
                "--table-row-light": "#ffffff",
                "--table-row-dark": "#fafafa",
              } as React.CSSProperties
            }
          />
        )}
      </Card>

      <style jsx>{`
        .table-row-light {
          background-color: var(--table-row-light);
        }
        .table-row-dark {
          background-color: var(--table-row-dark);
        }
        .ant-table-thead > tr > th {
          background-color: #f8f9fa !important;
          border-bottom: 2px solid #e9ecef !important;
          font-weight: 600 !important;
          color: #495057 !important;
        }
        .ant-table-tbody > tr:hover > td {
          background-color: #e6f7ff !important;
        }
      `}</style>
    </Modal>
  );
};

export default ModalRequestProduksi;
