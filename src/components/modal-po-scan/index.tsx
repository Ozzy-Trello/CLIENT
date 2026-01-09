import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  Form,
  Input,
  Button,
  message,
  Typography,
  Space,
  AutoComplete,
} from "antd";
import { Search, Package } from "lucide-react";
import ScannerIcon from "@components/icons/ScannerIcon";
import { Scanner } from "@yudiel/react-qr-scanner";
import QRGuideOverlay from "@components/qr-overlay";
import URLShortener from "@utils/url-shortener";
import {
  getCardByShortId,
  getFinishingPackingCards,
  type FinishingPackingCard,
  validateCardInFinishingPacking,
} from "@api/card";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { triggerOzzyDeliveryForCard } from "@api/ozzy-warehouse";

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
  const [finishingSearch, setFinishingSearch] = useState("");
  const [debouncedFinishingSearch, setDebouncedFinishingSearch] = useState("");
  const [finishingListId, setFinishingListId] = useState<string | undefined>();
  const params = useParams();
  const workspaceParam = Array.isArray(params.workspaceId)
    ? params.workspaceId[0]
    : params.workspaceId;

  const detectFinishingListId = async (
    targetCardId: string
  ): Promise<string | undefined> => {
    try {
      const cards = await getFinishingPackingCards(targetCardId, 1);
      const matchedCard = cards.find((card) => card.id === targetCardId);
      if (matchedCard?.listId) {
        return matchedCard.listId;
      }
    } catch (error) {
      console.warn("Failed to detect finishing listId:", error);
    }
    return undefined;
  };

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      form.resetFields();
      setCardId("");
      setIsValidating(false);
      setShowCameraScanner(false);
      scannerInputRef.current = "";
      scannerBufferRef.current = "";
      setFinishingSearch("");
      setDebouncedFinishingSearch("");
    }
  }, [open, form]);

  useEffect(() => {
    if (finishingSearch.trim() === "") {
      setFinishingListId(undefined);
    }
  }, [finishingSearch]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedFinishingSearch(finishingSearch);
    }, 300);
    return () => {
      clearTimeout(handler);
    };
  }, [finishingSearch]);

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

  // Validate card and open if valid
  const validateAndTriggerDelivery = async (targetCardId: string) => {
    if (!targetCardId.trim()) {
      message.error("Please enter a Card ID");
      return;
    }

    setIsValidating(true);
    try {
      const validationResponse = await validateCardInFinishingPacking(
        targetCardId.trim()
      );

      if (!validationResponse.data?.isValid) {
        message.error("Card is not yet in Finishing Packing list");
        return;
      }

      const response = await triggerOzzyDeliveryForCard(targetCardId.trim());
      message.success(
        response?.message ?? "Delivery automation triggered successfully"
      );

      if (!finishingListId && response?.card_id) {
        setFinishingListId(finishingListId);
      }

      onClose();
    } catch (error) {
      console.error("❌ [DEBUG] Validation error:", error);
      message.error(
        "Failed to validate card. Please check the Card ID and try again."
      );
    } finally {
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
      setFinishingSearch(extractedCardId);
      form.setFieldsValue({ cardId: extractedCardId });
      message.success(`Card ID scanned: ${extractedCardId}`);

      // Automatically validate and open the scanned card
      await validateAndOpenCard(extractedCardId);
    } else {
      message.error("Could not extract card ID from scanned data");
    }
  };

  const handleCameraScan = async (result: string) => {
    setShowCameraScanner(false);

    try {
      const extractedCardId = await extractCardIdFromScan(result);

      if (extractedCardId) {
        setCardId(extractedCardId);
        setFinishingSearch(extractedCardId);
        form.setFieldsValue({ cardId: extractedCardId });
        message.success("QR code scanned successfully! Validating...");

        // Automatically validate and open card after successful scan
        await validateAndOpenCard(extractedCardId);
      } else {
        message.error("Could not extract card ID from scanned QR code");
      }
    } catch (error) {
      console.error("❌ [DEBUG] Error processing scanned QR code:", error);
      message.error("Error processing scanned QR code");
    }
  };

  // Validate the card, ensure we know its listId, then trigger delivery automation
  const validateAndOpenCard = async (
    targetCardId: string,
    resolvedListId?: string
  ) => {
    const trimmedCardId = targetCardId?.trim();
    if (!trimmedCardId) {
      message.error("Please enter a Card ID");
      return;
    }

    // Try to capture listId from selection or fallback lookup
    const listIdToUse =
      resolvedListId ||
      finishingListId ||
      (await detectFinishingListId(trimmedCardId));
    if (listIdToUse) {
      setFinishingListId(listIdToUse);
    }

    await validateAndTriggerDelivery(trimmedCardId);
  };

  const handleValidateCard = async () => {
    await validateAndOpenCard(cardId);
  };

  const finishingCardsQuery = useQuery({
    queryKey: ["finishing-packing-cards", debouncedFinishingSearch],
    queryFn: () =>
      getFinishingPackingCards(
        debouncedFinishingSearch.trim() || undefined,
        30
      ),
    enabled: open,
  });

  const finishingCardOptions = (finishingCardsQuery.data || []).map(
    (card: FinishingPackingCard) => ({
      value: card.id,
      label: card.shortId
        ? `#${card.shortId} · ${card.name || card.id}`
        : card.name || card.id,
      listId: card.listId,
    })
  );

  const handleFinishingCardSelect = async (
    selectedCardId: string,
    option?: { label?: React.ReactNode }
  ) => {
    if (!selectedCardId) return;
    const listIdFromOption = (option as { listId?: string } | undefined)
      ?.listId;
    const selectedCard = finishingCardsQuery.data?.find(
      (card) => card.id === selectedCardId
    );
    const resolvedListId = listIdFromOption ?? selectedCard?.listId;
    setFinishingListId(resolvedListId);
    const label =
      typeof option?.label === "string"
        ? option.label
        : selectedCard?.shortId
        ? `#${selectedCard.shortId} · ${selectedCard.name || selectedCard.id}`
        : selectedCard?.name || selectedCardId;
    setFinishingSearch(label);
    setCardId(selectedCardId);
    form.setFieldsValue({ cardId: selectedCardId });
    await validateAndOpenCard(selectedCardId, selectedCard?.listId);
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
        destroyOnHidden
      >
        <div style={{ padding: "1rem" }}>
          <Form form={form} layout="vertical" onFinish={handleValidateCard}>
            <Form.Item
              label={
                <Text strong className="text-gray-700">
                  Cari atau Scan Card Finishing &amp; Packing
                </Text>
              }
              name="cardId"
              rules={[
                {
                  required: true,
                  message: "Please enter or scan a Card ID",
                },
              ]}
            >
              <AutoComplete
                value={finishingSearch}
                onSearch={(value) => setFinishingSearch(value)}
                onChange={(value) => {
                  setFinishingSearch(value);
                  setCardId(value);
                }}
                onSelect={(value, option) =>
                  handleFinishingCardSelect(value as string, option)
                }
                placeholder="Ketik nama card, short ID, atau scan QR code..."
                options={finishingCardOptions}
                filterOption={false}
                className="w-full"
                allowClear
                notFoundContent={
                  finishingCardsQuery.isFetching
                    ? "Memuat..."
                    : "Card tidak ditemukan"
                }
              >
                <Input size="large" className="rounded-lg" autoFocus />
              </AutoComplete>
            </Form.Item>

            <div className="mb-4 flex items-center justify-between">
              <Text type="secondary" className="text-sm">
                💡 You can scan a QR code or manually enter the Card ID
              </Text>
              <Button
                type="default"
                icon={<ScannerIcon size={16} />}
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
