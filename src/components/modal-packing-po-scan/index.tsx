import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  Form,
  Input,
  Button,
  Typography,
  Space,
  message,
  Progress,
} from "antd";
import {
  Search,
  Package,
  ShoppingCart,
  CheckCircle,
} from "lucide-react";
import ScannerIcon from "@components/icons/ScannerIcon";
import { Scanner } from "@yudiel/react-qr-scanner";
import URLShortener from "@utils/url-shortener";
import { cardDetails, getCardByShortId } from "@api/card";
import { cardCustomFields } from "@api/card_custom_field";
import { LookupCache } from "@utils/lookup-cache";
import QRGuideOverlay from "@components/qr-overlay";
interface ModalPackingPOScanProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  boardId: string;
  listId: string;
  onOpenScanProgress?: (cardId: string) => void;
}

const { Title, Text } = Typography;

const normalizeText = (value?: string | null) =>
  String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const parseCheckbox = (value: any): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const v = value.toLowerCase().trim();
    return ["true", "1", "yes", "y", "checked"].includes(v);
  }
  return false;
};

const getFieldRawValue = (field: any): string => {
  return String(
    field?.value ??
    field?.valueString ??
    field?.valueOption ??
    field?.value_string ??
    field?.value_option ??
    ""
  ).trim();
};

const hasFieldValue = (field: any): boolean => {
  const raw = getFieldRawValue(field);
  if (raw) return true;

  const checkboxValue =
    field?.valueCheckbox ??
    field?.value_checkbox ??
    field?.value_checkbox_string;

  if (checkboxValue !== undefined && checkboxValue !== null) return true;

  return false;
};

const parseCheckboxFromField = (field: any): boolean => {
  if (!field) return false;

  const directCheckbox = field?.valueCheckbox ?? field?.value_checkbox;
  if (directCheckbox !== undefined && directCheckbox !== null) {
    return parseCheckbox(directCheckbox);
  }

  const raw = getFieldRawValue(field).toLowerCase();
  if (!raw) return false;

  if (
    [
      "true",
      "1",
      "yes",
      "y",
      "checked",
      "done",
      "selesai",
      "sudah",
      "on",
      "aktif",
    ].includes(raw)
  ) {
    return true;
  }

  return false;
};

const ModalPackingPOScan: React.FC<ModalPackingPOScanProps> = ({
  open,
  onClose,
  workspaceId,
  boardId,
  listId,
  onOpenScanProgress,
}) => {
  const [form] = Form.useForm();
  const [cardId, setCardId] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const scannerInputRef = useRef<string>("");
  const scannerBufferRef = useRef<string>("");
  const scannerTimeoutRef = useRef<NodeJS.Timeout>();

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      form.resetFields();
      setCardId("");
      setIsProcessing(false);
      setShowProgress(false);
      setProgress(0);
      setIsComplete(false);
      setShowCameraScanner(false);
      scannerInputRef.current = "";
      scannerBufferRef.current = "";
    }
  }, [open, form]);

  // Handle external scanner input (barcode scanner that acts like keyboard)
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!open) return;

      // Clear timeout if it exists
      if (scannerTimeoutRef.current) {
        clearTimeout(scannerTimeoutRef.current);
      }

      // If Enter key is pressed, process the scanned data
      if (event.key === "Enter") {
        event.preventDefault();
        if (scannerBufferRef.current.trim()) {
          handleScan(scannerBufferRef.current.trim());
          scannerBufferRef.current = "";
        }
        return;
      }

      // Add character to buffer
      scannerBufferRef.current += event.key;

      // Set timeout to clear buffer (scanner typically sends data quickly)
      scannerTimeoutRef.current = setTimeout(() => {
        scannerBufferRef.current = "";
      }, 100);
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

  // Handle card ID input change
  const handleCardIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCardId(value);
    form.setFieldsValue({ cardId: value });
  };

  // Process card scanning by directly opening the standalone Scan Progress modal
  const processCardScan = async (targetCardId: string) => {
    if (!targetCardId.trim()) {
      message.error("Please enter a valid card ID");
      return;
    }

    setIsProcessing(true);

    try {
      console.log("🔍 [DEBUG] Processing card scan for:", targetCardId);
      console.log("🔍 [DEBUG] Using listId:", listId);
      console.log("🔍 [DEBUG] Using boardId:", boardId);

      // Gate packing scan by custom field hierarchy:
      // base: Jenis Cetak, then dependent checkbox fields.
      let customFields: any[] = [];
      try {
        const customFieldRes = await cardCustomFields(
          targetCardId.trim(),
          workspaceId
        );
        customFields = Array.isArray(customFieldRes?.data)
          ? customFieldRes.data
          : [];
      } catch (error) {
        console.warn(
          "[PACKING_GATE] Failed to fetch card custom fields, fallback to cardDetails:",
          error
        );
        const cardRes = await cardDetails(targetCardId.trim(), boardId);
        const targetCard = cardRes?.data;
        customFields = Array.isArray(targetCard?.customFields)
          ? targetCard.customFields
          : [];
      }
      console.log("[PACKING_GATE] card id:", targetCardId);
      console.log("[PACKING_GATE] total custom fields:", customFields.length);
      console.log(
        "[PACKING_GATE] custom fields snapshot:",
        customFields.map((f: any) => ({
          id: f?.id,
          name: f?.name,
          valueString: f?.valueString ?? f?.value_string,
          valueOption: f?.valueOption ?? f?.value_option,
          valueCheckbox: f?.valueCheckbox ?? f?.value_checkbox,
          options: Array.isArray(f?.options)
            ? f.options.map((o: any) => ({
                id: o?.id ?? o?.value,
                label: o?.label,
                value: o?.value,
              }))
            : [],
        }))
      );

      const findFields = (matcher: (name: string) => boolean) =>
        customFields.filter((field: any) => matcher(normalizeText(field?.name)));

      const pickBestField = (fields: any[]) => {
        if (!fields.length) return undefined;
        return fields.find((field) => hasFieldValue(field)) || fields[0];
      };

      const jenisCetakField = pickBestField(
        findFields((name) => name.includes("jenis cetak"))
      );
      const bordirField = pickBestField(findFields((name) => name === "bordir"));
      const sablonDtfField = pickBestField(
        findFields((name) => name.includes("sablon") && name.includes("dtf"))
      );

      const rawJenisCetak = getFieldRawValue(jenisCetakField);
      const resolvedByOptions = Array.isArray(jenisCetakField?.options)
        ? jenisCetakField.options.find(
            (opt: any) =>
              String(opt?.id ?? opt?.value ?? "").trim() === rawJenisCetak
          )?.label
        : undefined;

      const resolvedJenisCetak =
        resolvedByOptions ||
        LookupCache.any(String(rawJenisCetak || "")) ||
        String(rawJenisCetak || "");
      const jenisCetak = normalizeText(resolvedJenisCetak);

      const isBordirChecked = parseCheckboxFromField(bordirField);
      const isSablonDtfChecked = parseCheckboxFromField(sablonDtfField);
      console.log("[PACKING_GATE] matched fields:", {
        jenisCetakField: jenisCetakField
          ? {
              id: jenisCetakField?.id,
              name: jenisCetakField?.name,
              rawJenisCetak,
              resolvedByOptions,
              resolvedJenisCetak,
              normalizedJenisCetak: jenisCetak,
            }
          : null,
        bordirField: bordirField
          ? {
              id: bordirField?.id,
              name: bordirField?.name,
              checked:
                bordirField?.valueCheckbox ?? bordirField?.value_checkbox,
              parsedChecked: isBordirChecked,
            }
          : null,
        sablonDtfField: sablonDtfField
          ? {
              id: sablonDtfField?.id,
              name: sablonDtfField?.name,
              checked:
                sablonDtfField?.valueCheckbox ??
                sablonDtfField?.value_checkbox,
              parsedChecked: isSablonDtfChecked,
            }
          : null,
      });

      const missingFields: string[] = [];

      // Base dependency first
      if (!jenisCetak) {
        missingFields.push("Jenis Cetak");
      } else {
        const isPolosan = jenisCetak.includes("polosan");
        const needsBordir = !isPolosan && jenisCetak.includes("bordir");
        const needsSablonDtf =
          !isPolosan &&
          (jenisCetak.includes("dtf") ||
            jenisCetak.includes("plastisol") ||
            jenisCetak.includes("rubber") ||
            jenisCetak.includes("sablon"));

        if (needsBordir && !isBordirChecked) {
          missingFields.push("Bordir");
        }
        if (needsSablonDtf && !isSablonDtfChecked) {
          missingFields.push("Sablon / DTF");
        }
        console.log("[PACKING_GATE] rule decision:", {
          jenisCetak,
          isPolosan,
          needsBordir,
          needsSablonDtf,
          isBordirChecked,
          isSablonDtfChecked,
        });
      }

      console.log("[PACKING_GATE] missing fields:", missingFields);
      if (missingFields.length > 0) {
        message.error(
          `Tidak bisa scan packing. Lengkapi field: ${missingFields.join(", ")}.`
        );
        return;
      }

      if (onOpenScanProgress) {
        onOpenScanProgress(targetCardId);
        message.success("Opening Scan Progress...");
      } else {
        message.warning("Scan Progress handler not provided");
      }

      // Close the packing modal
      onClose();
    } catch (error) {
      console.error("Error processing card scan:", error);
      message.error("Failed to process card scan");
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
            console.error("Error fetching card by short ID:", error);
          }
        }
      }

      // Check for cardId parameter in URL
      const cardId = url.searchParams.get("cardId");
      if (cardId) {
        return cardId;
      }
    } catch (error) {
      // Not a valid URL, continue with other checks
    }

    // Check if it's a direct UUID (card ID)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(trimmedData)) {
      return trimmedData;
    }

    // Try URL shortener extraction
    const extractedFromShortener =
      URLShortener.extractCardIdFromUrl(trimmedData);
    if (extractedFromShortener) {
      return extractedFromShortener;
    }

    return null;
  };

  const handleScan = async (scannedData: string) => {
    const extractedCardId = await extractCardIdFromScan(scannedData);

    if (extractedCardId) {
      setCardId(extractedCardId);
      form.setFieldsValue({ cardId: extractedCardId });
      message.success(`Card ID scanned: ${extractedCardId}`);

      // Automatically process the scanned card
      await processCardScan(extractedCardId);
    } else {
      message.error("Could not extract card ID from scanned data");
    }
  };

  const handleCameraScan = async (result: string) => {
    setShowCameraScanner(false);
    await handleScan(result);
  };

  const handleProcessCard = async () => {
    await processCardScan(cardId);
  };

  const handleCancel = () => {
    form.resetFields();
    setCardId("");
    setIsProcessing(false);
    setShowProgress(false);
    setProgress(0);
    setIsComplete(false);
    onClose();
  };

  return (
    <>
      <Modal
        title={
          <div className="flex items-center gap-2">
            <Package size={20} className="text-blue-600" />
            <ShoppingCart size={16} className="text-blue-600" />
            <Title level={4} className="mb-0">
              Scan PO Card for Packing
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
          {showProgress ? (
            <div className="text-center py-8">
              <div className="mb-6">
                <Package size={48} className="text-blue-600 mx-auto mb-4" />
                <Title level={3} className="mb-2">
                  Processing Packing Scan
                </Title>
                <Text type="secondary">Card ID: {cardId}</Text>
              </div>

              <div className="mb-6">
                <Progress
                  percent={progress}
                  status={isComplete ? "success" : "active"}
                  strokeColor={isComplete ? "#52c41a" : "#1890ff"}
                />
              </div>

              {isComplete && (
                <div className="flex items-center justify-center gap-2 text-green-600">
                  <CheckCircle size={20} />
                  <Text strong className="text-green-600">
                    Packing scan completed successfully!
                  </Text>
                </div>
              )}
            </div>
          ) : (
            <Form form={form} layout="vertical" onFinish={handleProcessCard}>
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
                  <Text strong className="text-blue-700">
                    Packing Scan
                  </Text>
                </div>
                <Text type="secondary" className="text-sm">
                  Scan or enter a card ID to process it for packing operations.
                  This will update the packing status without validation.
                </Text>
              </div>

              <Form.Item className="mb-0">
                <Space className="w-full justify-end">
                  <Button onClick={handleCancel} disabled={isProcessing}>
                    Cancel
                  </Button>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={isProcessing}
                    disabled={!cardId.trim()}
                    icon={<Search size={16} />}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isProcessing ? "Processing..." : "Process Scan"}
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          )}
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
                <div className="relative w-full h-[260px]">
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

export default ModalPackingPOScan;
