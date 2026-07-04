import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  Form,
  Button,
  message,
  Typography,
  Space,
  AutoComplete,
} from "antd";
import { Search, Package, Truck } from "lucide-react";
import ScannerIcon from "@components/icons/ScannerIcon";
import { Scanner } from "@yudiel/react-qr-scanner";
import QRGuideOverlay from "@components/qr-overlay";
import URLShortener from "@utils/url-shortener";
import {
  getCardByShortId,
  getFinishingPackingCards,
  type FinishingPackingCard,
  triggerDelivery,
} from "@api/card";
import { useQuery } from "@tanstack/react-query";

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
  const [searchValue, setSearchValue] = useState<string>("");
  const [selectedCardId, setSelectedCardId] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const scannerBufferRef = useRef<string>("");
  const scannerTimeoutRef = useRef<NodeJS.Timeout>();
  const scanProcessedRef = useRef(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      form.resetFields();
      setSearchValue("");
      setSelectedCardId("");
      setIsProcessing(false);
      setShowCameraScanner(false);
      scannerBufferRef.current = "";
      setDebouncedSearch("");
      scanProcessedRef.current = false;
    }
  }, [open, form]);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchValue);
    }, 300);
    return () => {
      clearTimeout(handler);
    };
  }, [searchValue]);

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

  // Trigger Delivery and publish automation event
  const processDelivery = async (cardId: string) => {
    if (!cardId.trim()) {
      message.error("Please select or scan a card");
      return;
    }

    setIsProcessing(true);
    try {
      const result = await triggerDelivery(cardId.trim());

      if (result.success) {
        message.success("Delivery triggered successfully! Automation will run.");
        setSearchValue("");
        setSelectedCardId("");
        // Keep modal open for more scans
      } else {
        message.error(result.message || "Failed to trigger delivery");
      }
    } catch (error: any) {
      console.error("❌ [DEBUG] Delivery trigger error:", error);
      message.error(
        error?.response?.data?.message ||
        "Failed to trigger delivery. Please try again."
      );
    } finally {
      setIsProcessing(false);
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
      setSelectedCardId(extractedCardId);
      setSearchValue("");
      message.success(`Card scanned: ${extractedCardId.slice(0, 8)}...`);

      // Automatically trigger delivery for scanned card
      await processDelivery(extractedCardId);
    } else {
      message.error("Could not extract card ID from scanned data");
    }
  };

  const handleCameraScan = async (result: string) => {
    if (scanProcessedRef.current) return;
    scanProcessedRef.current = true;
    setShowCameraScanner(false);

    try {
      const extractedCardId = await extractCardIdFromScan(result);

      if (extractedCardId) {
        setSelectedCardId(extractedCardId);
        setSearchValue("");
        message.success("QR code scanned successfully! Processing...");

        // Automatically trigger delivery after successful scan
        await processDelivery(extractedCardId);
      } else {
        message.error("Could not extract card ID from scanned QR code");
      }
    } catch (error) {
      console.error("❌ [DEBUG] Error processing scanned QR code:", error);
      message.error("Error processing scanned QR code");
    }
  };

  const finishingCardsQuery = useQuery({
    queryKey: ["finishing-packing-cards", debouncedSearch],
    queryFn: () =>
      getFinishingPackingCards(
        debouncedSearch.trim() || undefined,
        30
      ),
    enabled: open,
  });

  const cardOptions = (finishingCardsQuery.data || []).map(
    (card: FinishingPackingCard) => ({
      value: card.id,
      label: card.shortId
        ? `#${card.shortId} · ${card.name || card.id}`
        : card.name || card.id,
    })
  );

  const handleCardSelect = async (cardId: string) => {
    if (!cardId) return;
    setSelectedCardId(cardId);
    setSearchValue("");

    // Automatically trigger delivery
    await processDelivery(cardId);
  };

  const handleCancel = () => {
    form.resetFields();
    setSearchValue("");
    setSelectedCardId("");
    setIsProcessing(false);
    onClose();
  };

  return (
    <>
      <Modal
        title={
          <div className="flex items-center gap-2">
            <Truck size={20} className="text-green-600" />
            <Title level={4} className="mb-0">
              Scan Delivery
            </Title>
          </div>
        }
        open={open}
        onCancel={handleCancel}
        footer={null}
        width={500}
        destroyOnHidden
      >
        <div style={{ padding: "1rem" }}>
          <Form form={form} layout="vertical">
            <Form.Item
              label={
                <Text strong className="text-gray-700">
                  Search or Scan Card
                </Text>
              }
            >
              <AutoComplete
                value={searchValue}
                onChange={setSearchValue}
                onSelect={handleCardSelect}
                placeholder="Type card name, short ID, or scan QR..."
                options={cardOptions}
                filterOption={false}
                className="w-full"
                allowClear
                size="large"
                notFoundContent={
                  finishingCardsQuery.isFetching
                    ? "Loading..."
                    : searchValue.trim()
                      ? "No cards found"
                      : "Start typing to search"
                }
              />
            </Form.Item>

            <div className="mb-4 flex items-center justify-between">
              <Text type="secondary" className="text-sm">
                💡 Search by name, scan QR, or use barcode scanner
              </Text>
              <Button
                type="default"
                icon={<ScannerIcon size={16} />}
                onClick={() => setShowCameraScanner(true)}
                className="flex items-center gap-2"
              >
                Camera
              </Button>
            </div>

            <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <Package size={16} className="text-green-600" />
                <Text strong className="text-green-800">
                  Status: {isProcessing ? "Processing..." : "Ready to scan"}
                </Text>
              </div>
              <Text className="text-green-700 text-sm">
                Scanning a card will trigger the &quot;Delivery&quot; checkbox and run automations
              </Text>
            </div>

            <Form.Item className="mb-0">
              <Space className="w-full justify-end">
                <Button onClick={handleCancel} disabled={isProcessing}>
                  Close
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
        onCancel={() => { scanProcessedRef.current = false; setShowCameraScanner(false); }}
        afterClose={() => { scanProcessedRef.current = false; }}
        footer={[
          <Button key="cancel" onClick={() => { scanProcessedRef.current = false; setShowCameraScanner(false); }}>
            Cancel
          </Button>,
        ]}
        width={400}
        centered
        zIndex={2000}
        styles={{
          mask: { zIndex: 1999 },
        }}
      >
        <div className="flex flex-col items-center">
          <div className="w-full max-w-sm">
            <div className="relative w-full h-[320px]">
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
                  container: { width: "100%", height: "100%" },
                  video: { width: "100%", height: "100%" },
                }}
              />
              <QRGuideOverlay imageClassName="h-24 w-auto max-w-[140px] opacity-70" />
            </div>
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
