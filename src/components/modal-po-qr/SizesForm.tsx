import React, { useState, useEffect } from "react";
import { Modal, Input, Button, Typography, Row, Col, Space, InputNumber } from "antd";
import { Plus } from "lucide-react";
import { SizeQuantity } from "@api/po";

interface SizesFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (sizes: SizeQuantity) => void;
  initialSizes?: SizeQuantity;
  poNumber: string;
}

const { Title, Text } = Typography;

const STANDARD_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL", "XXXXXL"];

const SizesForm: React.FC<SizesFormProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  initialSizes = {}, 
  poNumber 
}) => {
  const [sizes, setSizes] = useState<SizeQuantity>(initialSizes);
  const [customSizes, setCustomSizes] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setSizes(initialSizes);
      // Extract custom sizes (sizes not in standard list)
      const customSizeKeys = Object.keys(initialSizes).filter(
        size => !STANDARD_SIZES.includes(size)
      );
      setCustomSizes(customSizeKeys);
    }
  }, [isOpen, initialSizes]);

  const handleSizeChange = (size: string, value: number | null) => {
    setSizes(prev => ({
      ...prev,
      [size]: value || 0
    }));
  };

  const addCustomSize = () => {
    const newCustomSize = `Custom${customSizes.length + 1}`;
    setCustomSizes(prev => [...prev, newCustomSize]);
    setSizes(prev => ({
      ...prev,
      [newCustomSize]: 0
    }));
  };

  const removeCustomSize = (sizeToRemove: string) => {
    setCustomSizes(prev => prev.filter(size => size !== sizeToRemove));
    setSizes(prev => {
      const newSizes = { ...prev };
      delete newSizes[sizeToRemove];
      return newSizes;
    });
  };

  const calculateTotalQuantity = () => {
    return Object.values(sizes).reduce((total, quantity) => total + (quantity || 0), 0);
  };

  const handleSave = () => {
    // Filter out sizes with 0 quantity
    const filteredSizes = Object.fromEntries(
      Object.entries(sizes).filter(([_, quantity]) => quantity > 0)
    );
    onSave(filteredSizes);
    onClose();
  };

  const handleCancel = () => {
    setSizes(initialSizes);
    setCustomSizes(Object.keys(initialSizes).filter(size => !STANDARD_SIZES.includes(size)));
    onClose();
  };

  return (
    <Modal
      title={
        <div>
          <Title level={4} className="mb-1">
            Edit Sizes - PO {poNumber}
          </Title>
        </div>
      }
      open={isOpen}
      onCancel={handleCancel}
      footer={
        <div className="flex justify-between items-center">
          <Text type="secondary">
            Total Quantity: {calculateTotalQuantity()}
          </Text>
          <Space>
            <Button onClick={handleCancel}>Cancel</Button>
            <Button type="primary" onClick={handleSave}>
              Save Sizes
            </Button>
          </Space>
        </div>
      }
      width={600}
      centered
    >
      <div className="py-4">
        {/* Total Quantity Display */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center">
            <Text strong className="text-lg">
              Total Quantity: {calculateTotalQuantity()}
            </Text>
            <Text type="secondary" className="text-blue-600">
              Calculated from sizes
            </Text>
          </div>
        </div>

        {/* Standard Sizes Grid */}
        <Row gutter={[16, 16]} className="mb-6">
          {STANDARD_SIZES.map((size) => (
            <Col span={8} key={size}>
              <div className="text-center">
                <Text strong className="block mb-2">
                  {size}
                </Text>
                <InputNumber
                  value={sizes[size] || 0}
                  onChange={(value) => handleSizeChange(size, value)}
                  min={0}
                  className="w-full"
                  size="large"
                />
              </div>
            </Col>
          ))}
        </Row>

        {/* Custom Sizes Section */}
        <div className="border-t pt-4">
          <div className="flex justify-between items-center mb-4">
            <Title level={5} className="mb-0">
              Custom Sizes
            </Title>
            <Button
              type="dashed"
              icon={<Plus size={16} />}
              onClick={addCustomSize}
              size="small"
            >
              Custom Size
            </Button>
          </div>

          {customSizes.length > 0 && (
            <Row gutter={[16, 16]}>
              {customSizes.map((size) => (
                <Col span={8} key={size}>
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Input
                        value={size}
                        onChange={(e) => {
                          const newSize = e.target.value;
                          const oldSize = size;
                          setCustomSizes(prev => 
                            prev.map(s => s === oldSize ? newSize : s)
                          );
                          setSizes(prev => {
                            const newSizes = { ...prev };
                            newSizes[newSize] = newSizes[oldSize] || 0;
                            delete newSizes[oldSize];
                            return newSizes;
                          });
                        }}
                        size="small"
                        className="text-center font-semibold"
                      />
                      <Button
                        type="text"
                        danger
                        size="small"
                        onClick={() => removeCustomSize(size)}
                        className="ml-1"
                      >
                        ×
                      </Button>
                    </div>
                    <InputNumber
                      value={sizes[size] || 0}
                      onChange={(value) => handleSizeChange(size, value)}
                      min={0}
                      className="w-full"
                      size="large"
                    />
                  </div>
                </Col>
              ))}
            </Row>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default SizesForm;