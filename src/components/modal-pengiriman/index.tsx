import React, { useState, useEffect } from "react";
import {
  Modal,
  Form,
  Button,
  message,
  Typography,
  Space,
} from "antd";
import { ShoppingCart } from "lucide-react";

interface ModalPengirimanProps {
  open: boolean;
  onClose: () => void;
}

const { Title, Text } = Typography;

const ModalPengiriman: React.FC<ModalPengirimanProps> = ({ open, onClose }) => {
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
      // TODO: Implement pengiriman functionality
      message.success("Pengiriman functionality will be implemented here");
      onClose();
    } catch (error) {
      console.error("Error in pengiriman:", error);
      message.error("Failed to process pengiriman");
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
          <ShoppingCart size={20} className="text-blue-600" />
          <span>Pengiriman</span>
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
            <ShoppingCart size={64} className="mx-auto text-gray-400 mb-4" />
            <Title level={4} className="text-gray-600">
              Pengiriman Functionality
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
                icon={<ShoppingCart size={16} />}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? "Processing..." : "Start Pengiriman"}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
};

export default ModalPengiriman;