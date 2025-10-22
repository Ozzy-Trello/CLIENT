import React, { useState, useEffect } from "react";
import {
  Modal,
  Form,
  Button,
  message,
  Typography,
  Space,
} from "antd";
import { Package } from "lucide-react";

interface ModalPackingProps {
  open: boolean;
  onClose: () => void;
}

const { Title, Text } = Typography;

const ModalPacking: React.FC<ModalPackingProps> = ({ open, onClose }) => {
  const [form] = Form.useForm();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      form.resetFields();
    }
  }, [open, form]);

  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      // TODO: Implement packing functionality
      message.success("Packing functionality will be implemented here");
      onClose();
    } catch (error) {
      console.error("Error in packing:", error);
      message.error("Failed to process packing");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <Package size={20} className="text-blue-600" />
          <span>Packing</span>
        </div>
      }
      open={open}
      onCancel={handleCancel}
      footer={null}
      width={800}
      destroyOnClose
    >
      <div className="py-4">
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          className="space-y-4"
        >
          <div className="text-center py-8">
            <Package size={64} className="mx-auto text-gray-400 mb-4" />
            <Title level={4} className="text-gray-600">
              Packing Functionality
            </Title>
            <Text type="secondary">
              This feature is under development and will be implemented soon.
            </Text>
          </div>

          <Form.Item className="mb-0 flex justify-end">
            <Space>
              <Button onClick={handleCancel} disabled={isLoading}>
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={isLoading}
                icon={<Package size={16} />}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? "Processing..." : "Start Packing"}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
};

export default ModalPacking;