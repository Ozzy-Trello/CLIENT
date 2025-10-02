import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  Form,
  Select,
  Button,
  message,
  Typography,
  Spin,
  Space,
} from "antd";
import { Package, QrCode } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getOzzySalesOrders, OzzySalesOrder } from "@api/ozzy-warehouse";

interface ModalStokQRProps {
  open: boolean;
  onClose: () => void;
}

const { Option } = Select;
const { Title, Text } = Typography;

const ModalStokQR: React.FC<ModalStokQRProps> = ({ open, onClose }) => {
  const [form] = Form.useForm();
  const [selectedSO, setSelectedSO] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const scannerBufferRef = useRef<string>("");
  const scannerTimeoutRef = useRef<NodeJS.Timeout>();

  // Fetch sales orders from warehouse API
  const {
    data: salesOrders = [],
    isLoading: isLoadingSalesOrders,
    error: salesOrdersError,
  } = useQuery({
    queryKey: ["ozzy-sales-orders"],
    queryFn: () => getOzzySalesOrders(),
    enabled: open,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      form.resetFields();
      setSelectedSO("");
    }
  }, [open, form]);

  // External scanner handler
  useEffect(() => {
    const handleScannerInput = (e: KeyboardEvent) => {
      // Only handle scanner input when modal is open
      if (!open) return;

      // Filter out unwanted keys that external scanners might send
      const unwantedKeys = [
        "Shift", "Control", "Alt", "Meta", "Tab", "Escape", "CapsLock",
        "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End",
        "PageUp", "PageDown", "Insert", "Delete", "F1", "F2", "F3", "F4",
        "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12"
      ];

      if (unwantedKeys.includes(e.key)) {
        return;
      }

      // Clear any existing timeout
      if (scannerTimeoutRef.current) {
        clearTimeout(scannerTimeoutRef.current);
      }

      if (e.key === "Enter") {
        e.preventDefault();
        if (scannerBufferRef.current.trim()) {
          handleScan(scannerBufferRef.current.trim());
        }
        scannerBufferRef.current = "";
        return;
      }

      // Only add printable characters to the buffer
      if (e.key.length === 1) {
        scannerBufferRef.current += e.key;
      }

      // Clear buffer after 100ms of no input (typical for external scanners)
      scannerTimeoutRef.current = setTimeout(() => {
        scannerBufferRef.current = "";
      }, 100);
    };

    if (open) {
      document.addEventListener("keydown", handleScannerInput);
    }

    return () => {
      document.removeEventListener("keydown", handleScannerInput);
      if (scannerTimeoutRef.current) {
        clearTimeout(scannerTimeoutRef.current);
      }
    };
  }, [open]);

  const handleSOChange = (value: string) => {
    setSelectedSO(value);
  };

  // Extract SO number from scanned data
  const extractSOFromScan = (scannedData: string): string | null => {
    // Look for SO pattern with dots: SO.2025.10.00105
    const soWithDotsMatch = scannedData.match(/SO\.[\d\.]+/i);
    if (soWithDotsMatch) {
      return soWithDotsMatch[0].toUpperCase();
    }
    
    // Look for SO pattern: SO followed by numbers (original format)
    const soMatch = scannedData.match(/SO\d+/i);
    if (soMatch) {
      return soMatch[0].toUpperCase();
    }
    
    // If no SO pattern found, check if the entire string looks like an SO number with dots
    if (/^SO\.[\d\.]+$/i.test(scannedData.trim())) {
      return scannedData.trim().toUpperCase();
    }
    
    // Check if the entire string looks like an SO number (original format)
    if (/^SO\d+$/i.test(scannedData.trim())) {
      return scannedData.trim().toUpperCase();
    }
    
    return null;
  };

  const handleScan = (scannedData: string) => {
    const extractedSO = extractSOFromScan(scannedData);
    
    if (extractedSO) {
      setSelectedSO(extractedSO);
      form.setFieldsValue({ soNumber: extractedSO });
      
      // Directly open the barcode URL
      const barcodeUrl = `https://warehouse.ozzyclothing.co.id/warehouse/barcode-production/print/${extractedSO}`;
      window.open(barcodeUrl, '_blank');
      message.success(`Opening barcode printing for SO: ${extractedSO}`);
      onClose();
    } else {
      message.error("Could not extract SO number from scanned data");
    }
  };

  const handleGenerateQR = async () => {
    if (!selectedSO) {
      message.error("Please select a Nomor SO");
      return;
    }

    setIsGenerating(true);
    try {
      // Open barcode printing URL in new tab
      const barcodeUrl = `https://warehouse.ozzyclothing.co.id/warehouse/barcode-production/print/${selectedSO}`;
      window.open(barcodeUrl, '_blank');
      
      message.success(`Opening barcode printing for SO: ${selectedSO}`);
      
      // Close modal after opening the URL
      onClose();
    } catch (error) {
      console.error("Error opening barcode URL:", error);
      message.error("Failed to open barcode printing page");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setSelectedSO("");
    onClose();
  };

  // Filter and format sales orders for display
  const formatSalesOrdersForSelect = (orders: OzzySalesOrder[]) => {
    return orders.map((order) => ({
      value: order.soNumber,
      label: `${order.soNumber} - ${order.supplierName}`,
      order,
    }));
  };

  const formattedSalesOrders = formatSalesOrdersForSelect(salesOrders);

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <Package size={20} className="text-blue-600" />
          <Title level={4} className="mb-0">
            Generate QR - Stok
          </Title>
        </div>
      }
      open={open}
      onCancel={handleCancel}
      footer={null}
      width={500}
      centered
      destroyOnClose
    >
      <div className="py-4">
        <Form form={form} layout="vertical" onFinish={handleGenerateQR}>
          <Form.Item
            label={
              <Text strong className="text-gray-700">
                Nomor SO
              </Text>
            }
            name="soNumber"
            rules={[{ required: true, message: "Please select a Nomor SO" }]}
          >
            <Select
              placeholder="Scan or search"
              value={selectedSO}
              onChange={handleSOChange}
              showSearch
              filterOption={(input, option) =>
                String(option?.label ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              loading={isLoadingSalesOrders}
              notFoundContent={
                isLoadingSalesOrders ? (
                  <div className="text-center py-4">
                    <Spin size="small" />
                    <div className="mt-2 text-gray-500">Loading SO numbers...</div>
                  </div>
                ) : salesOrdersError ? (
                  <div className="text-center py-4 text-red-500">
                    Failed to load SO numbers
                  </div>
                ) : (
                  "No SO numbers found"
                )
              }
              size="large"
            >
              {formattedSalesOrders.map((item) => (
                <Option key={item.value} value={item.value} label={item.label}>
                  <div className="flex flex-col">
                    <Text strong>{item.value}</Text>
                    <Text type="secondary" className="text-xs">
                      {item.order.supplierName} - {item.order.date}
                    </Text>
                  </div>
                </Option>
              ))}
            </Select>
          </Form.Item>

          {selectedSO && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <Text type="secondary" className="text-sm">
                Selected SO: <Text strong>{selectedSO}</Text>
              </Text>
            </div>
          )}

          {/* Scanner Status Indicator */}
          <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <Text type="secondary" className="text-sm text-green-700">
                Ready for external scanner input
              </Text>
            </div>
            <Text type="secondary" className="text-xs text-green-600 mt-1">
              Scan QR code with your external scanner to auto-fill SO number
            </Text>
          </div>

          <Form.Item className="mb-0">
            <Space className="w-full justify-end">
              <Button onClick={handleCancel} disabled={isGenerating}>
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={isGenerating}
                disabled={!selectedSO || isLoadingSalesOrders}
                icon={<QrCode size={16} />}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isGenerating ? "Generating..." : "Generate QR"}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </div>


    </Modal>
  );
};

export default ModalStokQR;