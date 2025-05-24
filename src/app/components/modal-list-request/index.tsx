import React, { useEffect, useState } from "react";
import { Modal, Table, Button, message, Space, Tag } from "antd";
import {
  getAllRequests,
  verifyRequest,
  rejectRequest,
} from "@/app/api/accurate";

interface ModalListRequestProps {
  open: boolean;
  onClose: () => void;
}

const ModalListRequest: React.FC<ModalListRequestProps> = ({
  open,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
  });
  const [verifying, setVerifying] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    // Pass an empty filter object to ensure consistent API behavior
    getAllRequests(pagination.page, pagination.limit, {})
      .then((res) => {
        setDataSource(res.data || []);
        setPagination((prev) => ({
          ...prev,
          total: res.pagination?.total || 0,
        }));
      })
      .finally(() => setLoading(false));
  }, [open, pagination.page, pagination.limit]);

  const handleVerify = async (id: string) => {
    setVerifying(id);
    try {
      await verifyRequest(id);
      message.success("Request verified!");
      // Refresh table
      setLoading(true);
      const res = await getAllRequests(pagination.page, pagination.limit, {});
      setDataSource(res.data || []);
      setPagination((prev) => ({
        ...prev,
        total: res.pagination?.total || 0,
      }));
    } catch (err) {
      message.error("Failed to verify request");
    } finally {
      setVerifying(null);
      setLoading(false);
    }
  };

  const handleReject = async (id: string) => {
    setRejecting(id);
    try {
      await rejectRequest(id);
      message.success("Request rejected!");
      // Refresh table
      setLoading(true);
      const res = await getAllRequests(pagination.page, pagination.limit, {});
      setDataSource(res.data || []);
      setPagination((prev) => ({
        ...prev,
        total: res.pagination?.total || 0,
      }));
    } catch (err) {
      message.error("Failed to reject request");
    } finally {
      setRejecting(null);
      setLoading(false);
    }
  };

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
            loading={verifying === record.id}
            onClick={() => handleVerify(record.id)}
          >
            Accept
          </Button>
          <Button
            disabled={record.isVerified || record.isRejected}
            type="primary"
            danger
            loading={rejecting === record.id}
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
        loading={loading}
        pagination={{
          current: pagination.page,
          pageSize: pagination.limit,
          total: pagination.total,
          onChange: (page, pageSize) =>
            setPagination({ ...pagination, page, limit: pageSize }),
          showSizeChanger: true,
        }}
        rowKey="id"
      />
    </Modal>
  );
};

export default ModalListRequest;
