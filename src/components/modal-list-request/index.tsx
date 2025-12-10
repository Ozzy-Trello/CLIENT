import React, { useEffect, useState } from "react";
import { Modal, Table, Button, message, Space, Tag, Tooltip } from "antd";
import {
  useRequestsOptimized,
  useVerifyRequest,
  useRejectRequest,
} from "@hooks/accurate";
import { formatRequestQuantity } from "@utils/request-format";
import { RefreshCw } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { DeleteOutlined } from "@ant-design/icons";
import { deleteRequest } from "@api/accurate";
import { usePermissions } from "@hooks/account";
import type { RequestItem } from "@myTypes/request";

interface ModalListRequestProps {
  open: boolean;
  onClose: () => void;
}

const ModalListRequest: React.FC<ModalListRequestProps> = ({
  open,
  onClose,
}) => {
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
  });

  // Add filter state for unverified requests
  const [showUnverifiedOnly, setShowUnverifiedOnly] = useState(false);
  const [deletingRequestId, setDeletingRequestId] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Use optimized hooks with filter
  const {
    data: requestsData,
    isLoading,
    error,
    refetch,
  } = useRequestsOptimized(
    pagination.page,
    pagination.limit,
    open ? { isVerified: showUnverifiedOnly ? false : undefined } : undefined // Only fetch when modal is open
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

  // Toggle filter function
  const toggleUnverifiedFilter = () => {
    setShowUnverifiedOnly(!showUnverifiedOnly);
    // Reset pagination when filter changes
    setPagination({ page: 1, limit: pagination.limit });
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
      {/* Filter Button */}
      <div
        style={{
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <Button
          type={showUnverifiedOnly ? "primary" : "default"}
          onClick={toggleUnverifiedFilter}
          icon={<span className="fi fi-rr-filter" />}
        >
          {showUnverifiedOnly ? "Show All Requests" : "Show Unverified Only"}
        </Button>
        <Button
          type="text"
          size="small"
          icon={<RefreshCw size={16} />}
          onClick={handleRefresh}
          loading={isRefreshing}
        >
          Refresh
        </Button>
        <span style={{ fontSize: 12, color: "#666" }}>
          Last refreshed: {formattedLastRefresh}
        </span>
      </div>

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
