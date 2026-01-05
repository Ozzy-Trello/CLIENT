import {
  DeleteOutlined,
  DownloadOutlined,
  PlusOutlined,
  RotateLeftOutlined,
  RotateRightOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
} from "@ant-design/icons";
import { QrCode } from "lucide-react";
import { Button, Image, List, Space, Tag, Tooltip } from "antd";
import React from "react";
import { CardAttachment, EnumCardAttachmentType } from "@myTypes/card";
import { PDFPreview } from "@components/pdf-preview";
import { formatFileSize, getFileIcon, isImageFile, isPDFFile } from "./attachment-helpers";

type SectionType = "bukti" | "po" | "other";

interface AttachmentSectionProps {
  title: string;
  attachments: CardAttachment[];
  emptyText?: string;
  sectionType: SectionType;
  canUpdateCard: boolean;
  coveringAttachmentId: string | null;
  onOpenUpload?: (type: EnumCardAttachmentType) => void;
  onMarkCover: (attachmentId: string, isAlreadyCover: boolean) => void;
  onDelete: (attachmentId: string) => void;
  onDownload: (url?: string, fileName?: string) => void;
  onOpenPdfPreview: (url: string, fileName: string) => void;
  onPrintImageWithQR?: (url?: string, fileName?: string, attachmentId?: string) => void;
  onPrintPdfWithQR?: (url?: string, fileName?: string, attachmentId?: string) => void;
}

interface AttachmentItemProps
  extends Pick<
    AttachmentSectionProps,
    | "sectionType"
    | "canUpdateCard"
    | "coveringAttachmentId"
    | "onMarkCover"
    | "onDelete"
    | "onDownload"
    | "onOpenPdfPreview"
    | "onPrintImageWithQR"
    | "onPrintPdfWithQR"
  > {
  attachment: CardAttachment;
}

const AttachmentItem: React.FC<AttachmentItemProps> = ({
  attachment,
  sectionType,
  canUpdateCard,
  coveringAttachmentId,
  onMarkCover,
  onDelete,
  onDownload,
  onOpenPdfPreview,
  onPrintImageWithQR,
  onPrintPdfWithQR,
}) => {
  const printed =
    (attachment as any).isPrinted ?? (attachment as any).is_printed ?? false;
  const isImage = isImageFile(
    attachment.file?.name || "",
    attachment.file?.mimeType
  );
  const isPdf = isPDFFile(
    attachment.file?.name || "",
    attachment.file?.mimeType
  );

  return (
    <List.Item className="flex items-center p-2 hover:bg-gray-50 rounded">
      <div className="flex-shrink-0 mr-3 w-20 h-15 flex items-center justify-center">
        {isImage ? (
          <div className="w-20 h-15 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
            <Image
              preview
              src={attachment.file?.url}
              alt={attachment.file?.name || "attachment"}
              width={80}
              height={60}
              style={{ objectFit: "cover" }}
            />
          </div>
        ) : isPdf ? (
          <div
            className="w-20 h-15 overflow-hidden rounded cursor-pointer"
            onClick={() =>
              onOpenPdfPreview(
                attachment.file?.url || "",
                attachment.file?.name || "PDF Document"
              )
            }
          >
            <PDFPreview
              url={attachment.file?.url || ""}
              fileName={attachment.file?.name}
            />
          </div>
        ) : (
          <div className="w-20 h-15 bg-gray-100 rounded flex items-center justify-center">
            {getFileIcon(
              attachment.file?.name || "",
              attachment.file?.mimeType
            )}
          </div>
        )}
      </div>

      <div className="flex-grow min-w-0">
        <div className="flex items-center justify-between">
          <div className="flex-grow min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate flex items-center gap-2">
              <span className="truncate">
                {attachment.file?.name || "Unnamed file"}
              </span>
              {printed && (
                <Tooltip title="Already printed with QR code">
                  <span className="text-green-600 text-xs font-semibold">✓</span>
                </Tooltip>
              )}
              {attachment.isCover && (
                <Tag color="success" className="text-[10px] uppercase">
                  Cover
                </Tag>
              )}
            </p>
            <div className="flex items-center text-xs text-gray-500 space-x-2">
              <span>{formatFileSize(attachment.file?.size)}</span>
              {attachment.file?.mimeType && (
                <>
                  <span>•</span>
                  <span>{attachment.file.mimeType}</span>
                </>
              )}
              {attachment.createdAt && (
                <>
                  <span>•</span>
                  <span>
                    {new Date(attachment.createdAt).toLocaleDateString()}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-1 ml-2">
            <Button
              type="text"
              size="small"
              icon={<DownloadOutlined />}
              onClick={() =>
                onDownload(attachment.file?.url, attachment.file?.name)
              }
              className="text-gray-500 hover:text-blue-600"
            />

            {sectionType === "po" && isImage && (
              <Button
                type="text"
                size="small"
                icon={<QrCode size={14} />}
                onClick={() =>
                  onPrintImageWithQR?.(
                    attachment.file?.url,
                    attachment.file?.name || "image",
                    attachment.id
                  )
                }
                className="text-gray-500 hover:text-green-600"
              />
            )}

            {sectionType === "po" && isPdf && (
              <Button
                type="text"
                size="small"
                icon={<QrCode size={14} />}
                onClick={() =>
                  onPrintPdfWithQR?.(
                    attachment.file?.url,
                    attachment.file?.name || "PDF",
                    attachment.id
                  )
                }
                className="text-gray-500 hover:text-green-600"
              />
            )}

            {canUpdateCard && (
              <Button
                type="text"
                size="small"
                onClick={() =>
                  onMarkCover(attachment.id, Boolean(attachment.isCover))
                }
                disabled={
                  attachment.isCover ||
                  (coveringAttachmentId !== null &&
                    coveringAttachmentId !== attachment.id)
                }
                loading={coveringAttachmentId === attachment.id}
                className="text-gray-500 hover:text-blue-600"
              >
                {attachment.isCover ? "Cover" : "Make Cover"}
              </Button>
            )}

            {canUpdateCard && (
              <Button
                type="text"
                size="small"
                icon={<DeleteOutlined />}
                onClick={() => onDelete(attachment.id)}
                className="text-gray-500 hover:text-red-600"
              />
            )}
          </div>
        </div>
      </div>
    </List.Item>
  );
};

const AttachmentSection: React.FC<AttachmentSectionProps> = ({
  title,
  attachments,
  emptyText = "No attachments yet",
  sectionType,
  canUpdateCard,
  coveringAttachmentId,
  onOpenUpload,
  onMarkCover,
  onDelete,
  onDownload,
  onOpenPdfPreview,
  onPrintImageWithQR,
  onPrintPdfWithQR,
}) => {
  if (attachments.length === 0) {
    return (
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500 font-medium uppercase mb-2">
            {title}
          </div>
          {onOpenUpload && canUpdateCard && (
            <Button
              type="link"
              size="small"
              icon={<PlusOutlined />}
              onClick={() =>
                onOpenUpload(
                  sectionType === "bukti"
                    ? EnumCardAttachmentType.Bukti
                    : sectionType === "po"
                    ? EnumCardAttachmentType.PO
                    : EnumCardAttachmentType.Attachment
                )
              }
            >
              Upload
            </Button>
          )}
        </div>
        <div className="text-sm text-gray-400 italic">{emptyText}</div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500 font-medium uppercase mb-2">
          {title}
        </div>
        {onOpenUpload && canUpdateCard && (
          <Button
            type="link"
            size="small"
            icon={<PlusOutlined />}
            onClick={() =>
              onOpenUpload(
                sectionType === "bukti"
                  ? EnumCardAttachmentType.Bukti
                  : sectionType === "po"
                  ? EnumCardAttachmentType.PO
                  : EnumCardAttachmentType.Attachment
              )
            }
          >
            Upload
          </Button>
        )}
      </div>
      <List
        className="space-y-3"
        dataSource={attachments}
        locale={{ emptyText }}
        renderItem={(attachment) => (
          <AttachmentItem
            key={attachment.id}
            attachment={attachment}
            sectionType={sectionType}
            canUpdateCard={canUpdateCard}
            coveringAttachmentId={coveringAttachmentId}
            onMarkCover={onMarkCover}
            onDelete={onDelete}
            onDownload={onDownload}
            onOpenPdfPreview={onOpenPdfPreview}
            onPrintImageWithQR={onPrintImageWithQR}
            onPrintPdfWithQR={onPrintPdfWithQR}
          />
        )}
      />
    </div>
  );
};

export default AttachmentSection;
