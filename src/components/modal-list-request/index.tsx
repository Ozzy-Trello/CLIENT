import React, { useState } from "react";
import { Modal, Table, Button, message, Space, Tag } from "antd";
import {
  useRequestsOptimized,
  useVerifyRequest,
  useRejectRequest,
} from "@hooks/accurate";

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

  // Use optimized hooks
  const {
    data: requestsData,
    isLoading,
    error,
  } = useRequestsOptimized(
    pagination.page,
    pagination.limit,
    open ? {} : undefined // Only fetch when modal is open
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

  const dataSource = requestsData?.data || [];
  const total = requestsData?.pagination?.total || 0;

  const columns = [
    { title: "Nama PO", dataIndex: "cardName", key: "card_name" },
    { title: "Type", dataIndex: "requestType", key: "request_type" },
    { title: "Item", dataIndex: "itemName", key: "requested_item_id" },
    {
      title: "Jumlah",
      key: "request_amount",
      render: (_: any, record: any) => (
        <span>
          {record.requestAmount} {record.satuan || ""}
        </span>
      ),
    },
    { title: "Adjustment", dataIndex: "adjustmentName", key: "adjustment_no" },
    { title: "Description", dataIndex: "description", key: "description" },
    {
      title: "Status",
      key: "status",
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
      render: (_: any, record: any) => (
        <Space>
          <Button
            disabled={record.isVerified || record.isRejected}
            type="primary"
            icon={<span className="fi fi-rr-check" />}
            loading={verifyMutation.isPending}
            onClick={() => handleVerify(record.id)}
          >
            Accept
          </Button>
          <Button
            disabled={record.isVerified || record.isRejected}
            type="primary"
            danger
            loading={rejectMutation.isPending}
            onClick={() => handleReject(record.id)}
          >
            X
          </Button>
        </Space>
      ),
    },
    {
      title: "Requested By",
      dataIndex: "productionUserName",
    },
  ];

  return (
    <Modal
      title="Request List"
      open={open}
      onCancel={onClose}
      footer={null}
      width={900}
      bodyStyle={{ padding: 24 }}
      destroyOnClose
    >
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
