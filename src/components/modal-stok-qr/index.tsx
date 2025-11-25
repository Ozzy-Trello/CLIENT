import React, { useState, useEffect, useRef } from "react";
import { Modal, Form, Input, Button, message, Typography, Space } from "antd";
import { Package, QrCode, Camera } from "lucide-react";
import { Scanner } from "@yudiel/react-qr-scanner";
import QRGuideOverlay from "@components/qr-overlay";

interface ModalStokQRProps {
  open: boolean;
  onClose: () => void;
}

const { Title, Text } = Typography;

const ModalStokQR: React.FC<ModalStokQRProps> = ({ open, onClose }) => {
  const [form] = Form.useForm();
  const [selectedSO, setSelectedSO] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [showCameraScanner, setShowCameraScanner] = useState<boolean>(false);
  const scannerBufferRef = useRef<string>("");
  const scannerTimeoutRef = useRef<NodeJS.Timeout>();

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
        "Shift",
        "Control",
        "Alt",
        "Meta",
        "Tab",
        "Escape",
        "CapsLock",
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "Home",
        "End",
        "PageUp",
        "PageDown",
        "Insert",
        "Delete",
        "F1",
        "F2",
        "F3",
        "F4",
        "F5",
        "F6",
        "F7",
        "F8",
        "F9",
        "F10",
        "F11",
        "F12",
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

  const handleSOChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedSO(e.target.value);
    form.setFieldsValue({ soNumber: e.target.value });
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
      window.open(barcodeUrl, "_blank");
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
      window.open(barcodeUrl, "_blank");

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

  const toggleCameraScanner = () => {
    setShowCameraScanner(!showCameraScanner);
  };

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
      destroyOnHidden
    >
      <div style={{ padding: "1rem" }}>
        <Form form={form} layout="vertical" onFinish={handleGenerateQR}>
          <Form.Item
            label={
              <Text strong className="text-gray-700">
                Nomor SO
              </Text>
            }
            name="soNumber"
            rules={[{ required: true, message: "Please enter a Nomor SO" }]}
          >
            <div className="flex gap-2">
              <Input
                placeholder="Enter or scan SO number"
                value={selectedSO}
                onChange={handleSOChange}
                size="large"
                className="flex-1"
              />
              <Button
                icon={<Camera size={16} />}
                onClick={toggleCameraScanner}
                size="large"
                type={showCameraScanner ? "primary" : "default"}
                className="flex items-center"
              >
                {showCameraScanner ? "Close" : "Scan"}
              </Button>
            </div>
          </Form.Item>

          {/* Camera Scanner Modal */}
          <Modal
            title="Scan QR Code with Camera"
            open={showCameraScanner}
            onCancel={() => setShowCameraScanner(false)}
            footer={null}
            width={400}
            centered
            zIndex={2000}
            styles={{
              mask: { zIndex: 1999 },
            }}
          >
            <div className="p-4">
              <div className="relative w-full h-[320px]">
                <Scanner
                  onScan={(result) => {
                    if (result && result.length > 0) {
                      const scannedData = result[0].rawValue;
                      handleScan(scannedData);
                      setShowCameraScanner(false);
                    }
                  }}
                  onError={(error) => {
                    console.error("Scanner error:", error);
                    message.error("Camera scanning failed");
                  }}
                  constraints={{
                    facingMode: "environment",
                  }}
                  styles={{
                    container: {
                      width: "100%",
                      height: "100%",
                    },
                    video: {
                      width: "100%",
                      height: "100%",
                    },
                  }}
                />
              <QRGuideOverlay imageClassName="h-24 w-auto max-w-[140px] opacity-70" />
              </div>
            </div>
          </Modal>

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
                disabled={!selectedSO}
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
