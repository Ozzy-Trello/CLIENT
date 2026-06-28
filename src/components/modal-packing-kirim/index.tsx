import React, { useEffect, useRef, useState } from "react";
import { Alert, Button, Modal, Space, Steps, Typography, message } from "antd";
import { Camera, CheckCircle, Package } from "lucide-react";
import { Scanner } from "@yudiel/react-qr-scanner";
import QRGuideOverlay from "@components/qr-overlay";
import InlineImageFrame from "./inline-image-frame";
import InlinePdfFrame from "./inline-pdf-frame";
import { cardDetails, getCardByShortId } from "@api/card";
import { getCardAttachments, createCardAttachment } from "@api/card_attachment";
import { uploadFile } from "@api/file";
import { validatePackingKirim } from "@api/packing-kirim";
import URLShortener from "@utils/url-shortener";
import { buildFileProxyUrl } from "@utils/file-url";
import {
  Card,
  CardAttachment,
  EnumAttachmentType,
  EnumCardAttachmentType,
} from "@myTypes/card";

interface ModalPackingKirimProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  boardId: string;
}

const { Text, Title } = Typography;

type POPreviewKind = "pdf" | "image";

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const sanitizeQueryParamId = (value: string | null | undefined): string => {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return "";
  return trimmed.split("?")[0]?.split("&")[0]?.trim() || "";
};

const sanitizeFileNamePart = (value: string): string =>
  value
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const getFileExtension = (fileName: string): string => {
  const index = fileName.lastIndexOf(".");
  return index >= 0 ? fileName.slice(index) : "";
};

const decodeStoredFileUrl = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const NO_FAKTUR_CUSTOM_FIELD_ID = "6c7f05f1-85bc-42f3-98b2-6a6509cc539c";

const isUrlLikeScan = (value: string): boolean => {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return (
    /^https?:\/\//i.test(trimmed) ||
    trimmed.startsWith("/") ||
    trimmed.includes("cardId=") ||
    uuidRegex.test(trimmed)
  );
};

const normalizeFaktur = (value: string): string => value.trim().toLowerCase();

const getNoFakturFromCard = (card: Card): string => {
  const normalizeId = (field: any) =>
    String(field?.id ?? field?.customFieldId ?? field?.custom_field_id ?? "").trim();

  const getValue = (field: any) => {
    const raw =
      field?.valueString ??
      field?.value_string ??
      field?.valueOption ??
      field?.value_option ??
      field?.valueNumber ??
      field?.value_number ??
      "";
    return raw === null || raw === undefined ? "" : String(raw).trim();
  };

  const fields = Array.isArray(card.customFields) ? card.customFields : [];
  const byId = fields.find(
    (field: any) => normalizeId(field) === NO_FAKTUR_CUSTOM_FIELD_ID,
  );
  const byName = fields.find(
    (field: any) =>
      String(field?.name || "")
        .trim()
        .toLowerCase() === "no faktur",
  );

  const valueById = byId ? getValue(byId) : "";
  if (valueById) return valueById;

  const valueByName = byName ? getValue(byName) : "";
  if (valueByName) return valueByName;

  return String((card as any)?.noFaktur || "").trim();
};

const ModalPackingKirim: React.FC<ModalPackingKirimProps> = ({
  open,
  onClose,
  boardId,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [primaryCard, setPrimaryCard] = useState<Card | null>(null);
  const [poAttachment, setPOAttachment] = useState<CardAttachment | null>(null);
  const [poPreviewKind, setPOPreviewKind] = useState<POPreviewKind | null>(null);
  const [secondCardId, setSecondCardId] = useState("");
  const [isResolving, setIsResolving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [photoCameraActive, setPhotoCameraActive] = useState(false);
  const [photoCameraLoading, setPhotoCameraLoading] = useState(false);
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);
  const photoVideoRef = useRef<HTMLVideoElement>(null);
  const photoCanvasRef = useRef<HTMLCanvasElement>(null);
  const photoStreamRef = useRef<MediaStream | null>(null);
  const scannerBufferRef = useRef("");
  const scannerTimeoutRef = useRef<NodeJS.Timeout>();
  const scanLockRef = useRef(false);
  const currentStepRef = useRef(0);

  useEffect(() => {
    currentStepRef.current = currentStep;
  }, [currentStep]);

  const resetState = () => {
    setCurrentStep(0);
    setPrimaryCard(null);
    setPOAttachment(null);
    setPOPreviewKind(null);
    setSecondCardId("");
    setIsResolving(false);
    setIsValidating(false);
    setIsUploading(false);
    setSelectedFile(null);
    stopPhotoCamera();
    setUploadedFileName("");
    scannerBufferRef.current = "";
    scanLockRef.current = false;
  };

  useEffect(() => {
    if (open) resetState();
  }, [open]);

  useEffect(() => {
    if (currentStep !== 3) stopPhotoCamera();
  }, [currentStep]);

  useEffect(() => () => stopPhotoCamera(), []);

  const extractCardIdFromScan = async (scannedData: string): Promise<string | null> => {
    const trimmedData = scannedData.trim();
    if (!trimmedData) return null;

    try {
      const url = new URL(
        trimmedData.startsWith("http")
          ? trimmedData
          : `https://example.com${trimmedData}`,
      );
      const pathParts = url.pathname.split("/");

      if (pathParts.length >= 3 && pathParts[1] === "qr") {
        const shortValue = pathParts[2];
        const shortId = parseInt(shortValue);
        if (!Number.isNaN(shortId)) {
          const response = await getCardByShortId(shortId);
          if (response.data) return response.data.id;
        }
      }

      const cardId = sanitizeQueryParamId(url.searchParams.get("cardId"));
      if (cardId) return cardId;
    } catch {
      // Continue to direct UUID and stateless QR parsing.
    }

    if (uuidRegex.test(trimmedData)) return trimmedData;

    const extractedFromShortener = URLShortener.extractCardIdFromUrl(trimmedData);
    if (extractedFromShortener) return extractedFromShortener;

    return null;
  };

  const handleFirstScan = async (scannedData: string) => {
    setIsResolving(true);
    try {
      const cardId = await extractCardIdFromScan(scannedData);
      if (!cardId) {
        message.error("Could not extract card ID from scanned QR");
        return;
      }

      const response = await cardDetails(cardId, boardId);
      if (!response.data) {
        message.error("Card not found");
        return;
      }

      const listName = (response.data.listName || response.data.list_name || "")
        .trim()
        .toLowerCase();
      const isAllowedList = listName.includes("request packing");

      if (!isAllowedList) {
        message.error("Card belum di request packing");
        return;
      }

      const attachmentsResponse = await getCardAttachments(cardId);
      const poAttachments = (attachmentsResponse.data || []).filter(
        (attachment) => attachment.type === EnumCardAttachmentType.PO,
      );

      const newestAttachmentByName = (keyword: string) =>
        poAttachments
          .filter((attachment) => {
            const name = attachment.file?.name || attachment.name || "";
            return name.toLowerCase().includes(keyword);
          })
          .sort((a, b) => {
            const aTime = new Date(a.createdAt || 0).getTime();
            const bTime = new Date(b.createdAt || 0).getTime();
            return bTime - aTime;
          })[0];

      const newestStampPOAttachment = newestAttachmentByName("stamp");
      const newestFakturPOAttachment = newestAttachmentByName("faktur");
      const selectedPOAttachment =
        newestStampPOAttachment || newestFakturPOAttachment || null;
      const selectedPOPreviewKind: POPreviewKind | null = newestStampPOAttachment
        ? "pdf"
        : newestFakturPOAttachment
          ? "image"
          : null;

      if (!selectedPOAttachment) {
        message.error("No PO stamp or FAKTUR attachment found for this card");
        return;
      }

      setPrimaryCard(response.data);
      setPOAttachment(selectedPOAttachment);
      setPOPreviewKind(selectedPOPreviewKind);
      setCurrentStep(1);
      message.success("Card scanned");
    } catch {
      message.error("Failed to load scanned card");
    } finally {
      setIsResolving(false);
    }
  };

  const handleSecondScan = async (scannedData: string) => {
    console.log("[PK] handleSecondScan raw:", scannedData);
    if (!primaryCard) {
      console.log("[PK] handleSecondScan aborted: no primaryCard");
      return;
    }

    setIsValidating(true);
    try {
      const rawScan = scannedData.trim();
      if (!rawScan) {
        message.error("Could not read scanned QR");
        return;
      }

      if (isUrlLikeScan(rawScan)) {
        const scannedCardId = await extractCardIdFromScan(rawScan);
        console.log("[PK] handleSecondScan extracted:", {
          primaryCardId: primaryCard.id,
          scannedCardId,
        });
        if (!scannedCardId) {
          message.error("Could not extract card ID from scanned QR");
          return;
        }

        setSecondCardId(scannedCardId);
        const validation = await validatePackingKirim(
          primaryCard.id,
          scannedCardId,
        );
        console.log("[PK] validate success:", validation);
        setCurrentStep(3);
        message.success("QR matches");
        return;
      }

      const noFaktur = getNoFakturFromCard(primaryCard);
      if (!noFaktur) {
        message.error("No Faktur belum terisi di card");
        return;
      }

      if (normalizeFaktur(rawScan) !== normalizeFaktur(noFaktur)) {
        message.error("No Faktur tidak sesuai");
        return;
      }

      setSecondCardId(rawScan);
      setCurrentStep(3);
      message.success("No Faktur matches");
    } catch (error: any) {
      console.log("[PK] validate error:", {
        status: error?.response?.status,
        data: error?.response?.data,
        message: error?.message,
      });
      const errorMessage =
        error?.response?.data?.message || "Scanned card does not match";
      message.error(errorMessage);
    } finally {
      setIsValidating(false);
    }
  };

  const handleScan = async (scannedData: string) => {
    const liveStep = currentStepRef.current;
    console.log("[PK] handleScan:", {
      scannedData,
      liveStep,
      locked: scanLockRef.current,
    });
    if (scanLockRef.current) return;

    if (liveStep !== 0 && liveStep !== 2) {
      console.log("[PK] handleScan ignored, not a scan step");
      return;
    }

    scanLockRef.current = true;
    try {
      if (liveStep === 0) {
        await handleFirstScan(scannedData);
        return;
      }
      if (liveStep === 2) {
        await handleSecondScan(scannedData);
      }
    } finally {
      scanLockRef.current = false;
    }
  };

  useEffect(() => {
    const handleScannerInput = (event: KeyboardEvent) => {
      if (!open) return;
      const liveStep = currentStepRef.current;
      if (liveStep !== 0 && liveStep !== 2) return;

      if (scannerTimeoutRef.current) clearTimeout(scannerTimeoutRef.current);

      if (event.key === "Enter") {
        event.preventDefault();
        const value = scannerBufferRef.current.trim();
        scannerBufferRef.current = "";
        if (value) handleScan(value);
        return;
      }

      if (event.key.length === 1) scannerBufferRef.current += event.key;

      scannerTimeoutRef.current = setTimeout(() => {
        scannerBufferRef.current = "";
      }, 150);
    };

    document.addEventListener("keydown", handleScannerInput);
    return () => {
      document.removeEventListener("keydown", handleScannerInput);
      if (scannerTimeoutRef.current) clearTimeout(scannerTimeoutRef.current);
    };
  }, [open]);

  const buildUploadFileName = async (file: File): Promise<string> => {
    if (!primaryCard) return file.name;
    const safeCardName = sanitizeFileNamePart(primaryCard.name || "card");
    const prefix = `packing kirim_${safeCardName}_`;
    const attachments = await getCardAttachments(primaryCard.id);
    const existingCount = (attachments.data || []).filter((attachment) => {
      const name = attachment.file?.name || attachment.name || "";
      return name.toLowerCase().startsWith(prefix.toLowerCase());
    }).length;
    return `${prefix}${existingCount + 1}${getFileExtension(file.name)}`;
  };

  const handleUpload = async () => {
    if (!primaryCard || !selectedFile) {
      message.error("Please take a picture first");
      return;
    }

    setIsUploading(true);
    try {
      const fileName = await buildUploadFileName(selectedFile);
      const renamedFile = new File([selectedFile], fileName, {
        type: selectedFile.type,
        lastModified: selectedFile.lastModified,
      });
      const formData = new FormData();
      formData.append("file", renamedFile);
      formData.append("name", fileName);
      formData.append("prefix", "packing-kirim");
      formData.append("card_id", primaryCard.id);

      const uploadResponse = await uploadFile(formData);
      if (!uploadResponse.data?.id) throw new Error("Upload failed");

      await createCardAttachment({
        cardId: primaryCard.id,
        attachableType: EnumAttachmentType.File,
        attachableId: uploadResponse.data.id,
        isCover: false,
        type: EnumCardAttachmentType.Attachment,
      });

      setUploadedFileName(fileName);
      setCurrentStep(4);
      message.success("Packing Kirim uploaded");
    } catch {
      message.error("Failed to upload Packing Kirim file");
    } finally {
      setIsUploading(false);
    }
  };

  function stopPhotoCamera() {
    photoStreamRef.current?.getTracks().forEach((track) => track.stop());
    photoStreamRef.current = null;
    if (photoVideoRef.current) photoVideoRef.current.srcObject = null;
    setPhotoCameraActive(false);
    setPhotoCameraLoading(false);
  }

  const isMobileDevice = () =>
    typeof navigator !== "undefined" &&
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const handleNativeCameraCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) setSelectedFile(file);
    event.target.value = "";
  };

  const openPhotoCamera = async () => {
    setSelectedFile(null);

    if (isMobileDevice()) {
      nativeCameraInputRef.current?.click();
      return;
    }

    const mediaDevices = navigator.mediaDevices;
    if (!mediaDevices?.getUserMedia) {
      message.error("Camera is not available on this device");
      return;
    }

    setPhotoCameraLoading(true);
    try {
      const stream = await mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      photoStreamRef.current = stream;
      setPhotoCameraActive(true);
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      if (photoVideoRef.current) {
        photoVideoRef.current.srcObject = stream;
        await photoVideoRef.current.play();
      }
    } catch {
      message.error("Failed to open camera");
      stopPhotoCamera();
    } finally {
      setPhotoCameraLoading(false);
    }
  };

  const capturePhoto = async () => {
    const video = photoVideoRef.current;
    const canvas = photoCanvasRef.current;
    if (!video || !canvas) return;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")?.drawImage(video, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92),
    );
    if (!blob) {
      message.error("Failed to capture picture");
      return;
    }

    setSelectedFile(
      new File([blob], `packing-kirim-${Date.now()}.jpg`, {
        type: "image/jpeg",
        lastModified: Date.now(),
      }),
    );
    stopPhotoCamera();
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const renderScanBox = (title: string, description: string) => (
    <Space direction="vertical" size="middle" className="w-full">
      <Alert message={title} description={description} type="info" showIcon />
      <div className="relative h-[320px] w-full overflow-hidden rounded-lg bg-black/10">
        <Scanner
          onScan={(result) => {
            if (result?.length) handleScan(result[0].rawValue);
          }}
          onError={() => message.error("Camera scanning failed")}
          constraints={{ facingMode: "environment" }}
          styles={{
            container: { width: "100%", height: "100%" },
            video: { width: "100%", height: "100%" },
          }}
        />
        <QRGuideOverlay imageClassName="h-24 w-auto max-w-[140px] opacity-70" />
      </div>
      <div className="rounded-lg border border-green-200 bg-green-50 p-3">
        <Text className="text-green-700">
          {isResolving || isValidating
            ? "Processing scan..."
            : "Camera ready. External scanner also works."}
        </Text>
      </div>
    </Space>
  );

  const poAttachmentRawUrl = poAttachment?.file?.url || "";
  const poAttachmentDirectUrl = decodeStoredFileUrl(poAttachmentRawUrl);
  const poAttachmentPreviewUrl = poAttachmentDirectUrl
    ? buildFileProxyUrl(poAttachmentDirectUrl)
    : "";
  const poAttachmentName = poAttachment?.file?.name || poAttachment?.name || "";
  const showInlinePdfPreview = Boolean(
    poAttachmentPreviewUrl && poPreviewKind === "pdf",
  );
  const showInlineImagePreview = Boolean(
    poAttachmentPreviewUrl && poPreviewKind === "image",
  );

  if (poAttachment) {
    console.log("[PK] PO preview attachment:", {
      name: poAttachmentName,
      mimeType: poAttachment?.file?.mimeType,
      rawUrl: poAttachmentRawUrl,
      directUrl: poAttachmentDirectUrl,
      previewUrl: poAttachmentPreviewUrl,
      previewKind: poPreviewKind,
    });
  }

  return (
    <>
      <Modal
        title={
          <div className="flex items-center gap-2">
            <Package size={20} className="text-blue-600" />
            <Title level={4} className="mb-0">
              Packing Kirim
            </Title>
          </div>
        }
        open={open}
        onCancel={handleClose}
        footer={null}
        width={showInlinePdfPreview ? 920 : 560}
        destroyOnHidden
      >
        <Space direction="vertical" size="large" className="w-full p-2 sm:p-4">
          <Steps
            size="small"
            current={currentStep}
            items={[
              { title: "Scan Card" },
              { title: "Confirm" },
              { title: "Scan QR" },
              { title: "Upload" },
              { title: "Done" },
            ]}
          />

          {currentStep === 0 &&
            renderScanBox(
              "Scan QR alamat",
              "Scan the first QR.",
            )}

          {currentStep === 1 && primaryCard && poAttachment && (
            <Space direction="vertical" size="middle" className="w-full">
              {showInlinePdfPreview && (
                <InlinePdfFrame url={poAttachmentPreviewUrl} />
              )}
              {showInlineImagePreview && (
                <InlineImageFrame url={poAttachmentPreviewUrl} />
              )}
              <Space className="w-full justify-end">
                <Button onClick={() => setCurrentStep(0)}>Rescan</Button>
                <Button type="primary" onClick={() => setCurrentStep(2)}>
                  Correct, Continue
                </Button>
              </Space>
            </Space>
          )}

          {currentStep === 2 &&
            renderScanBox(
              "Step 3: Scan QR inside the card",
              "This QR must resolve to the exact same card ID as the first scan.",
            )}

          {currentStep === 3 && primaryCard && (
            <Space direction="vertical" size="middle" className="w-full">
              <Alert
                type="success"
                showIcon
                message="QR matched"
                description={`Validated ${primaryCard.name}. Take a picture for Packing Kirim.`}
              />
              <input
                ref={nativeCameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleNativeCameraCapture}
              />
              <Space direction="vertical" size="small" className="w-full">
                <canvas ref={photoCanvasRef} className="hidden" />
                {photoCameraActive && (
                  <div className="overflow-hidden rounded-lg border border-slate-200 bg-black">
                    <video
                      ref={photoVideoRef}
                      className="h-[320px] w-full object-cover"
                      playsInline
                      muted
                    />
                  </div>
                )}
                <Space>
                  {photoCameraActive ? (
                    <>
                      <Button type="primary" icon={<Camera size={16} />} onClick={capturePhoto}>
                        Capture
                      </Button>
                      <Button onClick={stopPhotoCamera}>Cancel</Button>
                    </>
                  ) : (
                    <Button
                      icon={<Camera size={16} />}
                      loading={photoCameraLoading}
                      onClick={openPhotoCamera}
                    >
                      Take Picture
                    </Button>
                  )}
                  {selectedFile && (
                    <Button onClick={() => setSelectedFile(null)}>Remove</Button>
                  )}
                </Space>
                {selectedFile && <Text>{selectedFile.name}</Text>}
              </Space>
              <Space className="w-full justify-end">
                <Button onClick={() => setCurrentStep(2)}>Rescan QR</Button>
                <Button
                  type="primary"
                  loading={isUploading}
                  disabled={!selectedFile}
                  onClick={handleUpload}
                >
                  Upload
                </Button>
              </Space>
            </Space>
          )}

          {currentStep === 4 && (
            <Space direction="vertical" size="middle" className="w-full text-center">
              <CheckCircle size={48} className="mx-auto text-green-600" />
              <Title level={4}>Packing Kirim uploaded successfully</Title>
              <Text>{uploadedFileName}</Text>
              <Button type="primary" onClick={handleClose}>Done</Button>
            </Space>
          )}

          {secondCardId && currentStep !== 4 && (
            <Text type="secondary">Second scan: {secondCardId}</Text>
          )}
        </Space>
      </Modal>
    </>
  );
};

export default ModalPackingKirim;
