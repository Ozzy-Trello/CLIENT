"use client";

import { deleteCardAttachment } from "@api/card_attachment";
import AttachmentPreviewModal from "@components/attachment-preview-modal";
import {
  bulkUpsertSablonAttachments,
  getSablonAttachments,
  SablonAttachmentRow,
} from "@api/sablon_attachment";
import { setCardCustomFieldValue } from "@api/card_custom_field";
import { uploadFile } from "@api/file";
import { useAccountList } from "@hooks/account";
import { useCardAttachment } from "@hooks/card_attachment";
import { useCardCustomField } from "@hooks/card_custom_field";
import { useRoles } from "@hooks/useRoles";
import {
  Card,
  EnumAttachmentType,
  EnumCardAttachmentType,
} from "@myTypes/card";
import { isImageFile, isPDFFile } from "@utils/file";
import { useQueryClient } from "@tanstack/react-query";
import {
  Button,
  InputNumber,
  Modal,
  Progress,
  Select,
  Space,
  Table,
  Typography,
  message,
} from "antd";
import { ColumnsType } from "antd/es/table";
import JSZip from "jszip";
import { Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const { Text } = Typography;

interface ModalJmlSablonProps {
  open: boolean;
  onClose: () => void;
  card: Card;
  workspaceId: string;
  boardId: string;
}

interface RowState {
  amount: number | null;
  userId: string | null;
}

interface TableRow {
  key: string;
  attachmentId: string;
  fileName: string;
}

interface PreparedUploadTask {
  displayName: string;
  buildFile: () => Promise<File>;
}

const IMAGE_EXTENSIONS = /\.(jpe?g|png|webp)$/i;
const IMAGE_NAME_EXTENSION = /\.(jpe?g|png|gif|bmp|svg|webp)$/i;
const ZIP_EXTENSIONS = /\.zip$/i;

const getMimeTypeFromName = (fileName: string): string => {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
};

const isZipFile = (fileName: string, mimeType?: string): boolean => {
  if (!fileName && !mimeType) return false;
  if (mimeType === "application/zip" || mimeType === "application/x-zip-compressed") return true;
  return ZIP_EXTENSIONS.test(fileName);
};

const formatAttachmentName = (fileName: string, mimeType?: string): string => {
  if (!isImageFile(fileName, mimeType)) return fileName;
  const withoutExtension = fileName.replace(IMAGE_NAME_EXTENSION, "");
  return withoutExtension || fileName;
};

const isSupportedUploadFile = (file: { name: string; type?: string }): boolean => {
  const mimeType = file.type || "";
  return isZipFile(file.name, mimeType) || mimeType.startsWith("image/") || IMAGE_EXTENSIONS.test(file.name);
};

const ModalJmlSablon: React.FC<ModalJmlSablonProps> = ({ open, onClose, card, workspaceId, boardId }) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [rowsState, setRowsState] = useState<Record<string, RowState>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingRows, setIsLoadingRows] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [uploadTotal, setUploadTotal] = useState(0);
  const [uploadCompleted, setUploadCompleted] = useState(0);
  const [uploadCurrentName, setUploadCurrentName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [allDesignerUserId, setAllDesignerUserId] = useState<string | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewInitialIndex, setPreviewInitialIndex] = useState(0);

  const { addAttachment, cardAttachments, refetch } = useCardAttachment(card.id, { fetch: true });
  const { cardCustomFields } = useCardCustomField(card.id, workspaceId, { enabled: open });

  const { roles, loading: isLoadingRoles } = useRoles(workspaceId);
  const designerRoleIds = useMemo(() => {
    const allowedRoles = new Set(["desainer outlet", "spv desainer outlet"]);
    return (roles || [])
      .filter((role) => allowedRoles.has(String(role?.name || "").trim().toLowerCase()))
      .map((role) => role.id);
  }, [roles]);
  const { data: accountListData, isLoading: isLoadingAccountsQuery } = useAccountList({
    workspaceId,
    boardId,
    roleIds: designerRoleIds,
  });
  const isLoadingAccounts = isLoadingRoles || isLoadingAccountsQuery;

  const designerOptions = useMemo(
    () =>
      designerRoleIds.length === 0
        ? []
        : (accountListData?.data || []).map((account: any) => ({
            value: account.id as string,
            label: account.name || account.username || account.email || account.id,
          })),
    [accountListData?.data, designerRoleIds.length],
  );

  const sablonAttachments = useMemo(
    () =>
      (cardAttachments || []).filter(
        (att) =>
          att.attachableType === EnumAttachmentType.File &&
          att.type === EnumCardAttachmentType.Sablon,
      ),
    [cardAttachments],
  );

  const zipSablonAttachments = useMemo(
    () => sablonAttachments.filter((att) => isZipFile(att.file?.name || "", att.file?.mimeType)),
    [sablonAttachments],
  );

  const imageSablonAttachments = useMemo(
    () => sablonAttachments.filter((att) => isImageFile(att.file?.name || "", att.file?.mimeType)),
    [sablonAttachments],
  );

  const zipTableRows = useMemo<TableRow[]>(
    () =>
      zipSablonAttachments.map((att, index) => ({
        key: att.id,
        attachmentId: att.id,
        fileName: att.file?.name || `ZIP ${index + 1}`,
      })),
    [zipSablonAttachments],
  );

  const imageTableRows = useMemo<TableRow[]>(
    () =>
      imageSablonAttachments.map((att, index) => ({
        key: att.id,
        attachmentId: att.id,
        fileName: att.file?.name
          ? formatAttachmentName(att.file.name, att.file.mimeType)
          : `Attachment ${index + 1}`,
      })),
    [imageSablonAttachments],
  );

  const attachmentIdsKey = useMemo(
    () => imageSablonAttachments.map((att) => att.id).join("|"),
    [imageSablonAttachments],
  );

  const getRowState = useCallback(
    (attachmentId: string): RowState => rowsState[attachmentId] || { amount: null, userId: null },
    [rowsState],
  );

  const handleRowStateChange = useCallback((attachmentId: string, patch: Partial<RowState>) => {
    setRowsState((prev) => ({
      ...prev,
      [attachmentId]: {
        amount: prev[attachmentId]?.amount ?? null,
        userId: prev[attachmentId]?.userId ?? null,
        ...patch,
      },
    }));
  }, []);

  const applyDesignerToAll = useCallback(() => {
    setRowsState((prev) => {
      const next = { ...prev };
      imageSablonAttachments.forEach((att) => {
        next[att.id] = {
          amount: prev[att.id]?.amount ?? null,
          userId: allDesignerUserId,
        };
      });
      return next;
    });
  }, [allDesignerUserId, imageSablonAttachments]);

  const handleClearAll = useCallback(() => {
    if (sablonAttachments.length === 0) return;
    Modal.confirm({
      title: "Delete sablon files?",
      content: "Every files with category sablon will be deleted",
      okText: "OK",
      cancelText: "Cancel",
      okType: "danger",
      onOk: () => {
        void (async () => {
          setIsClearingAll(true);
          const toastKey = "sablon-clear-all";
          message.loading({ key: toastKey, content: "Deleting sablon files...", duration: 0 });
          try {
            for (const attachment of sablonAttachments) {
              await deleteCardAttachment(attachment.id);
            }
            setRowsState({});
            setAllDesignerUserId(null);
            setPreviewModalOpen(false);
            message.success({ key: toastKey, content: "All sablon files deleted" });
            refetch?.();
          } catch (error: any) {
            message.error({ key: toastKey, content: error?.message || "Failed to delete sablon files" });
          } finally {
            setIsClearingAll(false);
          }
        })();
      },
    });
  }, [refetch, sablonAttachments]);

  const handleOpenPreview = useCallback(
    (attachmentId: string) => {
      const index = imageSablonAttachments.findIndex((att) => att.id === attachmentId);
      if (index < 0) return;
      setPreviewInitialIndex(index);
      setPreviewModalOpen(true);
    },
    [imageSablonAttachments],
  );

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    const load = async () => {
      setIsLoadingRows(true);
      try {
        const response = await getSablonAttachments(card.id);
        if (cancelled) return;

        const existingMap = new Map<string, SablonAttachmentRow>();
        (response.data || []).forEach((row) => {
          existingMap.set(row.attachmentId, row);
        });

        setRowsState((prev) => {
          const next: Record<string, RowState> = {};
          imageSablonAttachments.forEach((att) => {
            const existing = existingMap.get(att.id);
            next[att.id] = {
              amount: existing?.amount ?? prev[att.id]?.amount ?? null,
              userId: existing?.userId ?? prev[att.id]?.userId ?? null,
            };
          });
          return next;
        });
      } catch {
        if (!cancelled) message.error("Failed to load sablon data");
      } finally {
        if (!cancelled) setIsLoadingRows(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [open, card.id, attachmentIdsKey, imageSablonAttachments]);

  const grandTotal = useMemo(
    () => imageSablonAttachments.reduce((sum, att) => sum + (getRowState(att.id).amount ?? 0), 0),
    [imageSablonAttachments, getRowState],
  );

  const uploadSingleFile = useCallback(
    async (file: File): Promise<void> => {
      const res = await uploadFile(file, { cardId: card.id, type: EnumCardAttachmentType.Sablon });
      const uploaded = res?.data;
      if (!uploaded?.id) throw new Error(`Upload failed for ${file.name}`);
      await new Promise<void>((resolve, reject) => {
        addAttachment(
          { cardId: card.id, attachableType: EnumAttachmentType.File, attachableId: uploaded.id, isCover: false, type: EnumCardAttachmentType.Sablon },
          { onSuccess: () => resolve(), onError: reject },
        );
      });
    },
    [addAttachment, card.id],
  );

  const processFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      setIsUploading(true);
      setUploadTotal(0);
      setUploadCompleted(0);
      setUploadCurrentName("");
      const toastKey = "sablon-upload";
      message.loading({ key: toastKey, content: "Uploading...", duration: 0 });

      try {
        const tasks: PreparedUploadTask[] = [];
        for (const file of files) {
          if (isZipFile(file.name, file.type)) {
            tasks.push({ displayName: file.name, buildFile: async () => file });
            const zip = await JSZip.loadAsync(file);
            const imageEntries = Object.values(zip.files).filter(
              (entry) => !entry.dir && IMAGE_EXTENSIONS.test(entry.name),
            );
            if (imageEntries.length === 0) {
              message.warning(`${file.name} tidak memiliki file gambar (JPG/JPEG/PNG/WEBP).`);
              continue;
            }
            for (const entry of imageEntries) {
              const baseName = entry.name.split("/").pop() || entry.name;
              tasks.push({
                displayName: `${file.name} / ${baseName}`,
                buildFile: async () => {
                  const blob = await entry.async("blob");
                  return new File([blob], baseName, { type: getMimeTypeFromName(baseName) });
                },
              });
            }
          } else {
            tasks.push({ displayName: file.name, buildFile: async () => file });
          }
        }

        if (tasks.length === 0) {
          message.warning({ key: toastKey, content: "Tidak ada file yang bisa di-upload." });
          return;
        }

        setUploadTotal(tasks.length);
        for (let i = 0; i < tasks.length; i++) {
          const task = tasks[i];
          setUploadCurrentName(task.displayName);
          message.loading({ key: toastKey, content: `Uploading ${i + 1}/${tasks.length}...`, duration: 0 });
          await uploadSingleFile(await task.buildFile());
          setUploadCompleted(i + 1);
        }

        message.success({ key: toastKey, content: "Upload complete" });
        await refetch?.();
        setUploadTotal(0);
        setUploadCompleted(0);
      } catch (err: any) {
        message.error({ key: toastKey, content: err?.message || "Upload failed" });
      } finally {
        setIsUploading(false);
        setUploadCurrentName("");
      }
    },
    [uploadSingleFile, refetch],
  );

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await processFiles(files);
    },
    [processFiles],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setIsDragging(false);
  }, []);
  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault(); e.stopPropagation(); setIsDragging(false);
      const files = Array.from(e.dataTransfer.files).filter(isSupportedUploadFile);
      await processFiles(files);
    },
    [processFiles],
  );

  useEffect(() => {
    if (!open) return;
    const handlePaste = async (e: ClipboardEvent) => {
      const files: File[] = [];
      for (const item of Array.from(e.clipboardData?.items || [])) {
        if (item.kind !== "file") continue;
        const file = item.getAsFile();
        if (file && isSupportedUploadFile(file)) files.push(file);
      }
      if (files.length > 0) { e.preventDefault(); e.stopPropagation(); await processFiles(files); }
    };
    window.addEventListener("paste", handlePaste, true);
    return () => window.removeEventListener("paste", handlePaste, true);
  }, [open, processFiles]);

  const handleSave = async () => {
    const incompleteRows = imageSablonAttachments.filter((att) => {
      const row = getRowState(att.id);
      return typeof row.amount !== "number" || !row.userId;
    });

    if (incompleteRows.length > 0) {
      message.error("Semua baris harus terisi (Jml dan Desainer)");
      return;
    }

    setIsSaving(true);
    try {
      const rowsPayload: SablonAttachmentRow[] = imageSablonAttachments.map((att) => {
        const row = getRowState(att.id);
        return {
          cardId: card.id,
          attachmentId: att.id,
          userId: row.userId,
          amount: row.amount as number,
        };
      });

      await bulkUpsertSablonAttachments(rowsPayload);

      const jmlSablonField = (cardCustomFields || []).find((field) =>
        String(field?.name || "").toLowerCase().includes("jml sablon"),
      );
      if (jmlSablonField?.id) {
        await setCardCustomFieldValue(workspaceId, card.id, jmlSablonField.id, { valueNumber: grandTotal });
      } else {
        message.warning("Custom field 'Jml Sablon' was not found");
      }
      await queryClient.invalidateQueries({ queryKey: ["cardCustomField", card.id, workspaceId] });
      message.success("Jml Sablon saved");
      onClose();
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Failed to save Jml Sablon");
    } finally {
      setIsSaving(false);
    }
  };

  const tableColumns = useMemo<ColumnsType<TableRow>>(
    () => [
      {
        title: "Nama File",
        dataIndex: "fileName",
        key: "fileName",
        ellipsis: true,
        render: (_value: string, record) => (
          <Button type="link" className="!px-0" onClick={() => handleOpenPreview(record.attachmentId)}>
            {record.fileName}
          </Button>
        ),
      },
      {
        title: "Jml",
        dataIndex: "attachmentId",
        key: "amount",
        width: 140,
        render: (_: string, record: TableRow) => (
          <InputNumber
            min={0}
            step={1}
            value={getRowState(record.attachmentId).amount}
            onChange={(value) => handleRowStateChange(record.attachmentId, { amount: typeof value === "number" ? value : null })}
            className="w-full"
          />
        ),
      },
      {
        title: "Desainer",
        dataIndex: "attachmentId",
        key: "userId",
        width: 200,
        render: (_: string, record: TableRow) => (
          <Select
            allowClear
            placeholder="Pilih desainer"
            loading={isLoadingAccounts}
            options={designerOptions}
            value={getRowState(record.attachmentId).userId ?? undefined}
            showSearch
            optionFilterProp="label"
            onChange={(value) =>
              handleRowStateChange(record.attachmentId, { userId: (value as string | undefined) ?? null })
            }
            className="w-full"
          />
        ),
      },
    ],
    [designerOptions, getRowState, handleOpenPreview, handleRowStateChange, isLoadingAccounts],
  );

  return (
    <>
      <Modal
        title="Input Jml Sablon"
        open={open}
        onCancel={onClose}
        width={800}
        destroyOnClose
        onOk={handleSave}
        confirmLoading={isSaving || isLoadingRows}
        okText="Save"
        cancelText="Cancel"
        okButtonProps={{ disabled: isUploading || isLoadingRows }}
      >
        <Space direction="vertical" size={12} className="w-full">
          <div
            className={`border-2 border-dashed rounded-lg p-4 transition-colors ${isDragging ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-gray-400"}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input ref={fileInputRef} type="file" accept=".zip,.jpg,.jpeg,.png,.webp,image/*" multiple className="hidden" onChange={handleFileChange} />
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-700">Drag & drop file atau Ctrl+V untuk paste</div>
                <div className="text-xs text-gray-500">ZIP (akan di-extract JPG/JPEG) atau langsung JPG/JPEG</div>
              </div>
              <Button icon={<Upload size={14} />} loading={isUploading} onClick={() => fileInputRef.current?.click()}>
                Upload File
              </Button>
            </div>
          </div>

          {(isUploading || uploadTotal > 0) && (
            <div className="rounded-lg border border-gray-200 p-3">
              <div className="mb-2 text-sm text-gray-700">Uploading {uploadCompleted}/{uploadTotal}</div>
              <Progress percent={uploadTotal > 0 ? Math.round((uploadCompleted / uploadTotal) * 100) : 0} status={isUploading ? "active" : "normal"} />
              {uploadCurrentName && <div className="mt-1 text-xs text-gray-500 truncate">Current: {uploadCurrentName}</div>}
            </div>
          )}

          <Space align="center" wrap>
            <Select
              allowClear
              placeholder="Set desainer ke semua"
              loading={isLoadingAccounts}
              options={designerOptions}
              value={allDesignerUserId ?? undefined}
              showSearch
              optionFilterProp="label"
              onChange={(value) => setAllDesignerUserId((value as string | undefined) ?? null)}
              style={{ minWidth: 220 }}
            />
            <Button onClick={applyDesignerToAll} disabled={imageSablonAttachments.length === 0}>
              Set Desainer ke semua
            </Button>
            <Button danger onClick={handleClearAll} disabled={sablonAttachments.length === 0 || isClearingAll} loading={isClearingAll}>
              Clear All
            </Button>
          </Space>

          <div><Text strong>ZIP Files</Text></div>
          <Table<TableRow>
            rowKey="key"
            dataSource={zipTableRows}
            columns={[{ title: "Nama File", dataIndex: "fileName", key: "fileName", ellipsis: true, render: (value: string) => <Text>{value}</Text> }]}
            pagination={false}
            size="small"
            scroll={{ x: 400, y: 180 }}
            locale={{ emptyText: "Tidak ada file ZIP." }}
          />

          <div><Text strong>Image Files</Text></div>
          <Table<TableRow>
            rowKey="key"
            loading={isLoadingRows}
            dataSource={imageTableRows}
            columns={tableColumns}
            pagination={false}
            scroll={{ x: 600, y: 380 }}
            locale={{ emptyText: "Belum ada file image sablon. Upload file di atas." }}
          />

          <div className="flex justify-end pt-1">
            <Text strong>Grand Total Jml: {grandTotal.toLocaleString("en-US")}</Text>
          </div>
        </Space>
      </Modal>

      <AttachmentPreviewModal
        open={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        attachments={imageSablonAttachments}
        initialIndex={previewInitialIndex}
        isImageFile={isImageFile}
        isPDFFile={isPDFFile}
      />
    </>
  );
};

export default ModalJmlSablon;
