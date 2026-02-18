"use client";

import {
  StitchAttachmentRow,
  bulkUpsertStitchAttachments,
  getStitchAttachments,
} from "@api/stitch_attachment";
import { setCardCustomFieldValue } from "@api/card_custom_field";
import { uploadFile } from "@api/file";
import { useAccountList } from "@hooks/account";
import { useCardAttachment } from "@hooks/card_attachment";
import { useCardCustomField } from "@hooks/card_custom_field";
import {
  Card,
  EnumAttachmentType,
  EnumCardAttachmentType,
} from "@myTypes/card";
import { isImageFile } from "@utils/file";
import { useQueryClient } from "@tanstack/react-query";
import {
  Button,
  InputNumber,
  Modal,
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

interface ModalJmlStitchProps {
  open: boolean;
  onClose: () => void;
  card: Card;
  workspaceId: string;
  boardId: string;
}

interface RowState {
  stitch: number | null;
  amount: number | null;
  userId: string | null;
}

interface TableRow {
  key: string;
  attachmentId: string;
  fileName: string;
}

const formatNumber = (value: number): string =>
  Number.isFinite(value) ? value.toLocaleString("en-US") : "0";

const IMAGE_EXTENSIONS = /\.(jpe?g)$/i;
const IMAGE_NAME_EXTENSION = /\.(jpe?g|png|gif|bmp|svg|webp)$/i;
const ZIP_EXTENSIONS = /\.zip$/i;

const isZipFile = (fileName: string, mimeType?: string): boolean => {
  if (!fileName && !mimeType) return false;
  if (
    mimeType === "application/zip" ||
    mimeType === "application/x-zip-compressed"
  ) {
    return true;
  }
  return ZIP_EXTENSIONS.test(fileName);
};

const formatAttachmentName = (fileName: string, mimeType?: string): string => {
  if (!isImageFile(fileName, mimeType)) return fileName;
  const withoutExtension = fileName.replace(IMAGE_NAME_EXTENSION, "");
  return withoutExtension || fileName;
};

const getDesignerValueFromField = (field: any): string | null => {
  const raw =
    field?.valueUserId ??
    field?.value_user_id ??
    field?.valueOption ??
    field?.value_option ??
    field?.valueString ??
    field?.value_string ??
    null;

  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed ? trimmed : null;
};

const ModalJmlStitch: React.FC<ModalJmlStitchProps> = ({
  open,
  onClose,
  card,
  workspaceId,
  boardId,
}) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [rowsState, setRowsState] = useState<Record<string, RowState>>({});
  const [isLoadingRows, setIsLoadingRows] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [allDesignerUserId, setAllDesignerUserId] = useState<string | null>(
    null,
  );

  const { addAttachment, cardAttachments, refetch } = useCardAttachment(
    card.id,
    { fetch: true },
  );

  const { data: accountListData, isLoading: isLoadingAccounts } =
    useAccountList({ workspaceId, boardId });

  const { cardCustomFields } = useCardCustomField(card.id, workspaceId, {
    enabled: open,
  });

  const defaultDesignerUserId = useMemo(() => {
    const sources = [
      Array.isArray(cardCustomFields) ? cardCustomFields : [],
      Array.isArray(card.customFields) ? card.customFields : [],
    ];

    for (const fields of sources) {
      const match = fields.find(
        (field: any) =>
          String(field?.name || "").trim().toLowerCase() === "desainer bordir",
      );
      const value = match ? getDesignerValueFromField(match) : null;
      if (value) return value;
    }

    return null;
  }, [cardCustomFields, card.customFields]);

  // Only show STITCH type attachments in this modal
  const stitchAttachments = useMemo(
    () =>
      (cardAttachments || []).filter(
        (att) =>
          att.attachableType === EnumAttachmentType.File &&
          att.type === EnumCardAttachmentType.Stitch,
      ),
    [cardAttachments],
  );

  const attachmentIdsKey = useMemo(
    () => stitchAttachments.map((a) => a.id).join("|"),
    [stitchAttachments],
  );

  const designerOptions = useMemo(
    () =>
      (accountListData?.data || []).map((account: any) => ({
        value: account.id as string,
        label: account.name || account.username || account.email || account.id,
      })),
    [accountListData?.data],
  );

  const zipStitchAttachments = useMemo(
    () =>
      stitchAttachments.filter((att) =>
        isZipFile(att.file?.name || "", att.file?.mimeType),
      ),
    [stitchAttachments],
  );

  const imageStitchAttachments = useMemo(
    () =>
      stitchAttachments.filter((att) =>
        isImageFile(att.file?.name || "", att.file?.mimeType),
      ),
    [stitchAttachments],
  );

  const zipTableRows = useMemo<TableRow[]>(
    () =>
      zipStitchAttachments.map((att, index) => ({
        key: att.id,
        attachmentId: att.id,
        fileName: att.file?.name || `ZIP ${index + 1}`,
      })),
    [zipStitchAttachments],
  );

  const imageTableRows = useMemo<TableRow[]>(
    () =>
      imageStitchAttachments.map((att, index) => ({
        key: att.id,
        attachmentId: att.id,
        fileName: att.file?.name
          ? formatAttachmentName(att.file.name, att.file.mimeType)
          : `Attachment ${index + 1}`,
      })),
    [imageStitchAttachments],
  );

  const getRowState = useCallback(
    (attachmentId: string): RowState =>
      rowsState[attachmentId] || { stitch: null, amount: null, userId: null },
    [rowsState],
  );

  const handleRowStateChange = useCallback(
    (attachmentId: string, patch: Partial<RowState>) => {
      setRowsState((prev) => ({
        ...prev,
        [attachmentId]: {
          stitch: prev[attachmentId]?.stitch ?? null,
          amount: prev[attachmentId]?.amount ?? null,
          userId: prev[attachmentId]?.userId ?? null,
          ...patch,
        },
      }));
    },
    [],
  );

  const applyDesignerToAll = useCallback(() => {
    setRowsState((prev) => {
      const next = { ...prev };
      imageStitchAttachments.forEach((att) => {
        next[att.id] = {
          stitch: prev[att.id]?.stitch ?? null,
          amount: prev[att.id]?.amount ?? null,
          userId: allDesignerUserId,
        };
      });
      return next;
    });
  }, [allDesignerUserId, imageStitchAttachments]);

  const grandTotal = useMemo(
    () =>
      imageStitchAttachments.reduce((sum, att) => {
        const row = getRowState(att.id);
        if (
          !row.userId ||
          typeof row.stitch !== "number" ||
          typeof row.amount !== "number"
        ) {
          return sum;
        }
        return sum + row.stitch * row.amount;
      }, 0),
    [imageStitchAttachments, getRowState],
  );

  // Prefill rows from existing stitch_attachment records when modal opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const load = async () => {
      setIsLoadingRows(true);
      try {
        const response = await getStitchAttachments(card.id);
        if (cancelled) return;

        const existingMap = new Map<string, StitchAttachmentRow>();
        (response.data || []).forEach((row) => {
          existingMap.set(row.attachmentId, row);
        });

        setRowsState((prev) => {
          const next: Record<string, RowState> = {};
          imageStitchAttachments.forEach((att) => {
            const existing = existingMap.get(att.id);
            next[att.id] = {
              stitch: existing?.stitch ?? prev[att.id]?.stitch ?? null,
              amount: existing?.amount ?? prev[att.id]?.amount ?? null,
              userId:
                existing?.userId ??
                prev[att.id]?.userId ??
                defaultDesignerUserId ??
                null,
            };
          });
          return next;
        });
        setAllDesignerUserId(null);
      } catch {
        if (!cancelled) message.error("Failed to load stitch data");
      } finally {
        if (!cancelled) setIsLoadingRows(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [
    open,
    card.id,
    attachmentIdsKey,
    imageStitchAttachments,
    defaultDesignerUserId,
  ]);

  // Upload a single File as a STITCH attachment and link it to the card
  const uploadSingleFile = useCallback(
    async (file: File): Promise<void> => {
      const res = await uploadFile(file, { cardId: card.id });
      const uploaded = res?.data;
      if (!uploaded?.id) throw new Error(`Upload failed for ${file.name}`);

      await new Promise<void>((resolve, reject) => {
        addAttachment(
          {
            cardId: card.id,
            attachableType: EnumAttachmentType.File,
            attachableId: uploaded.id,
            isCover: false,
            type: EnumCardAttachmentType.Stitch,
          },
          { onSuccess: () => resolve(), onError: reject },
        );
      });
    },
    [addAttachment, card.id],
  );

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (files.length === 0) return;

      setIsUploading(true);
      const toastKey = "stitch-upload";
      message.loading({ key: toastKey, content: "Uploading...", duration: 0 });

      try {
        for (const file of files) {
          const isZip =
            file.type === "application/zip" ||
            file.type === "application/x-zip-compressed" ||
            file.name.toLowerCase().endsWith(".zip");

          if (isZip) {
            // 1. Upload the zip itself as a STITCH attachment
            await uploadSingleFile(file);

            // 2. Extract JPG/JPEG entries and upload each one
            const zip = await JSZip.loadAsync(file);
            const imageEntries = Object.values(zip.files).filter(
              (entry) => !entry.dir && IMAGE_EXTENSIONS.test(entry.name),
            );

            for (const entry of imageEntries) {
              const blob = await entry.async("blob");
              const baseName = entry.name.split("/").pop() || entry.name;
              const imageFile = new File([blob], baseName, {
                type: "image/jpeg",
              });
              await uploadSingleFile(imageFile);
            }
          } else {
            // Direct image upload
            await uploadSingleFile(file);
          }
        }

        message.success({ key: toastKey, content: "Upload complete" });
        refetch?.();
      } catch (err: any) {
        message.error({
          key: toastKey,
          content: err?.message || "Upload failed",
        });
      } finally {
        setIsUploading(false);
      }
    },
    [uploadSingleFile, refetch],
  );

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const rowsPayload: StitchAttachmentRow[] = imageStitchAttachments
        .map((att) => {
          const row = getRowState(att.id);
          const isComplete =
            !!row.userId &&
            typeof row.stitch === "number" &&
            typeof row.amount === "number";

          if (!isComplete) return null;

          return {
            cardId: card.id,
            attachmentId: att.id,
            userId: row.userId,
            stitch: row.stitch,
            amount: row.amount,
          };
        })
        .filter((row): row is StitchAttachmentRow => row !== null);

      if (rowsPayload.length > 0) {
        await bulkUpsertStitchAttachments(rowsPayload);
      }

      const savedGrandTotal = rowsPayload.reduce(
        (sum, row) => sum + row.stitch * row.amount,
        0,
      );

      const jmlStitchField = (cardCustomFields || []).find((field) =>
        String(field?.name || "")
          .toLowerCase()
          .includes("jml stitch"),
      );

      if (jmlStitchField?.id) {
        await setCardCustomFieldValue(workspaceId, card.id, jmlStitchField.id, {
          valueNumber: savedGrandTotal,
        });
      } else {
        message.warning("Custom field 'Jml Stitch' was not found");
      }

      await queryClient.invalidateQueries({
        queryKey: ["cardCustomField", card.id, workspaceId],
      });

      message.success("Jml Stitch saved");
      onClose();
    } catch (error: any) {
      message.error(
        error?.response?.data?.message || "Failed to save Jml Stitch",
      );
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
        render: (value: string) => <Text>{value}</Text>,
      },
      {
        title: "Stitch",
        dataIndex: "attachmentId",
        key: "stitch",
        width: 130,
        render: (attachmentId: string) => {
          const row = getRowState(attachmentId);
          return (
            <InputNumber
              min={0}
              step={1}
              value={row.stitch}
              onChange={(value) =>
                handleRowStateChange(attachmentId, {
                  stitch: typeof value === "number" ? value : null,
                })
              }
              className="w-full"
            />
          );
        },
      },
      {
        title: "Jml",
        dataIndex: "attachmentId",
        key: "amount",
        width: 120,
        render: (attachmentId: string) => {
          const row = getRowState(attachmentId);
          return (
            <InputNumber
              min={0}
              step={1}
              value={row.amount}
              onChange={(value) =>
                handleRowStateChange(attachmentId, {
                  amount: typeof value === "number" ? value : null,
                })
              }
              className="w-full"
            />
          );
        },
      },
      {
        title: "Total Stitch",
        dataIndex: "attachmentId",
        key: "totalStitch",
        width: 140,
        render: (attachmentId: string) => {
          const row = getRowState(attachmentId);
          const total = (row.stitch ?? 0) * (row.amount ?? 0);
          return <Text strong>{formatNumber(total)}</Text>;
        },
      },
      {
        title: "Desainer",
        dataIndex: "attachmentId",
        key: "userId",
        width: 200,
        render: (attachmentId: string) => {
          const row = getRowState(attachmentId);
          return (
            <Select
              allowClear
              placeholder="Pilih desainer"
              loading={isLoadingAccounts}
              options={designerOptions}
              value={row.userId ?? undefined}
              onChange={(value) =>
                handleRowStateChange(attachmentId, {
                  userId: (value as string | undefined) ?? null,
                })
              }
              className="w-full"
            />
          );
        },
      },
    ],
    [designerOptions, getRowState, handleRowStateChange, isLoadingAccounts],
  );

  return (
    <Modal
      title="Input Jml Stitch"
      open={open}
      onCancel={onClose}
      width={1000}
      destroyOnClose
      onOk={handleSave}
      confirmLoading={isSaving}
      okText="Save"
      cancelText="Cancel"
      okButtonProps={{ disabled: isLoadingRows || isUploading }}
    >
      <Space direction="vertical" size={12} className="w-full">
        {/* Upload + designer controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip,.jpg,.jpeg"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            icon={<Upload size={14} />}
            loading={isUploading}
            onClick={() => fileInputRef.current?.click()}
          >
            Upload File
          </Button>
          <Text type="secondary" className="text-xs">
            ZIP (akan di-extract JPG/JPEG) atau langsung JPG/JPEG
          </Text>
        </div>

        {/* Set designer to all */}
        <Space align="center" wrap>
          <Select
            allowClear
            placeholder="Set desainer ke semua"
            loading={isLoadingAccounts}
            options={designerOptions}
            value={allDesignerUserId ?? undefined}
            onChange={(value) =>
              setAllDesignerUserId((value as string | undefined) ?? null)
            }
            style={{ minWidth: 220 }}
          />
          <Button
            onClick={applyDesignerToAll}
            disabled={imageStitchAttachments.length === 0}
          >
            Set Desainer ke semua
          </Button>
        </Space>

        <div>
          <Text strong>ZIP Files</Text>
        </div>
        <Table<TableRow>
          rowKey="key"
          loading={isLoadingRows}
          dataSource={zipTableRows}
          columns={[
            {
              title: "Nama File",
              dataIndex: "fileName",
              key: "fileName",
              ellipsis: true,
              render: (value: string) => <Text>{value}</Text>,
            },
          ]}
          pagination={false}
          size="small"
          scroll={{ x: 700, y: 180 }}
          locale={{ emptyText: "Tidak ada file ZIP." }}
        />

        <div>
          <Text strong>Image Files</Text>
        </div>
        <Table<TableRow>
          rowKey="key"
          loading={isLoadingRows}
          dataSource={imageTableRows}
          columns={tableColumns}
          pagination={false}
          scroll={{ x: 900, y: 380 }}
          locale={{
            emptyText: "Belum ada file image stitch. Upload file di atas.",
          }}
        />

        <div className="flex justify-end pt-1">
          <Text strong>Grand Total Stitch: {formatNumber(grandTotal)}</Text>
        </div>
      </Space>
    </Modal>
  );
};

export default ModalJmlStitch;
