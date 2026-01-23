import React, { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Table, Button, message, Space, Tag, Tooltip, Card, Input, Select, Badge } from "antd";
import {
  useRequestsOptimized,
  useVerifyRequest,
  useRejectRequest,
} from "@hooks/accurate";
import { formatRequestQuantity } from "@utils/request-format";
import { Filter, RefreshCw, RotateCcw } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { DeleteOutlined } from "@ant-design/icons";
import { deleteRequest } from "@api/accurate";
import { usePermissions } from "@hooks/account";
import type { RequestItem } from "@myTypes/request";
import { debounce } from "lodash";

interface ModalListRequestProps {
  open: boolean;
  onClose: () => void;
}

type VerifiedFilter = "VERIFIED" | "PENDING" | "REJECTED";

const ModalListRequest: React.FC<ModalListRequestProps> = ({
  open,
  onClose,
}) => {
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
  });

  const [verifiedFilter, setVerifiedFilter] =
    useState<VerifiedFilter | null>(null);
  const [requestTypeFilter, setRequestTypeFilter] = useState<string>("");
  const [labelFilter, setLabelFilter] = useState<string>("");
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingRequestId, setDeletingRequestId] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const debouncedSearch = useRef(
    debounce((value: string) => {
      setSearchTerm(value.trim());
    }, 400)
  ).current;

  const filterParams = useMemo(() => {
    const base: Record<string, any> = {};
    if (verifiedFilter === "VERIFIED") {
      base.isVerified = true;
    } else if (verifiedFilter === "PENDING") {
      base.isVerified = false;
      base.isRejected = false;
    } else if (verifiedFilter === "REJECTED") {
      base.isRejected = true;
    }
    if (requestTypeFilter) base.requestType = requestTypeFilter;
    if (labelFilter) base.labelName = labelFilter;
    if (searchTerm) base.search = searchTerm;
    return base;
  }, [verifiedFilter, requestTypeFilter, labelFilter, searchTerm]);

  // Use optimized hooks with filter
  const {
    data: requestsData,
    isLoading,
    refetch,
  } = useRequestsOptimized(
    pagination.page,
    pagination.limit,
    open ? filterParams : undefined // Only fetch when modal is open
  );

  const verifyMutation = useVerifyRequest();
  const rejectMutation = useRejectRequest();
  const { isSuperAdmin } = usePermissions();
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRequest(id),
    onSuccess: () => {
      message.success("Request deleted");
      refetch();
    },
    onError: () => {
      message.error("Failed to delete request");
    },
    onSettled: () => {
      setDeletingRequestId(null);
    },
  });

  const handleVerify = async (id: string) => {
    try {
      await verifyMutation.mutateAsync(id);
      message.success("Request verified!");
    } catch (err) {
      message.error("Failed to verify request");
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectMutation.mutateAsync(id);
      message.success("Request rejected!");
    } catch (err) {
      message.error("Failed to reject request");
    }
  };

  useEffect(() => {
    if (open) {
      refetch();
    }
  }, [open, refetch]);

  useEffect(() => {
    if (requestsData) {
      setLastRefreshedAt(new Date());
    }
  }, [requestsData]);

  useEffect(
    () => () => {
      debouncedSearch.cancel();
    },
    [debouncedSearch]
  );

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await refetch();
      setLastRefreshedAt(new Date());
    } catch (error) {
      message.error("Failed to refresh requests");
    } finally {
      setIsRefreshing(false);
    }
  };

  const formattedLastRefresh = lastRefreshedAt
    ? lastRefreshedAt.toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "Belum pernah";

  const confirmDeleteRequest = (record: any) => {
    Modal.confirm({
      title: "Delete request",
      content: `Are you sure you want to delete the request for "${record.itemName}"?`,
      centered: true,
      okText: "Delete",
      okType: "danger",
      onOk: async () => {
        setDeletingRequestId(record.id);
        await deleteMutation.mutateAsync(record.id);
      },
    });
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchInput(value);
    if (value.trim() === "") {
      debouncedSearch.cancel();
      setSearchTerm("");
    } else {
      debouncedSearch(value);
    }
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleSearchSubmit = () => {
    debouncedSearch.cancel();
    setSearchTerm(searchInput.trim());
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const formatRequestTypeLabel = (type: string) =>
    type
      .split("_")
      .map(
        (word) =>
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      )
      .join(" ");

  const requestTypeOptions = useMemo(() => {
    const defaults = ["NEW_ORDER", "REJECT", "KEKURANGAN", "KESALAHAN"];
    const collected = new Set(defaults);

    requestsData?.data?.forEach((item: any) => {
      const derivedType =
        (item as any).request_type ?? (item as any).requestType ?? "";
      if (derivedType) {
        collected.add(String(derivedType).toUpperCase());
      }
    });

    return Array.from(collected).filter(Boolean);
  }, [requestsData]);

  const labelOptions = useMemo(() => ["Ozzy", "Steady"], []);

  const activeFiltersCount = [
    verifiedFilter !== null,
    Boolean(requestTypeFilter),
    Boolean(labelFilter),
    Boolean(searchTerm),
  ].filter(Boolean).length;

  const resetFilters = () => {
    setVerifiedFilter(null);
    setRequestTypeFilter("");
    setLabelFilter("");
    setSearchInput("");
    setSearchTerm("");
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const dataSource = requestsData?.data || [];
  const total = requestsData?.pagination?.total || 0;

  const buildCardUrl = (record: RequestItem) => {
    const cardId = record.cardId ?? record.card_id;
    const boardId = record.boardId ?? record.board_id;
    const workspaceId = record.workspaceId ?? record.workspace_id;
    const listId = record.listId ?? record.list_id;

    if (!cardId || !boardId || !workspaceId) {
      return undefined;
    }

    const params = new URLSearchParams();
    params.set("cardId", cardId);
    if (listId) {
      params.set("listId", listId);
    }

    return `/workspace/${workspaceId}/board/${boardId}?${params.toString()}`;
  };

  const columns = [
    {
      title: "Tanggal",
      dataIndex: "createdAt",
      key: "createdAt",
      ellipsis: true,
      width: 180,
      render: (_: any, record: RequestItem) => {
        const value = record.createdAt;
        if (!value) return "-";
        const date = new Date(value);
        if (Number.isNaN(date.valueOf())) return "-";
        return date.toLocaleString("id-ID", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      },
    },
    {
      title: "Nama PO",
      dataIndex: "cardName",
      key: "card_name",
      ellipsis: true,
      width: 200,
      render: (_: any, record: RequestItem) => {
        const href = buildCardUrl(record);
        const content = record.cardName || "-";
        if (!href) {
          return (
            <Tooltip title={content}>
              <span>{content}</span>
            </Tooltip>
          );
        }
        return (
          <Tooltip title="Lihat PO">
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700"
            >
              {content}
            </a>
          </Tooltip>
        );
      },
    },
    {
      title: "Type",
      dataIndex: "requestType",
      key: "request_type",
      ellipsis: true,
      width: 100,
    },
    {
      title: "Ozzy / Steady",
      key: "card_labels",
      ellipsis: true,
      width: 130,
      render: (_: unknown, record: RequestItem) => {
        const labels = record.card_labels || record.cardLabels || [];
        const hasOzzy = labels.some((l: any) => l.toLowerCase() === "ozzy");
        const hasSteady = labels.some((l: any) => l.toLowerCase() === "steady");
        if (!hasOzzy && !hasSteady) return <Tag color="default">-</Tag>;
        return (
          <Space size={4}>
            {hasOzzy && <Tag color="navy">Ozzy</Tag>}
            {hasSteady && <Tag color="red">Steady</Tag>}
          </Space>
        );
      },
    },

    {
      title: "Item",
      dataIndex: "itemName",
      key: "requested_item_id",
      ellipsis: true,
      width: 220,
    },
    {
      title: "Jumlah",
      key: "request_amount",
      ellipsis: true,
      width: 140,
      render: (_: any, record: RequestItem) => (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "60% 40%",
            gap: 4,
            alignItems: "center",
          }}
        >
          <span style={{ fontWeight: 600 }}>
            {formatRequestQuantity(record.requestAmount)}
          </span>
          <span style={{ textAlign: "right", color: "#555" }}>
            {record.satuan || ""}
          </span>
        </div>
      ),
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
      width: 200,
      render: (_: any, record: any) => (
        <Tooltip title={record.description || "-"}>
          <span>{record.description || "-"}</span>
        </Tooltip>
      ),
    },
    {
      title: "Status",
      key: "status",
      ellipsis: true,
      width: 100,
      render: (_: any, record: any) => {
        if (record.isRejected || record.isRejected) {
          // Support both formats during transition
          return <Tag color="red">Rejected</Tag>;
        }
        if (record.isVerified) {
          return <Tag color="green">Verified</Tag>;
        }
        return <Tag color="default">Pending</Tag>;
      },
    },
    {
      title: "Action",
      key: "action",
      width: 100,
      align: "center" as const,
      render: (_: any, record: any) => (
        <Space size={4}>
          <Button
            disabled={record.isVerified || record.isRejected}
            type="text"
            size="small"
            loading={verifyMutation.isPending}
            onClick={() => handleVerify(record.id)}
            style={{
              padding: "2px",
              minWidth: "24px",
              height: "24px",
              borderRadius: "50%",
              backgroundColor:
                record.isVerified || record.isRejected ? "#f5f5f5" : "#f6ffed",
              border:
                record.isVerified || record.isRejected
                  ? "1px solid #d9d9d9"
                  : "1px solid #b7eb8f",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title="Accept"
          >
            <span
              style={{
                color:
                  record.isVerified || record.isRejected
                    ? "#bfbfbf"
                    : "#52c41a",
                fontSize: "12px",
                fontWeight: "bold",
              }}
            >
              ✓
            </span>
          </Button>
          <Button
            disabled={record.isVerified || record.isRejected}
            type="text"
            size="small"
            loading={rejectMutation.isPending}
            onClick={() => handleReject(record.id)}
            style={{
              padding: "2px",
              minWidth: "24px",
              height: "24px",
              borderRadius: "50%",
              backgroundColor:
                record.isVerified || record.isRejected ? "#f5f5f5" : "#fff2f0",
              border:
                record.isVerified || record.isRejected
                  ? "1px solid #d9d9d9"
                  : "1px solid #ffccc7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title="Reject"
          >
            <span
              style={{
                color:
                  record.isVerified || record.isRejected
                    ? "#bfbfbf"
                    : "#ff4d4f",
                fontSize: "10px",
                fontWeight: "bold",
              }}
            >
              ✕
            </span>
          </Button>
          {isSuperAdmin() && (
            <Button
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              danger
              loading={deletingRequestId === record.id}
              disabled={
                deletingRequestId !== null && deletingRequestId !== record.id
              }
              onClick={() => confirmDeleteRequest(record)}
            />
          )}
        </Space>
      ),
    },
    {
      title: "Received By",
      dataIndex: "receivedByName",
      key: "received_by_name",
      ellipsis: true,
      width: 150,
    },
  ];

  return (
    <Modal
      title="Request List"
      open={open}
      onCancel={onClose}
      footer={null}
      width={2000}
      styles={{
        body: {
          padding: 24,
        },
      }}
      destroyOnHidden
    >
      <Card
        size="small"
        style={{
          marginBottom: 16,
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
          <Space size="small" align="center">
            <Button
              type="text"
              size="small"
              icon={<RefreshCw size={14} />}
              onClick={handleRefresh}
              loading={isRefreshing}
              style={{
                fontSize: "12px",
                height: "24px",
                padding: "0 8px",
              }}
            >
              Refresh
            </Button>
            <span style={{ fontSize: 12, color: "#666" }}>
              Last refreshed: {formattedLastRefresh}
            </span>
            {activeFiltersCount > 0 && (
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
            )}
          </Space>
        }
      >
        <div
          style={{
            width: "100%",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>
              Search
            </span>
            <Input
              placeholder="Cari PO, item, deskripsi..."
              allowClear
              value={searchInput}
              onChange={handleSearchChange}
              onPressEnter={handleSearchSubmit}
            />
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>
              Status Verifikasi
            </span>
            <Select
              allowClear
              placeholder="Semua"
              value={verifiedFilter ?? undefined}
              onChange={(value) => {
                setVerifiedFilter((value as VerifiedFilter) ?? null);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              options={[
                { label: "Verified", value: "VERIFIED" },
                { label: "Pending", value: "PENDING" },
                { label: "Rejected", value: "REJECTED" },
              ]}
            />
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>
              Type
            </span>
            <Select
              allowClear
              placeholder="Pilih type"
              value={requestTypeFilter || undefined}
              onChange={(value) => {
                setRequestTypeFilter(value || "");
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              options={[
                { value: "", label: "Semua Type" },
                ...requestTypeOptions.map((type) => ({
                  value: type,
                  label: formatRequestTypeLabel(type),
                })),
              ]}
            />
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>
              Label
            </span>
            <Select
              allowClear
              placeholder="Pilih label"
              value={labelFilter || undefined}
              onChange={(value) => {
                setLabelFilter(value || "");
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              options={[
                { value: "", label: "Semua Label" },
                ...labelOptions.map((label) => ({
                  value: label,
                  label,
                })),
              ]}
            />
          </div>
        </div>
      </Card>

      <Table
        dataSource={dataSource}
        columns={columns}
        loading={isLoading}
        pagination={{
          current: pagination.page,
          pageSize: pagination.limit,
          total: total,
          onChange: (page, pageSize) =>
            setPagination({ page, limit: pageSize || pagination.limit }),
          showSizeChanger: true,
        }}
        rowKey="id"
      />
    </Modal>
  );
};

export default ModalListRequest;
