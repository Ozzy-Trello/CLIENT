import { uploadFile } from "@api/file";
import { useCardAttachment } from "@hooks/card_attachment";
import {
  useCardShipment,
  useEkspedisiCourierMappings,
} from "@hooks/card_shipment";
import {
  CardAttachment,
  CardCustomField,
  EnumAttachmentType,
  EnumCardAttachmentType,
} from "@myTypes/card";
import { CustomField, CustomOption } from "@myTypes/custom-field";
import { useBoardPermissionsContext } from "@providers/board-permissions-context";
import { toDirectFileUrl } from "@utils/file-url";
import { Button, Input, Modal, Select, Spin, Typography, message } from "antd";
import type { InputRef } from "antd";
import { Camera, FileImage, RefreshCw, Trash2, Upload } from "lucide-react";
import { Scanner } from "@yudiel/react-qr-scanner";
import QRGuideOverlay from "@components/qr-overlay";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatFileSize, formatFileSizeInMB } from "./attachment-helpers";

interface ShipmentProps {
  open: boolean;
  onClose: () => void;
  cardId: string;
  workspaceId: string;
  cardCustomFields?: CardCustomField[];
  customFields?: CustomField[];
}

const MAX_RECEIPT_SIZE = 10 * 1024 * 1024;

const WAITING_FOR_RESI_LIST = "menunggu resi";

export const RESI_BLOCKED_MESSAGE =
  "Card belum ada di list Menunggu Resi";

const OZZY_XPRESS_LABEL = "ozzy xpress";

/**
 * Kurir internal tidak menerbitkan resi, jadi nomornya dibuatkan server.
 */
export const isOzzyXpressOption = (
  options: CustomOption[],
  value: string,
): boolean =>
  options.find((option) => option.value === value)?.label.trim().toLowerCase() ===
  OZZY_XPRESS_LABEL;

/**
 * Resi baru bisa diinput setelah kartu sampai di list "Menunggu Resi".
 */
export const canInputResi = (
  lists: Array<{ id: string; name?: string }>,
  listId?: string,
): boolean => {
  if (!listId) return false;
  const name = lists.find((list) => list.id === listId)?.name;
  return name?.trim().toLowerCase() === WAITING_FOR_RESI_LIST;
};

const normalizeOptions = (options: unknown): CustomOption[] => {
  let parsed = options;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((option) => ({
      value: String(option?.value ?? "").trim(),
      label: String(option?.label ?? option?.value ?? "").trim(),
    }))
    .filter((option) => option.value && option.label);
};

const Shipment: React.FC<ShipmentProps> = ({
  open,
  onClose,
  cardId,
  workspaceId,
  cardCustomFields,
  customFields,
}) => {
  const { canUpdateCard, canManageCardCustomFields } = useBoardPermissionsContext();
  const {
    shipment,
    isLoading: isLoadingShipment,
    saveShipment,
    deleteShipment,
    generateWaybill,
    isSaving,
    isDeleting,
    isGenerating,
  } = useCardShipment(cardId, workspaceId, { enabled: open });
  const {
    cardAttachments,
    isLoading: isLoadingAttachments,
    addAttachmentAsync,
    deleteAttachmentAsync,
    isAddingAttachment,
    isDeletingAttachment,
  } = useCardAttachment(cardId, { fetch: open });
  const {
    mappings,
    isLoading: isLoadingMappings,
    isUnavailable: isMappingUnavailable,
  } = useEkspedisiCourierMappings({ enabled: open });
  const [ekspedisi, setEkspedisi] = useState("");
  const [waybill, setWaybill] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [hideExistingReceipt, setHideExistingReceipt] = useState(false);
  const [localPreviewUrl, setLocalPreviewUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingReceipt, setIsDeletingReceipt] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const waybillInputRef = useRef<InputRef>(null);
  const initializedCardRef = useRef<string>();
  const isFormDirtyRef = useRef(false);
  const generateRequestedRef = useRef(false);
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const scanProcessedRef = useRef(false);

  const { ekspedisiField, options, ekspedisiFieldValue } = useMemo(() => {
    const cardField = cardCustomFields?.find(
      (field) => field.name?.trim().toLowerCase() === "ekspedisi",
    );
    const workspaceField = customFields?.find(
      (field) => field.name?.trim().toLowerCase() === "ekspedisi",
    );
    const cardOptions = normalizeOptions(cardField?.options);

    return {
      ekspedisiField: cardField ?? workspaceField,
      options:
        cardOptions.length > 0
          ? cardOptions
          : normalizeOptions(workspaceField?.options),
      ekspedisiFieldValue: cardField?.valueOption?.trim() ?? "",
    };
  }, [cardCustomFields, customFields]);

  const receiptAttachments = useMemo(
    () =>
      (cardAttachments as CardAttachment[]).filter(
        (attachment) => attachment.metadata?.category === "Resi",
      ),
    [cardAttachments],
  );
  const existingReceipt = hideExistingReceipt
    ? undefined
    : receiptAttachments[0];
  const selectedMapping = useMemo(() => {
    const label = options.find((option) => option.value === ekspedisi)?.label;
    if (!label) return null;
    return mappings.find((mapping) => mapping.label === label) ?? null;
  }, [ekspedisi, mappings, options]);
  const canEdit = canUpdateCard() && canManageCardCustomFields();
  const isOzzyXpress = isOzzyXpressOption(options, ekspedisi);
  const isBusy =
    isSubmitting ||
    isDeletingReceipt ||
    isSaving ||
    isDeleting ||
    isGenerating ||
    isAddingAttachment ||
    isDeletingAttachment;
  const isLoading = isLoadingShipment || isLoadingAttachments;
  const hasValidCourier = options.some((option) => option.value === ekspedisi);
  const hasReceiptImage = !!selectedFile || !!existingReceipt;
  const saveDisabled =
    !canEdit ||
    isBusy ||
    isLoading ||
    !ekspedisiField ||
    options.length === 0 ||
    !hasValidCourier ||
    !waybill.trim() ||
    !hasReceiptImage;

  useEffect(() => {
    if (!open) {
      initializedCardRef.current = undefined;
      isFormDirtyRef.current = false;
      generateRequestedRef.current = false;
      setSelectedFile(null);
      setHideExistingReceipt(false);
      setShowCameraScanner(false);
      scanProcessedRef.current = false;
      return;
    }
    requestAnimationFrame(() => {
      waybillInputRef.current?.focus();
    });
    if (isLoadingShipment) return;

    const isSameCard = initializedCardRef.current === cardId;
    if (isSameCard && isFormDirtyRef.current) return;

    // Custom Field Ekspedisi menang: mengisinya di kartu harus langsung
    // terlihat di sini, termasuk saat shipment lama memakai ekspedisi lain.
    const knownOption = options.some(
      (option) => option.value === ekspedisiFieldValue,
    );
    setEkspedisi(
      (knownOption ? ekspedisiFieldValue : "") ||
        shipment?.ekspedisiOptionValue ||
        "",
    );
    setWaybill(shipment?.waybillId ?? "");
    initializedCardRef.current = cardId;
  }, [
    cardId,
    ekspedisiFieldValue,
    isLoadingShipment,
    open,
    options,
    shipment?.ekspedisiOptionValue,
    shipment?.id,
    shipment?.updatedAt,
    shipment?.waybillId,
  ]);

  // Nomor resi Ozzy Xpress dibuatkan server begitu ekspedisinya terpilih,
  // termasuk saat modal baru dibuka dan pilihannya sudah datang dari kartu.
  // Nomor yang sudah tersimpan dipertahankan supaya urutan harian tidak
  // terbakar percuma setiap kali modal dibuka ulang.
  useEffect(() => {
    if (!open || !canEdit || isLoadingShipment) return;
    if (!isOzzyXpress || waybill.trim() || generateRequestedRef.current) return;

    generateRequestedRef.current = true;
    generateWaybill(ekspedisi)
      .then((response) => {
        const generated = response?.data?.waybillId;
        if (!generated) throw new Error("Nomor resi tidak diterima dari server.");
        isFormDirtyRef.current = true;
        setWaybill(generated);
      })
      .catch((error: any) => {
        // Sengaja tidak mencoba ulang: penyebabnya (Cabang kosong) hanya bisa
        // diperbaiki orang, dan percobaan berulang akan membanjiri server.
        message.error(
          error?.response?.data?.message ||
            error?.message ||
            "Gagal membuat nomor resi Ozzy Xpress.",
        );
      });
  }, [
    canEdit,
    ekspedisi,
    generateWaybill,
    isLoadingShipment,
    isOzzyXpress,
    open,
    waybill,
  ]);

  useEffect(() => {
    if (!open || !canEdit) return;

    // The global card-level paste handler ignores anything inside this
    // modal (see .shipment-modal check in card-details/index.tsx), so the
    // receipt image has to be captured here instead.
    const handleWindowPaste = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTextField =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA";
      if (isTextField || isBusy) return;

      const file = event.clipboardData?.files?.[0];
      if (!file) return;

      event.preventDefault();
      selectReceiptFile(file);
    };

    window.addEventListener("paste", handleWindowPaste);
    return () => window.removeEventListener("paste", handleWindowPaste);
  }, [open, canEdit, isBusy]);

  useEffect(() => {
    if (
      !selectedFile ||
      typeof URL.createObjectURL !== "function"
    ) {
      setLocalPreviewUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setLocalPreviewUrl(objectUrl);
    return () => {
      URL.revokeObjectURL?.(objectUrl);
    };
  }, [selectedFile]);

  const clearSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const closeAndDiscard = () => {
    clearSelectedFile();
    setHideExistingReceipt(false);
    onClose();
  };

  const handleClose = () => {
    if (isBusy) return;
    closeAndDiscard();
  };

  const selectReceiptFile = (file?: File) => {
    if (!file) return;
    const isImage =
      file.type.startsWith("image/") || /\.(jpe?g|png)$/i.test(file.name);
    if (!isImage) {
      message.error("Gambar resi harus berupa file gambar.");
      return;
    }
    if (file.size > MAX_RECEIPT_SIZE) {
      message.error("Ukuran gambar resi maksimal 10 MB.");
      return;
    }

    isFormDirtyRef.current = true;
    setSelectedFile(file);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    selectReceiptFile(event.target.files?.[0]);
    event.target.value = "";
  };

  const handleDrop = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!canEdit || isBusy) return;
    selectReceiptFile(event.dataTransfer.files?.[0]);
  };

  const deleteReceiptAttachments = async () => {
    await Promise.all(
      receiptAttachments.map((attachment) =>
        deleteAttachmentAsync({
          attachmentId: attachment.id,
          cardId,
          attachableType: attachment.attachableType,
          attachableId: attachment.attachableId,
        }),
      ),
    );
  };

  const handleSave = async () => {
    const trimmedWaybill = waybill.trim();
    if (!canEdit) return;
    if (!ekspedisiField || options.length === 0) {
      message.warning("Custom Field Ekspedisi belum memiliki pilihan.");
      return;
    }
    if (!hasValidCourier || !trimmedWaybill || !hasReceiptImage) {
      message.warning("Nomor resi, ekspedisi, dan gambar resi wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (selectedFile) {
        const dotIndex = selectedFile.name.lastIndexOf(".");
        const extension =
          dotIndex >= 0
            ? selectedFile.name.slice(dotIndex + 1)
            : selectedFile.type.split("/")[1] || "jpg";
        const uploadResponse = await uploadFile(selectedFile, {
          cardId,
          name: `Resi - ${trimmedWaybill}.${extension}`,
        });
        const uploadedFile = uploadResponse?.data;
        if (!uploadedFile?.id) {
          throw new Error("Upload gambar resi tidak menghasilkan file.");
        }

        await addAttachmentAsync({
          cardId,
          attachableType: EnumAttachmentType.File,
          attachableId: uploadedFile.id,
          isCover: false,
          type: EnumCardAttachmentType.Attachment,
          metadata: { category: "Resi" },
        });
        await deleteReceiptAttachments();
      }

      // Attach the receipt while the card is still in "Menunggu Resi". Saving
      // the waybill can trigger automation that moves the card to another list.
      await saveShipment({
        waybillId: trimmedWaybill,
        ekspedisiOptionValue: ekspedisi,
      });

      message.success("Data resi berhasil disimpan.");
      closeAndDiscard();
    } catch (error: any) {
      message.error(
        error?.response?.data?.message ||
          error?.message ||
          "Gagal menyimpan data resi.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeletingReceipt(true);
    try {
      await deleteReceiptAttachments();
      await deleteShipment();
      setEkspedisi("");
      setWaybill("");
      message.success("Data resi dan gambar berhasil dihapus.");
      closeAndDiscard();
    } catch (error: any) {
      message.error(
        error?.response?.data?.message ||
          error?.message ||
          "Gagal menghapus data resi.",
      );
    } finally {
      setIsDeletingReceipt(false);
    }
  };

  const handleCameraScan = (scannedValue: string) => {
    if (scanProcessedRef.current) return;
    scanProcessedRef.current = true;
    setShowCameraScanner(false);

    const value = scannedValue.trim();
    if (!value) {
      message.error("Tidak dapat membaca nomor resi dari QR/barcode.");
      return;
    }
    isFormDirtyRef.current = true;
    setWaybill(value);
    message.success("Nomor resi berhasil discan.");
  };

  const confirmDelete = () => {
    Modal.confirm({
      title: "Hapus data resi?",
      content: "Nomor resi dan semua gambar resi akan dihapus.",
      okText: "Hapus",
      okType: "danger",
      cancelText: "Batal",
      centered: true,
      onOk: handleDelete,
    });
  };

  const displayedName = selectedFile?.name || existingReceipt?.file?.name || "Gambar resi";
  const displayedSize = selectedFile
    ? formatFileSize(selectedFile.size)
    : existingReceipt?.file?.size !== undefined
      ? formatFileSizeInMB(
          existingReceipt.file.size,
          existingReceipt.file.sizeUnit,
        )
      : "";
  const displayedPreview = selectedFile
    ? localPreviewUrl
    : toDirectFileUrl(existingReceipt?.file?.url);

  return (
    <>
    <Modal
      title="Input Resi"
      open={open}
      onCancel={handleClose}
      width={520}
      centered
      destroyOnClose
      closable={!isBusy}
      maskClosable={!isBusy}
      keyboard={!isBusy}
      wrapClassName="shipment-modal"
      styles={{ body: { padding: "4px" } }}
      footer={
        <div className="flex items-center justify-between gap-3">
          <div>
            {shipment && canEdit ? (
              <Button
                danger
                icon={<Trash2 size={14} />}
                onClick={confirmDelete}
                loading={isDeletingReceipt || isDeleting || isDeletingAttachment}
                disabled={isSubmitting || isSaving || isAddingAttachment}
              >
                Hapus
              </Button>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleClose} disabled={isBusy}>
              Batal
            </Button>
            <Button
              type="primary"
              onClick={handleSave}
              loading={isSubmitting || isSaving || isAddingAttachment}
              disabled={saveDisabled}
            >
              Simpan
            </Button>
          </div>
        </div>
      }
    >
      {isLoading ? (
        <div className="flex min-h-48 items-center justify-center">
          <Spin size="small" />
        </div>
      ) : (
        <div className="space-y-5 pt-1">
          <div>
            <label htmlFor="shipment-waybill" className="mb-1.5 block text-sm font-medium text-gray-700">
              No. Resi <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <Input
                id="shipment-waybill"
                ref={waybillInputRef}
                value={waybill}
                onChange={(event) => {
                  isFormDirtyRef.current = true;
                  setWaybill(event.target.value);
                }}
                placeholder={
                  isOzzyXpress
                    ? "Dibuat otomatis..."
                    : "Contoh: JNE1234567890"
                }
                disabled={!canEdit || isBusy}
                readOnly={isOzzyXpress}
                onPressEnter={handleSave}
              />
              {isOzzyXpress ? null : (
                <Button
                  icon={<Camera size={14} />}
                  onClick={() => setShowCameraScanner(true)}
                  disabled={!canEdit || isBusy}
                >
                  Scan QR
                </Button>
              )}
            </div>
            <div className="mt-1.5 text-xs leading-5 text-gray-500">
              {isGenerating
                ? "Membuat nomor resi Ozzy Xpress..."
                : isOzzyXpress
                  ? "Nomor resi Ozzy Xpress dibuat otomatis dan tidak bisa diubah."
                  : "Setelah disimpan, nomor resi ini akan tersinkron ke Custom Field Resi."}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Ekspedisi <span className="text-red-500">*</span>
            </label>
            <Select
              className="w-full"
              options={options}
              value={ekspedisi || undefined}
              onChange={(value) => {
                isFormDirtyRef.current = true;
                // Nomor OZX milik ekspedisi lamanya, jadi ikut dibuang saat
                // pindah kurir; kurir baru memakai nomor dari ekspedisi itu.
                if (isOzzyXpress && !isOzzyXpressOption(options, value)) {
                  setWaybill("");
                }
                generateRequestedRef.current = false;
                setEkspedisi(value);
              }}
              placeholder="Pilih ekspedisi"
              disabled={
                !canEdit || isBusy || !ekspedisiField || options.length === 0
              }
              showSearch
              optionFilterProp="label"
            />
            {!ekspedisiField || options.length === 0 ? (
              <div className="mt-1.5 text-xs text-amber-600">
                Custom Field Ekspedisi belum tersedia atau belum memiliki opsi.
              </div>
            ) : null}
            {hasValidCourier ? (
              <div className="mt-1.5 text-xs text-gray-500">
                Status mapping:{" "}
                {isLoadingMappings
                  ? "Memeriksa dukungan sistem Ozzy Clothing..."
                  : isMappingUnavailable
                    ? "Data ekspedisi Ozzy Clothing tidak dapat dimuat"
                    : selectedMapping
                      ? `${selectedMapping.courierCode} / ${selectedMapping.courierServiceCode}`
                      : "Ekspedisi ini tidak bisa dilacak by sistem Ozzy Clothing"}
              </div>
            ) : null}
          </div>

          <div>
            <div className="mb-1.5 text-sm font-medium text-gray-700">
              Upload Gambar Resi <span className="text-red-500">*</span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,image/*"
              aria-label="Pilih gambar resi"
              className="hidden"
              disabled={!canEdit || isBusy}
              onChange={handleFileChange}
            />

            {selectedFile || existingReceipt ? (
              <div
                className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-2.5"
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDrop}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white text-gray-400 ring-1 ring-gray-200">
                  {displayedPreview ? (
                    <img
                      src={displayedPreview}
                      alt={`Pratinjau ${displayedName}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <FileImage size={20} aria-hidden="true" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-gray-700" title={displayedName}>
                    {displayedName}
                  </div>
                  <div className="text-xs text-gray-500">
                    {displayedSize || (selectedFile ? "Siap diunggah" : "Gambar resi tersimpan")}
                  </div>
                </div>
                {canEdit ? (
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="text"
                      size="small"
                      icon={<RefreshCw size={14} />}
                      aria-label="Ganti gambar resi"
                      title="Ganti gambar"
                      disabled={isBusy}
                      onClick={() => fileInputRef.current?.click()}
                    />
                    {selectedFile ? (
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<Trash2 size={14} />}
                        aria-label="Hapus gambar resi terpilih"
                        title="Hapus gambar terpilih"
                        disabled={isBusy}
                        onClick={clearSelectedFile}
                      />
                    ) : (
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<Trash2 size={14} />}
                        aria-label="Hapus gambar resi"
                        title="Hapus gambar"
                        disabled={isBusy}
                        onClick={() => {
                          isFormDirtyRef.current = true;
                          setHideExistingReceipt(true);
                        }}
                      />
                    )}
                  </div>
                ) : null}
              </div>
            ) : (
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-4 text-sm text-gray-600 transition-colors hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canEdit || isBusy}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDrop}
              >
                <Upload size={16} aria-hidden="true" />
                Pilih atau letakkan gambar di sini
              </button>
            )}
            <div className="mt-1.5 text-xs text-gray-500">
              JPG, JPEG, atau PNG. Maksimal 10 MB.
            </div>
          </div>
        </div>
      )}
    </Modal>

    <Modal
      title="Scan QR/Barcode Resi"
      open={showCameraScanner}
      onCancel={() => {
        scanProcessedRef.current = false;
        setShowCameraScanner(false);
      }}
      afterClose={() => {
        scanProcessedRef.current = false;
      }}
      footer={[
        <Button
          key="cancel"
          onClick={() => {
            scanProcessedRef.current = false;
            setShowCameraScanner(false);
          }}
        >
          Batal
        </Button>,
      ]}
      width={400}
      centered
      zIndex={2000}
      styles={{ mask: { zIndex: 1999 } }}
    >
      <div className="flex flex-col items-center">
        <div className="w-full max-w-sm">
          <div className="relative h-[320px] w-full">
            <Scanner
              onScan={(result) => {
                if (result && result.length > 0) {
                  handleCameraScan(result[0].rawValue);
                }
              }}
              onError={(error) => {
                console.error("Scanner error:", error);
                message.error("Gagal membuka kamera. Coba lagi.");
              }}
              styles={{
                container: { width: "100%", height: "100%" },
                video: { width: "100%", height: "100%" },
              }}
            />
            <QRGuideOverlay imageClassName="h-24 w-auto max-w-[140px] opacity-70" />
          </div>
        </div>
        <Typography.Text type="secondary" className="mt-4 text-center">
          Posisikan QR/barcode resi di dalam kotak kamera
        </Typography.Text>
      </div>
    </Modal>
    </>
  );
};

export default Shipment;
