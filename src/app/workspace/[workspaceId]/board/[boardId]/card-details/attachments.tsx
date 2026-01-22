import { PaperClipOutlined, DownloadOutlined, UploadOutlined, EditOutlined } from "@ant-design/icons";
import { QrCode, Pencil } from "lucide-react";
import {
  Card,
  CardAttachment,
  EnumAttachmentType,
  EnumCardAttachmentType,
  EnumCardType,
} from "@myTypes/card";
import { Button, List, Tag, Typography, Image, Modal } from "antd";
import React, { useMemo, useRef, useState } from "react";
import { formatFileSize, getFileIcon, isImageFile, isPDFFile } from "./attachment-helpers";
import { useCardAttachment } from "@hooks/card_attachment";
import { useAttachmentPrinting } from "./hooks/useAttachmentPrinting";
import { useParams } from "next/navigation";
import { uploadFile, renameFile } from "@api/file";
import { message, Input } from "antd";
import AttachedCard from "./attached-card";

interface AttachmentsProps {
  card: Card;
  setCard: React.Dispatch<React.SetStateAction<Card | null>>;
  currentUser: any;
}

const Attachments: React.FC<AttachmentsProps> = ({ card, setCard, currentUser }) => {
  void setCard;
  void currentUser;

  const params = useParams();
  const workspaceId = Array.isArray(params.workspaceId)
    ? params.workspaceId[0]
    : params.workspaceId;
  const boardId = Array.isArray(params.boardId) ? params.boardId[0] : params.boardId;

  const {
    cardAttachments,
    markCover,
    markPrinted,
    deleteAttachment,
    addAttachment,
    refetch,
  } = useCardAttachment(card.id, {
    initialData: card.attachments,
    fetch: true,
  });

  const { handlePrintWithQR, handlePrintPDFWithQR } = useAttachmentPrinting({
    card,
    workspaceId,
    boardId,
    markPrinted,
  });

  const attachments = useMemo<CardAttachment[]>(() => {
    if (cardAttachments && cardAttachments.length > 0) {
      return cardAttachments;
    }
    return card.attachments || [];
  }, [cardAttachments, card.attachments]);

  const cardLinkAttachments = useMemo(
    () =>
      attachments.filter(
        (att) => att.attachableType === EnumAttachmentType.Card
      ),
    [attachments]
  );

  // Default everything that is not an explicit card link to file attachments to keep old data working
  const fileAttachments = useMemo(
    () =>
      attachments.filter(
        (att) => att.attachableType !== EnumAttachmentType.Card
      ),
    [attachments]
  );

  React.useEffect(() => {
    // Debug helper to verify data flow
    if (process.env.NODE_ENV !== "production") {
      console.log("[ATTACHMENT DEBUG]", {
        cardId: card.id,
        fromHook: cardAttachments?.length,
        fromCard: card.attachments?.length,
      });
    }
  }, [card.id, cardAttachments, card.attachments]);

  const hasRefetched = React.useRef(false);
  React.useEffect(() => {
    if (card.id && !hasRefetched.current) {
      hasRefetched.current = true;
      refetch?.();
    }
  }, [card.id, refetch]);

  const buktiAttachments = useMemo(
    () =>
      fileAttachments.filter(
        (att) =>
          att.type === EnumCardAttachmentType.Bukti
      ),
    [fileAttachments]
  );

  const poAttachments = useMemo(
    () =>
      fileAttachments.filter(
        (att) =>
          att.type === EnumCardAttachmentType.PO
      ),
    [fileAttachments]
  );

  const otherAttachments = useMemo(
    () =>
      fileAttachments.filter(
        (att) =>
          !att.type ||
          att.type === EnumCardAttachmentType.Attachment
      ),
    [fileAttachments]
  );

  const handleDownload = (url?: string, name?: string) => {
    if (!url) return;
    const link = document.createElement("a");
    // The `download` attribute is ignored for cross-origin URLs in most browsers.
    // Proxy via same-origin API route so clicks download instead of opening inline (PDF/images).
    const isFileProxyUrl =
      url.startsWith("/api/file-proxy/") ||
      (typeof window !== "undefined" &&
        url.startsWith(`${window.location.origin}/api/file-proxy/`));

    link.href = url.startsWith("http") && !isFileProxyUrl
      ? `/api/file-proxy/${encodeURIComponent(url)}`
      : url;
    link.download = name || "download";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteWithConfirm = (attachmentId: string) => {
    Modal.confirm({
      title: "Delete Attachment",
      content: "Are you sure you want to delete this attachment?",
      okText: "Yes",
      okType: "danger",
      cancelText: "No",
      onOk() {
        deleteAttachment({ attachmentId, cardId: card.id });
      },
    });
  };

  const handleMakeCover = (attachmentId: string) => {
    if (!card.id) return;
    markCover({ attachmentId, cardId: card.id });
  };

  const [isUploading, setIsUploading] = useState(false);
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>("");

  const uploadFiles = async (fileList: FileList | null) => {
    if (!fileList || !card.id) return;
    setIsUploading(true);
    try {
      for (const file of Array.from(fileList)) {
        const res = await uploadFile(file, { cardId: card.id });
        const uploaded = res?.data;
        if (uploaded?.id) {
          addAttachment({
            cardId: card.id,
            attachableType: EnumAttachmentType.File,
            attachableId: uploaded.id,
            isCover: false,
            type: EnumCardAttachmentType.Attachment,
          });
        }
      }
      message.success("File(s) uploaded");
      refetch?.();
    } catch (err: any) {
      console.error("Upload failed", err);
      message.error(err?.message || "Upload failed");
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    uploadFiles(e.dataTransfer.files);
  };

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    uploadFiles(e.target.files);
  };

  const handleStartRename = (fileId: string, currentName: string) => {
    setRenamingFileId(fileId);
    setRenameValue(currentName);
  };

  const handleCancelRename = () => {
    setRenamingFileId(null);
    setRenameValue("");
  };

  const handleSaveRename = async (fileId: string) => {
    if (!renameValue.trim()) {
      message.error("File name cannot be empty");
      return;
    }
    setIsRenaming(true);
    try {
      await renameFile(fileId, renameValue.trim());
      message.success("File renamed successfully");
      setRenamingFileId(null);
      setRenameValue("");
      refetch?.();
    } catch (err: any) {
      console.error("Rename failed", err);
      message.error(err?.response?.data?.message || "Failed to rename file");
    } finally {
      setIsRenaming(false);
    }
  };

  const renderSection = (title: string, data: CardAttachment[]) => (
    <div className="mb-6">
      <Typography.Text className="text-xs text-gray-500 uppercase font-semibold">
        {title}
      </Typography.Text>
      <List
        className="mt-2"
        dataSource={data}
        locale={{ emptyText: "No attachments yet" }}
        renderItem={(attachment) => (
          <List.Item className="flex items-center p-2 hover:bg-gray-50 rounded">
            <div className="flex-shrink-0 mr-3 w-14 h-14 flex items-center justify-center bg-gray-100 rounded overflow-hidden">
              {attachment.file?.url &&
                isImageFile(attachment.file.name || "", attachment.file.mimeType) ? (
                <Image
                  src={attachment.file.url}
                  alt={attachment.file.name || "attachment"}
                  width={56}
                  height={56}
                  style={{ objectFit: "cover" }}
                  preview={false}
                  fallback={attachment.file.url}
                />
              ) : attachment.file?.url &&
                isPDFFile(attachment.file.name || "", attachment.file.mimeType) ? (
                <div className="flex items-center justify-center w-full h-full text-red-500 font-semibold text-xs">
                  PDF
                </div>
              ) : (
                getFileIcon(attachment.file?.name || "", attachment.file?.mimeType)
              )}
            </div>

            <div className="flex-grow min-w-0">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate flex items-center gap-1">
                    {renamingFileId === attachment.file?.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          size="small"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onPressEnter={() => handleSaveRename(attachment.file!.id)}
                          autoFocus
                          style={{ width: 180 }}
                        />
                        <Button
                          size="small"
                          type="primary"
                          loading={isRenaming}
                          onClick={() => handleSaveRename(attachment.file!.id)}
                        >
                          Save
                        </Button>
                        <Button
                          size="small"
                          onClick={handleCancelRename}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <>
                        {attachment.file?.url ? (
                          isImageFile(attachment.file.name || "", attachment.file.mimeType) ? (
                            <span
                              className="hover:underline cursor-pointer text-blue-600"
                              onClick={() => {
                                setImagePreviewUrl(attachment.file?.url || "");
                                setImagePreviewOpen(true);
                              }}
                            >
                              {attachment.file?.name || "Unnamed file"}
                            </span>
                          ) : (
                            <a
                              href={attachment.file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline"
                            >
                              {attachment.file?.name || "Unnamed file"}
                            </a>
                          )
                        ) : (
                          attachment.file?.name || "Unnamed file"
                        )}
                        {attachment.file?.id && (
                          <Pencil
                            size={12}
                            className="text-gray-400 hover:text-blue-600 cursor-pointer ml-1"
                            onClick={() =>
                              handleStartRename(
                                attachment.file!.id,
                                attachment.file?.name || ""
                              )
                            }
                          />
                        )}
                      </>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 space-x-2">
                    {attachment.file?.size !== undefined && (
                      <span>{formatFileSize(attachment.file.size)}</span>
                    )}
                    {attachment.file?.mimeType && (
                      <>
                        <span>•</span>
                        <span>{attachment.file.mimeType}</span>
                      </>
                    )}
                    {attachment.createdAt && (
                      <>
                        <span>•</span>
                        <span>{new Date(attachment.createdAt).toLocaleDateString()}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-3">
                  {attachment.isCover && (
                    <Tag color="success" className="text-[10px] uppercase">
                      Cover
                    </Tag>
                  )}
                  {attachment.file?.url &&
                    attachment.type &&
                    (attachment.type === EnumCardAttachmentType.PO &&
                      !isPDFFile(
                        attachment.file.name
                      )) && (
                      <Button
                        size="small"
                        type="link"
                        className="p-0 text-xs"
                        icon={<QrCode size={14} />}
                        onClick={() => {
                          if (isPDFFile(attachment.file?.name || "", attachment.file?.mimeType)) {
                            handlePrintPDFWithQR(
                              attachment.file?.url,
                              attachment.file?.name || "PDF",
                              attachment.id
                            );
                          } else {
                            handlePrintWithQR(
                              attachment.file?.url,
                              attachment.file?.name || "image",
                              attachment.id
                            );
                          }
                        }}
                      >
                        QR
                      </Button>
                    )}
                  {attachment.file?.url && (
                    <DownloadOutlined
                      className="text-gray-500 hover:text-blue-600 cursor-pointer"
                      onClick={() =>
                        handleDownload(attachment.file?.url, attachment.file?.name)
                      }
                    />
                  )}
                  {!attachment.isCover && (
                    <Button
                      size="small"
                      type="link"
                      className="p-0 text-xs"
                      onClick={() => handleMakeCover(attachment.id)}
                    >
                      Make Cover
                    </Button>
                  )}
                  <Button
                    size="small"
                    type="link"
                    danger
                    className="p-0 text-xs"
                    onClick={() => handleDeleteWithConfirm(attachment.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </List.Item>
        )}
      />
    </div>
  );

  const renderCardLinks = () => (
    <div className="mb-6">
      <Typography.Text className="text-xs text-gray-500 uppercase font-semibold">
        Linked Cards
      </Typography.Text>
      <List
        className="mt-2"
        grid={{ gutter: 12, column: 3 }}
        dataSource={cardLinkAttachments}
        locale={{ emptyText: "No card attachments yet" }}
        renderItem={(attachment) => {
          const linkedCard: Card =
            attachment.targetCard ||
            ({
              id: attachment.attachableId,
              name: attachment.name || "Linked card",
              listId: card.listId,
              listName: card.listName,
              boardId: card.boardId,
              boardName: card.boardName,
              type: EnumCardType.Regular,
            } as Card);

          return (
            <List.Item key={attachment.id} className="p-0 border-none">
              <AttachedCard
                card={linkedCard}
                onDelete={() =>
                  deleteAttachment({ attachmentId: attachment.id, cardId: card.id })
                }
              />
            </List.Item>
          );
        }}
      />
    </div>
  );

  return (
    <div className="bg-white p-4 rounded-lg mt-2">
      <div className="flex items-center mb-4">
        <PaperClipOutlined className="text-gray-500 mr-2" />
        <Typography.Title level={5} className="m-0">
          Attachments
        </Typography.Title>
      </div>

      {/* <div
        className="border border-dashed border-gray-300 rounded-md p-3 mb-4 bg-gray-50 hover:border-blue-400 transition-colors"
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-700">
              Drag & drop files here to upload
            </div>
            <div className="text-xs text-gray-500">
              or click to select files
            </div>
          </div>
          <Button
            icon={<UploadOutlined />}
            loading={isUploading}
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
          >
            Select Files
          </Button>
        </div>
        <input
          type="file"
          multiple
          ref={inputRef}
        onChange={handleSelect}
        className="hidden"
      />
      </div> */}

      {renderCardLinks()}
      {renderSection("PO", poAttachments)}
      {renderSection("Bukti", buktiAttachments)}
      {renderSection("Other", otherAttachments)}

      <div style={{ display: "none" }}>
        <Image
          src={imagePreviewUrl}
          preview={{
            visible: imagePreviewOpen,
            onVisibleChange: (visible) => {
              setImagePreviewOpen(visible);
              if (!visible) setImagePreviewUrl("");
            },
            src: imagePreviewUrl,
          }}
        />
      </div>
    </div>
  );
};

export default Attachments;
