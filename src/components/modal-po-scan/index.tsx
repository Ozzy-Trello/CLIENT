import React, { useState, useEffect, useRef } from "react";
import { Modal, Form, Input, Button, message, Typography, Space } from "antd";
import { Search, Package, Camera } from "lucide-react";
import { Scanner } from "@yudiel/react-qr-scanner";
import URLShortener from "@utils/url-shortener";
import { getCardByShortId } from "@api/card";
import { validateCardInFinishingPacking } from "@api/card";
import { useRouter } from "next/navigation";

interface ModalPOScanProps {
  open: boolean;
  onClose: () => void;
  boardId: string;
  listId: string;
}

const { Title, Text } = Typography;

const ModalPOScan: React.FC<ModalPOScanProps> = ({
  open,
  onClose,
  boardId,
  listId,
}) => {
  const [form] = Form.useForm();
  const [cardId, setCardId] = useState<string>("");
  const [isValidating, setIsValidating] = useState(false);
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const scannerInputRef = useRef<string>("");
  const scannerBufferRef = useRef<string>("");
  const scannerTimeoutRef = useRef<NodeJS.Timeout>();
  const router = useRouter();

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      form.resetFields();
      setCardId("");
      setIsValidating(false);
      setShowCameraScanner(false);
      scannerInputRef.current = "";
      scannerBufferRef.current = "";
    }
  }, [open, form]);

  // Handle external scanner input (barcode scanner that acts like keyboard)
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!open) return;

      // Check if it's Enter key (scanner typically sends Enter after scanning)
      if (event.key === "Enter") {
        const scannedData = scannerBufferRef.current.trim();
        if (scannedData.length > 0) {
          handleScan(scannedData);
          scannerBufferRef.current = "";
        }
        return;
      }

      // Accumulate characters for scanner input
      if (event.key.length === 1) {
        scannerBufferRef.current += event.key;

        // Clear buffer after timeout (in case it's manual typing)
        if (scannerTimeoutRef.current) {
          clearTimeout(scannerTimeoutRef.current);
        }
        scannerTimeoutRef.current = setTimeout(() => {
          scannerBufferRef.current = "";
        }, 1000);
      }
    };

    if (open) {
      document.addEventListener("keypress", handleKeyPress);
    }

    return () => {
      document.removeEventListener("keypress", handleKeyPress);
      if (scannerTimeoutRef.current) {
        clearTimeout(scannerTimeoutRef.current);
      }
    };
  }, [open]);

  const handleCardIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCardId(e.target.value);
  };

  // Validate card and open if valid
  const validateAndOpenCard = async (targetCardId: string) => {
    console.log("🔍 [DEBUG] validateAndOpenCard called with:", targetCardId);
    
    if (!targetCardId.trim()) {
      console.log("❌ [DEBUG] Empty card ID provided");
      message.error("Please enter a Card ID");
      return;
    }

    console.log("⏳ [DEBUG] Setting isValidating to true");
    setIsValidating(true);
    try {
      console.log("🔍 [DEBUG] Calling validateCardInFinishingPacking API...");
      // Validate if card is in Finishing Packing list
      const validationResponse = await validateCardInFinishingPacking(
        targetCardId.trim()
      );
      console.log("📋 [DEBUG] Validation response:", validationResponse);

      if (validationResponse.data?.isValid) {
        console.log("✅ [DEBUG] Card is valid, navigating to card details...");
        message.success("Card is in Finishing Packing list. Opening card...");

        // Navigate to the card details with query parameters
        const navigationUrl = `/workspace/${boardId}/board/${boardId}?cardId=${targetCardId}&listId=${listId}`;
        console.log("🚀 [DEBUG] Navigating to:", navigationUrl);
        router.push(navigationUrl);

        console.log("🚪 [DEBUG] Closing modal...");
        // Close modal after opening card
        onClose();
      } else {
        console.log("❌ [DEBUG] Card is not in Finishing Packing list");
        message.error("Card is not yet in Finishing Packing list");
      }
    } catch (error) {
      console.error("❌ [DEBUG] Validation error:", error);
      message.error(
        "Failed to validate card. Please check the Card ID and try again."
      );
    } finally {
      console.log("🏁 [DEBUG] Setting isValidating to false");
      setIsValidating(false);
    }
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

      // Automatically validate and open the scanned card
      await validateAndOpenCard(extractedCardId);
    } else {
      message.error("Could not extract card ID from scanned data");
    }
  };

  const handleCameraScan = async (result: string) => {
    console.log("🎥 [DEBUG] Camera scan triggered with result:", result);
    setShowCameraScanner(false);

    try {
      console.log("🔍 [DEBUG] Extracting card ID from scanned data...");
      const extractedCardId = await extractCardIdFromScan(result);
      console.log("🔍 [DEBUG] Extracted card ID:", extractedCardId);

      if (extractedCardId) {
        console.log("✅ [DEBUG] Card ID extracted successfully, setting form values...");
        setCardId(extractedCardId);
        form.setFieldsValue({ cardId: extractedCardId });
        message.success("QR code scanned successfully! Validating...");
        
        console.log("🚀 [DEBUG] Calling validateAndOpenCard with:", extractedCardId);
        // Automatically validate and open card after successful scan
        await validateAndOpenCard(extractedCardId);
        console.log("✅ [DEBUG] validateAndOpenCard completed");
      } else {
        console.log("❌ [DEBUG] Could not extract card ID from scanned data");
        message.error("Could not extract card ID from scanned QR code");
      }
    } catch (error) {
      console.error("❌ [DEBUG] Error processing scanned QR code:", error);
      message.error("Error processing scanned QR code");
    }
  };

  const handleValidateCard = async () => {
    await validateAndOpenCard(cardId);
  };

  const handleCancel = () => {
    form.resetFields();
    setCardId("");
    setIsValidating(false);
    onClose();
  };

  return (
    <>
      <Modal
        title={
          <div className="flex items-center gap-2">
            <Search size={20} className="text-green-600" />
            <Title level={4} className="mb-0">
              Scan PO Card
            </Title>
          </div>
        }
        open={open}
        onCancel={handleCancel}
        footer={null}
        width={500}
        destroyOnClose
      >
        <div style={{ padding: '1rem' }}>
          <Form form={form} layout="vertical" onFinish={handleValidateCard}>
            <Form.Item
              label={
                <Text strong className="text-gray-700">
                  Card ID
                </Text>
              }
              name="cardId"
              rules={[
                {
                  required: true,
                  message: "Please enter a Card ID or scan a QR code",
                },
              ]}
            >
              <Input
                value={cardId}
                onChange={handleCardIdChange}
                placeholder="Enter Card ID or scan QR code..."
                size="large"
                className="rounded-lg"
                autoFocus
              />
            </Form.Item>

            <div className="mb-4 flex items-center justify-between">
              <Text type="secondary" className="text-sm">
                💡 You can scan a QR code or manually enter the Card ID
              </Text>
              <Button
                type="default"
                icon={<Camera size={16} />}
                onClick={() => setShowCameraScanner(true)}
                className="flex items-center gap-2"
              >
                Use Camera
              </Button>
            </div>

            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Package size={16} className="text-blue-600" />
                <Text strong className="text-blue-800">
                  Status: {isValidating ? "Validating..." : "Ready to scan"}
                </Text>
              </div>
            </div>

            <Form.Item className="mb-0">
              <Space className="w-full justify-between">
                <Button onClick={handleCancel} disabled={isValidating}>
                  Cancel
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={isValidating}
                  disabled={!cardId.trim()}
                  icon={<Search size={16} />}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isValidating ? "Validating..." : "Validate & Open Card"}
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </div>
      </Modal>

      {/* Camera Scanner Modal */}
      <Modal
        title="Scan QR Code with Camera"
        open={showCameraScanner}
        onCancel={() => setShowCameraScanner(false)}
        footer={[
          <Button key="cancel" onClick={() => setShowCameraScanner(false)}>
            Cancel
          </Button>
        ]}
        width={400}
        centered
        zIndex={2000}
        maskStyle={{ zIndex: 1999 }}
      >
        <div className="flex flex-col items-center">
          <div className="w-full max-w-sm">
            <Scanner
              onScan={(result) => {
                if (result && result.length > 0) {
                  handleCameraScan(result[0].rawValue);
                }
              }}
              onError={(error) => {
                console.error("Scanner error:", error);
                message.error("Camera scanning failed. Please try again.");
              }}
              styles={{
                container: { width: "100%" },
                video: { width: "100%" }
              }}
            />
          </div>
          <Text type="secondary" className="mt-4 text-center">
            Position the QR code within the camera frame
          </Text>
        </div>
      </Modal>
    </>
  );
};

export default ModalPOScan;