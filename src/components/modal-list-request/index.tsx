import React, { useEffect, useState } from "react";
import { Modal, Table, Button, message, Space, Tag, Tooltip } from "antd";
import {
  useRequestsOptimized,
  useVerifyRequest,
  useRejectRequest,
} from "@hooks/accurate";
import { render } from "react-dom";
import { formatRequestQuantity } from "@utils/request-format";
import { RefreshCw } from "lucide-react";

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

  // Toggle filter function
  const toggleUnverifiedFilter = () => {
    setShowUnverifiedOnly(!showUnverifiedOnly);
    // Reset pagination when filter changes
    setPagination({ page: 1, limit: pagination.limit });
  };

  const dataSource = requestsData?.data || [];
  const total = requestsData?.pagination?.total || 0;

  const columns = [
    {
      title: "Nama PO",
      dataIndex: "cardName",
      key: "card_name",
      ellipsis: true,
      width: 500,
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
      width: 225,
    },
    {
      title: "Jumlah",
      key: "request_amount",
      ellipsis: true,
      width: 100,
      render: (_: any, record: any) => (
        <span>
          {formatRequestQuantity(record.requestAmount)} {record.satuan || ""}
        </span>
      ),
    },
    {
      title: "Adjustment",
      dataIndex: "adjustmentName",
      key: "adjustment_no",
      ellipsis: true,
      width: 225,
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
      width: "auto",
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
          onClick={() => refetch()}
        >
          Refresh
        </Button>
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
