import React, { useState, useEffect, useRef } from "react";
import { Modal, Form, Input, Button, message, Typography, Space } from "antd";
import { Package, QrCode } from "lucide-react";
import ScannerIcon from "@components/icons/ScannerIcon";
import { Scanner } from "@yudiel/react-qr-scanner";
import QRGuideOverlay from "@components/qr-overlay";
import { generateQRCodesPDF } from "@api/qr";
import URLShortener from "@utils/url-shortener";
import { getCardByShortId } from "@api/card";

interface ModalPOQRProps {
  open: boolean;
  onClose: () => void;
  boardId: string;
  listId: string;
}

const { Title, Text } = Typography;

const ModalPOQR: React.FC<ModalPOQRProps> = ({
  open,
  onClose,
  boardId,
  listId,
}) => {
  const [form] = Form.useForm();
  const [cardId, setCardId] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [showCameraScanner, setShowCameraScanner] = useState<boolean>(false);
  const scannerBufferRef = useRef<string>("");
  const scannerTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      form.resetFields();
      setCardId("");
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

  const handleCardIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCardId(e.target.value);
  };

  const toggleCameraScanner = () => {
    setShowCameraScanner(!showCameraScanner);
  };

  // Extract card ID from scanned data
  const extractCardIdFromScan = async (
    scannedData: string
  ): Promise<string | null> => {
    const trimmedData = scannedData.trim();

    if (trimmedData.length === 0) return null;

    // Check if it's a shortId URL format (e.g., https://domain.com/qr/123 or just /qr/123)
    try {
      const url = new URL(
        trimmedData.startsWith("http")
          ? trimmedData
          : `https://example.com${trimmedData}`
      );
      const pathParts = url.pathname.split("/");

      // Check for /qr/[shortId] pattern
      if (pathParts.length >= 3 && pathParts[1] === "qr") {
        const shortId = parseInt(pathParts[2]);
        if (!isNaN(shortId)) {
          try {
            const response = await getCardByShortId(shortId);
            if (response.data) {
              return response.data.id;
            }
          } catch (error) {
            console.warn(
              "Failed to resolve shortId via backend, trying legacy method:",
              error
            );
          }
        }
      }
    } catch (error) {
      // Not a valid URL, continue with other methods
    }

    // Fallback to legacy URLShortener (handles both short and long URLs)
    const cardIdFromUrl = URLShortener.extractCardIdFromUrl(trimmedData);
    if (cardIdFromUrl) {
      return cardIdFromUrl;
    }

    // If URL parsing fails, treat as direct card ID
    return trimmedData.length > 0 ? trimmedData : null;
  };

  const handleScan = async (scannedData: string) => {
    const extractedCardId = await extractCardIdFromScan(scannedData);

    if (extractedCardId) {
      setCardId(extractedCardId);
      form.setFieldsValue({ cardId: extractedCardId });
      message.success(`Card ID scanned: ${extractedCardId}`);

      // Automatically generate PDF after successful scan
      await generatePDFForCardId(extractedCardId);
    } else {
      message.error("Could not extract card ID from scanned data");
    }
  };

  const generatePDFForCardId = async (targetCardId: string) => {
    if (!targetCardId.trim()) {
      message.error("Please enter a Card ID");
      return;
    }

    setIsGenerating(true);
    try {
      // Call the QR API service to generate PDF
      const pdfBlob = await generateQRCodesPDF(targetCardId.trim());

      // Create a URL for the blob and open it in a new tab
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const printWindow = window.open(pdfUrl, "_blank");

      if (printWindow) {
        // Focus the new window
        printWindow.focus();
      }

      // Clean up after a delay (to allow viewing/printing)
      setTimeout(() => {
        URL.revokeObjectURL(pdfUrl);
      }, 30000); // Extended cleanup time

      message.success(
        `PDF generated and opened for printing for Card ID: ${targetCardId}`
      );

      // Close modal after generating PDF
      onClose();
    } catch (error) {
      message.error(
        "Failed to generate PDF. Please check the Card ID and try again."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGeneratePDF = async () => {
    await generatePDFForCardId(cardId);
  };

  const handleCancel = () => {
    form.resetFields();
    setCardId("");
    onClose();
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <Package size={20} className="text-blue-600" />
          <Title level={4} className="mb-0">
            Generate QR - PO
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
        <Form form={form} layout="vertical" onFinish={handleGeneratePDF}>
          <Form.Item
            label={
              <Text strong className="text-gray-700">
                Card ID
              </Text>
            }
            name="cardId"
            rules={[{ required: true, message: "Please enter a Card ID" }]}
          >
            <div className="flex gap-2">
              <Input
                placeholder="Enter or scan Card ID"
                value={cardId}
                onChange={handleCardIdChange}
                size="large"
                className="flex-1"
              />
              <Button
                icon={<ScannerIcon size={16} />}
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

          {cardId && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <Text type="secondary" className="text-sm">
                Selected Card ID: <Text strong>{cardId}</Text>
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
              Scan QR code with your external scanner to auto-fill Card ID
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
                disabled={!cardId.trim()}
                icon={<QrCode size={16} />}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isGenerating ? "Generating PDF..." : "Generate PDF"}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
};

export default ModalPOQR;
