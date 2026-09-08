import { uploadFile } from "@api/file";
import { useCardAttachment } from "@hooks/card_attachment";
import { useCardShipment } from "@hooks/card_shipment";
import {
  CardAttachment,
  CardCustomField,
  EnumAttachmentType,
  EnumCardAttachmentType,
} from "@myTypes/card";
import { CustomField, CustomOption } from "@myTypes/custom-field";
import { useBoardPermissionsContext } from "@providers/board-permissions-context";
import { toDirectFileUrl } from "@utils/file-url";
import { Button, Input, Modal, Select, Spin, message } from "antd";
import { FileImage, RefreshCw, Trash2, Upload } from "lucide-react";
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
    isSaving,
    isDeleting,
  } = useCardShipment(cardId, workspaceId, { enabled: open });
  const {
    cardAttachments,
    isLoading: isLoadingAttachments,
    addAttachmentAsync,
    deleteAttachmentAsync,
    isAddingAttachment,
    isDeletingAttachment,
  } = useCardAttachment(cardId, { fetch: open });
  const [ekspedisi, setEkspedisi] = useState("");
  const [waybill, setWaybill] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [hideExistingReceipt, setHideExistingReceipt] = useState(false);
  const [localPreviewUrl, setLocalPreviewUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingReceipt, setIsDeletingReceipt] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const initializedCardRef = useRef<string>();
  const isFormDirtyRef = useRef(false);

  const { ekspedisiField, options } = useMemo(() => {
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
  const canEdit = canUpdateCard() && canManageCardCustomFields();
  const isBusy =
    isSubmitting ||
    isDeletingReceipt ||
    isSaving ||
    isDeleting ||
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
      setSelectedFile(null);
      setHideExistingReceipt(false);
      return;
    }
    if (isLoadingShipment) return;

    const isSameCard = initializedCardRef.current === cardId;
    if (isSameCard && isFormDirtyRef.current) return;

    setEkspedisi(shipment?.ekspedisi_option_value ?? "");
    setWaybill(shipment?.waybill_id ?? "");
    initializedCardRef.current = cardId;
  }, [
    cardId,
    isLoadingShipment,
    open,
    shipment?.ekspedisi_option_value,
    shipment?.id,
    shipment?.updated_at,
    shipment?.waybill_id,
  ]);

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
    let shipmentSaved = false;
    try {
      await saveShipment({
        waybill_id: trimmedWaybill,
        ekspedisi_option_value: ekspedisi,
      });
      shipmentSaved = true;

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

      message.success("Data resi berhasil disimpan.");
      closeAndDiscard();
    } catch (error: any) {
      message.error(
        error?.response?.data?.message ||
          error?.message ||
          (shipmentSaved
            ? "Nomor resi tersimpan, tetapi gambar resi gagal diperbarui."
            : "Gagal menyimpan data resi."),
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
            <Input
              id="shipment-waybill"
              value={waybill}
              onChange={(event) => {
                isFormDirtyRef.current = true;
                setWaybill(event.target.value);
              }}
              placeholder="Contoh: JNE1234567890"
              disabled={!canEdit || isBusy}
              onPressEnter={handleSave}
            />
            <div className="mt-1.5 text-xs leading-5 text-gray-500">
              Setelah disimpan, nomor resi ini akan tersinkron ke Custom Field Resi.
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
            {shipment ? (
              <div className="mt-1.5 text-xs text-gray-500">
                Status mapping: {shipment.courier_code || shipment.courier_service_code
                  ? [shipment.courier_code, shipment.courier_service_code]
                      .filter(Boolean)
                      .join(" / ")
                  : "Ekspedisi belum didukung Biteship"}
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
  );
};

export default Shipment;
