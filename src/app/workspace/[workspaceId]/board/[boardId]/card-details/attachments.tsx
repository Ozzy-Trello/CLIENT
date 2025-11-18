import {
  DeleteOutlined,
  DownloadOutlined,
  ExportOutlined,
  FileExcelOutlined,
  FileImageOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  FileWordOutlined,
  FileZipOutlined,
  InboxOutlined,
  PaperClipOutlined,
  PlusOutlined,
  RotateLeftOutlined,
  RotateRightOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
} from "@ant-design/icons";
import { QrCode } from "lucide-react";
import { mapBackendCardToFrontend } from "@api/card";
import { uploadFile } from "@api/file";
import { createShortUrl, buildShortUrl } from "@api/short-url";
import UploadModal from "@components/modal-upload/modal-upload";
import { PDFModal } from "@components/pdf-modal";
import { PDFPreview } from "@components/pdf-preview";
import { useCardAttachment } from "@hooks/card_attachment";
import {
  Card,
  CardAttachment,
  EnumAttachmentType,
  EnumCardAttachmentType,
} from "@myTypes/card";
import { FileUpload } from "@myTypes/file-upload";
import { User } from "@myTypes/user";
import { useBoardPermissionsContext } from "@providers/board-permissions-context";
import { printPDFWithQR } from "@utils/pdf-qr-utils";
import TokenStorage from "@utils/token-storage";
import { Button, Image, List, message, Space, Typography, Upload } from "antd";
import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import QRCode from "react-qr-code";
import { useParams } from "next/navigation";
import URLShortener from "@utils/url-shortener";
import AttachedCard from "./attached-card";

interface AttachmentsProps {
  card: Card;
  setCard: React.Dispatch<React.SetStateAction<Card | null>>;
  currentUser: User | null;
}

const Attachments: React.FC<AttachmentsProps> = (props) => {
  const { card, setCard, currentUser } = props;
  const [messageApi, contextHolder] = message.useMessage();
  const params = useParams();
  const workspaceId = Array.isArray(params.workspaceId)
    ? params.workspaceId[0]
    : params.workspaceId;
  const boardId = Array.isArray(params.boardId)
    ? params.boardId[0]
    : params.boardId;

  const cardListId =
    card?.listId || (card as any)?.list_id || (card as any)?.listId || "";

  const { cardAttachments, addAttachment, deleteAttachment } =
    useCardAttachment(card?.id || "", {
      listId: cardListId,
      boardId: boardId,
    });
  const [openUploadModal, setOpenUploadmodal] = useState<boolean>(false);
  const attachmentsRef = useRef<HTMLDivElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const [attachedCards, setAttachedCards] = useState<Card[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<FileUpload[]>([]);
  const [pdfModalVisible, setPdfModalVisible] = useState<boolean>(false);
  const [selectedPdf, setSelectedPdf] = useState<{
    url: string;
    fileName: string;
  } | null>(null);
  const { canUpdateCard } = useBoardPermissionsContext();
  // Generate short URL for QR codes with backend fallback
  const generateShortUrl = async (): Promise<string> => {
    console.log("🔍 QR Generation Debug - Card data:", {
      cardId: card?.id,
      shortId: card?.shortId,
      workspaceId,
      boardId,
      hasCard: !!card,
    });

    if (!workspaceId || !boardId || !card?.id) {
      console.log("❌ Missing required data, using fallback URL");
      return window.location.href; // Fallback to current URL
    }

    // First priority: Use card's shortId if available (new system)
    if (card.shortId) {
      const shortUrl = `${window.location.origin}/qr/${card.shortId}`;
      console.log("✅ Using card shortId for QR:", shortUrl);
      return shortUrl;
    }

    console.log("⚠️ No card.shortId found, trying backend generation...");

    try {
      // Second priority: Try backend short URL generation
      const originalUrl = `${window.location.origin}/workspace/${workspaceId}/board/${boardId}?cardId=${card.id}`;
      const response = await createShortUrl({ original_url: originalUrl });

      if (response.data?.short_code) {
        const backendUrl = buildShortUrl(response.data.short_code);
        console.log("✅ Using backend generated short URL:", backendUrl);
        return backendUrl;
      }
    } catch (error) {
      console.warn(
        "Backend short URL generation failed, falling back to stateless:",
        error
      );
    }

    // Final fallback: Use stateless URL shortener (legacy system)
    const legacyUrl = URLShortener.generateShortUrl(
      card.id,
      workspaceId,
      boardId,
      "stateless"
    );
    console.log("⚠️ Using legacy stateless URL shortener:", legacyUrl);
    return legacyUrl;
  };

  const handleOpenPdfModal = (url: string, fileName: string) => {
    setSelectedPdf({ url, fileName });
    setPdfModalVisible(true);
  };

  const handleClosePdfModal = () => {
    setPdfModalVisible(false);
    setSelectedPdf(null);
  };

  const handleCloseModal = () => {
    setOpenUploadmodal(false);
  };

  const handleOpenModal = () => {
    if (canUpdateCard()) {
      setOpenUploadmodal(true);
    }
  };

  const handleUpload = (file: File, result: FileUpload) => {
    const hasExistingFileAttachment = cardAttachments.some(
      (attachment) => attachment.attachableType === EnumAttachmentType.File
    );
    const shouldSetCover =
      !hasExistingFileAttachment && isImageFile(file.name, file.type);

    addAttachment({
      cardId: card.id || "",
      attachableType: EnumAttachmentType.File,
      attachableId: result.id,
      isCover: shouldSetCover,
    });

    if (shouldSetCover && result?.url) {
      setCard((prev) =>
        prev
          ? {
              ...prev,
              cover: result.url,
            }
          : prev
      );
    }
  };

  const isImageFile = (fileName: string, mimeType?: string): boolean => {
    const imageExtensions = ["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp"];
    const extension = fileName.split(".").pop()?.toLowerCase() || "";

    if (mimeType && mimeType.startsWith("image/")) {
      return true;
    }

    return imageExtensions.includes(extension);
  };

  const isPDFFile = (fileName: string, mimeType?: string): boolean => {
    const extension = fileName.split(".").pop()?.toLowerCase() || "";

    if (mimeType && mimeType === "application/pdf") {
      return true;
    }

    return extension === "pdf";
  };

  const getFileIcon = (fileName: string, mimeType?: string) => {
    if (isImageFile(fileName, mimeType)) {
      return <FileImageOutlined className="text-blue-500 text-2xl" />;
    }

    const extension = fileName.split(".").pop()?.toLowerCase();

    switch (extension) {
      case "pdf":
        return <FilePdfOutlined className="text-red-500 text-2xl" />;
      case "doc":
      case "docx":
        return <FileWordOutlined className="text-blue-700 text-2xl" />;
      case "xls":
      case "xlsx":
      case "csv":
        return <FileExcelOutlined className="text-green-600 text-2xl" />;
      case "zip":
      case "rar":
      case "7z":
        return <FileZipOutlined className="text-yellow-600 text-2xl" />;
      case "txt":
      case "rtf":
        return <FileTextOutlined className="text-gray-600 text-2xl" />;
      default:
        return <FileOutlined className="text-gray-500 text-2xl" />;
    }
  };

  // Helper functions to categorize attachments by type
  const getBuktiAttachments = () => {
    return (
      cardAttachments?.filter(
        (item) =>
          item.attachableType === EnumAttachmentType.File &&
          item.type === EnumCardAttachmentType.Bukti
      ) || []
    );
  };

  const getPOAttachments = () => {
    return (
      cardAttachments?.filter(
        (item) =>
          item.attachableType === EnumAttachmentType.File &&
          item.type === EnumCardAttachmentType.PO
      ) || []
    );
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return "";

    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const getBase64FromUrl = async (url: string): Promise<string> => {
    try {
      let fetchUrl = url;
      const headers: HeadersInit = {};

      if (url.includes(process.env.NEXT_PUBLIC_BE_BASE_URL || "")) {
        const accessToken = TokenStorage.getAccessToken();
        if (accessToken) {
          headers.Authorization = `Bearer ${accessToken}`;
        }
        fetchUrl = url;
      } else if (url.startsWith("/api/file-proxy/")) {
        const accessToken = TokenStorage.getAccessToken();
        if (accessToken) {
          headers.Authorization = `Bearer ${accessToken}`;
        }
        fetchUrl = url;
      } else if (
        url.startsWith("http") &&
        !url.includes(window.location.hostname)
      ) {
        fetchUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
      } else {
        fetchUrl = url;
      }

      const response = await fetch(
        fetchUrl,
        Object.keys(headers).length > 0 ? { headers } : {}
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }

      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      throw error;
    }
  };

  const handlePrintWithQR = async (imageUrl?: string, fileName?: string) => {
    if (!imageUrl) return;

    try {
      const loadingMsg = messageApi.loading("Preparing print view...", 0);
      if (!qrCanvasRef.current) {
        qrCanvasRef.current = document.createElement("canvas");
      }
      const canvas = qrCanvasRef.current;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        messageApi.error("Failed to create canvas context");
        loadingMsg();
        return;
      }

      const base64Image = await getBase64FromUrl(imageUrl);

      const img = document.createElement("img");
      img.crossOrigin = "anonymous";

      img.onload = async () => {
        const qrSize = Math.min(200, img.width * 0.35);
        const padding = 10;

        canvas.width = img.width;
        canvas.height = img.height;

        ctx.drawImage(img, 0, 0, img.width, img.height);
        const qrX = Math.floor(img.width * 0.3);
        const qrY = Math.floor(img.height * 0.005);

        ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
        ctx.fillRect(
          qrX - padding,
          qrY - padding,
          qrSize + padding * 2,
          qrSize + padding * 2
        );
        ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
        ctx.lineWidth = 1;
        ctx.strokeRect(
          qrX - padding,
          qrY - padding,
          qrSize + padding * 2,
          qrSize + padding * 2
        );

        const qrSvg = document.createElement("div");
        qrSvg.style.position = "absolute";
        qrSvg.style.top = "-9999px";
        qrSvg.style.left = "-9999px";
        document.body.appendChild(qrSvg);
        const qrElement = document.createElement("div");
        qrElement.style.width = `${qrSize}px`;
        qrElement.style.height = `${qrSize}px`;
        qrElement.style.position = "absolute";
        qrElement.style.top = "-9999px";
        qrElement.style.left = "-9999px";
        qrElement.style.background = "white";
        document.body.appendChild(qrElement);

        const shortUrl = await generateShortUrl();
        ReactDOM.render(
          <QRCode
            value={shortUrl}
            size={qrSize}
            level="M"
            fgColor="#000000"
            bgColor="#FFFFFF"
          />,
          qrElement
        );

        const svgElement = qrElement.querySelector("svg");
        if (!svgElement) {
          messageApi.error("Failed to generate QR code");
          document.body.removeChild(qrSvg);
          document.body.removeChild(qrElement);
          loadingMsg();
          return;
        }

        const svgData = new XMLSerializer().serializeToString(svgElement);
        const qrImg = document.createElement("img");
        qrImg.src =
          "data:image/svg+xml;base64," +
          btoa(unescape(encodeURIComponent(svgData)));

        qrImg.onload = () => {
          ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
          ctx.font = "bold 12px Arial";
          ctx.fillStyle = "black";
          ctx.textAlign = "center";

          const printFrame = document.createElement("iframe");
          printFrame.style.position = "fixed";
          printFrame.style.right = "-9999px";
          printFrame.style.bottom = "-9999px";
          printFrame.style.width = "0";
          printFrame.style.height = "0";
          printFrame.style.border = "0";
          document.body.appendChild(printFrame);

          const dataUrl = canvas.toDataURL("image/png");
          const printDocument = printFrame.contentWindow?.document;
          if (!printDocument) {
            messageApi.error("Failed to create print document");
            document.body.removeChild(printFrame);
            document.body.removeChild(qrSvg);
            document.body.removeChild(qrElement);
            loadingMsg();
            return;
          }

          printDocument.write(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>${fileName || "Image"} with QR Code</title>
              <style>
                @page {
                  margin: 0.5cm;
                }
                body {
                  margin: 0;
                  padding: 0;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  min-height: 100vh;
                }
                img {
                  max-width: 100%;
                  max-height: 100vh;
                  object-fit: contain;
                }
              </style>
            </head>
            <body>
              <img src="${dataUrl}" alt="${fileName || "Image"} with QR Code" />
            </body>
            </html>
          `);

          printDocument.close();

          const img = printDocument.querySelector("img");
          if (img) {
            img.onload = () => {
              setTimeout(() => {
                try {
                  printFrame.contentWindow?.focus();
                  printFrame.contentWindow?.print();
                  setTimeout(() => {
                    document.body.removeChild(printFrame);
                    document.body.removeChild(qrSvg);
                    document.body.removeChild(qrElement);
                    loadingMsg();
                  }, 1000);
                } catch (error) {
                  document.body.removeChild(printFrame);
                  document.body.removeChild(qrSvg);
                  document.body.removeChild(qrElement);
                  loadingMsg();
                  messageApi.error("Failed to open print dialog");
                }
              }, 500);
            };

            img.onerror = () => {
              document.body.removeChild(printFrame);
              document.body.removeChild(qrSvg);
              document.body.removeChild(qrElement);
              loadingMsg();
              messageApi.error("Failed to load image for printing");
            };
          } else {
            document.body.removeChild(printFrame);
            document.body.removeChild(qrSvg);
            document.body.removeChild(qrElement);
            loadingMsg();
            messageApi.error("Failed to prepare image for printing");
          }
        };

        qrImg.onerror = () => {
          messageApi.error("Failed to generate QR code");
          document.body.removeChild(qrSvg);
          document.body.removeChild(qrElement);
          loadingMsg();
        };
      };

      img.onerror = () => {
        messageApi.error("Failed to load image");
        loadingMsg();
      };

      img.src = base64Image;
    } catch (error) {
      messageApi.error("An error occurred during download");
    }
  };

  const handlePrintPDFWithQR = async (pdfUrl?: string, fileName?: string) => {
    if (!pdfUrl) {
      console.error("❌ PDF Print with QR: No PDF URL provided");
      messageApi.error("No PDF URL provided");
      return;
    }

    console.log("🖨️ PDF Print with QR started:", { pdfUrl, fileName });

    try {
      const loadingMsg = messageApi.loading("Preparing PDF with QR code...", 0);

      console.log("🔗 Generating short URL for QR code...");
      const qrText = await generateShortUrl();
      console.log("✅ QR text generated:", qrText);

      const token = TokenStorage.getAccessToken();
      const headers: HeadersInit = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
        console.log("🔐 Authorization header added");
      }

      console.log("📄 Calling printPDFWithQR utility...");
      await printPDFWithQR(
        pdfUrl,
        fileName || "document",
        qrText,
        {
          qrSize: 50,
          position: "custom",
          customX: 0.3, // 30% from left (same as JPEG)
          customY: 0.8, // 85% from bottom (15% from top)
          padding: 10,
        },
        headers
      );

      loadingMsg();
      console.log("✅ PDF with QR code prepared successfully");
      messageApi.success("PDF with QR code opened for printing");
    } catch (error) {
      console.error("❌ PDF Print with QR failed:", error);
      messageApi.error(
        `Failed to prepare PDF with QR code: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  const processFiles = async (files: File[]) => {
    if (!files.length) return;

    const loadingMsg = messageApi.loading("Uploading file...", 0);

    try {
      const filesToProcess = files.slice(0, 5);

      for (const file of filesToProcess) {
        try {
          const result = await uploadFile(file);

          if (result?.data) {
            handleUpload(file, result.data);
          } else {
            throw new Error("Upload failed");
          }
        } catch (error) {
            messageApi.error(`Failed to upload ${file.name}`);
        }
      }

      if (filesToProcess.length === 1) {
        messageApi.success(
          `File "${filesToProcess[0].name}" uploaded successfully`
        );
      } else {
        messageApi.success(
          `${filesToProcess.length} files uploaded successfully`
        );
      }

      if (files.length > 5) {
        messageApi.info(
          `Only the first 5 files were uploaded. Please upload the remaining ${
            files.length - 5
          } files separately.`
        );
      }
    } catch (error) {
      messageApi.error("Failed to upload files");
    } finally {
      loadingMsg();
    }
  };

  useEffect(() => {
    const handlePaste = async (e: Event) => {
      const event = e as ClipboardEvent;
      const items = event.clipboardData?.items;

      if (!items) return;
      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file) {
            files.push(file);
          }
        }
      }

      if (files.length > 0) {
        event.preventDefault();
        await processFiles(files);
      }
    };

    const attachmentsElement = attachmentsRef.current;
    if (attachmentsElement) {
      attachmentsElement.addEventListener("paste", handlePaste);
    }

    document.addEventListener("paste", handlePaste);
    return () => {
      if (attachmentsElement) {
        attachmentsElement.removeEventListener("paste", handlePaste);
      }
      document.removeEventListener("paste", handlePaste);
    };
  }, [card?.id]);

  useEffect(() => {
    let dragCounter = 0;

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!canUpdateCard()) {
        return;
      }

      dragCounter++;
      if (
        e.dataTransfer?.types.includes("Files") ||
        e.dataTransfer?.types.includes("application/x-moz-file")
      ) {
        setIsDraggingOver(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      dragCounter--;

      if (dragCounter === 0) {
        setIsDraggingOver(false);
      }
    };

    const handleFileDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      dragCounter = 0;
      setIsDraggingOver(false);
      if (!canUpdateCard()) {
        return;
      }

      if (!e.dataTransfer) return;

      const files: File[] = [];

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        for (let i = 0; i < e.dataTransfer.files.length; i++) {
          files.push(e.dataTransfer.files[i]);
        }

        if (files.length > 0) {
          await processFiles(files);
        }
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = "copy";
      }
    };

    const dragEnterHandler = (e: Event) => handleDragEnter(e as DragEvent);
    const dragLeaveHandler = (e: Event) => handleDragLeave(e as DragEvent);
    const dropHandler = (e: Event) => handleFileDrop(e as DragEvent);
    const dragOverHandler = (e: Event) => handleDragOver(e as DragEvent);

    document.addEventListener("dragenter", dragEnterHandler);
    document.addEventListener("dragleave", dragLeaveHandler);
    document.addEventListener("drop", dropHandler);
    document.addEventListener("dragover", dragOverHandler);
    return () => {
      document.removeEventListener("dragenter", dragEnterHandler);
      document.removeEventListener("dragleave", dragLeaveHandler);
      document.removeEventListener("drop", dropHandler);
      document.removeEventListener("dragover", dragOverHandler);
    };
  }, [card?.id]);

  useEffect(() => {
    if (!cardAttachments) {
      setAttachedCards([]);
      setAttachedFiles([]);
      return;
    }

    const nextAttachedCards: Card[] = [];
    const nextAttachedFiles: FileUpload[] = [];

    cardAttachments.forEach((item: CardAttachment) => {
      if (item.attachableType === EnumAttachmentType.Card && item.targetCard) {
        const mappedCard = mapBackendCardToFrontend(item.targetCard);
        nextAttachedCards.push(mappedCard as Card);
      } else if (item.attachableType === EnumAttachmentType.File && item.file) {
        nextAttachedFiles.push(item.file as FileUpload);
      }
    });

    setAttachedCards(nextAttachedCards);
    setAttachedFiles(nextAttachedFiles);

    // Find cover attachment and update card cover
    const cover = cardAttachments.find((item) => item.isCover);
    if (cover?.file?.url) {
      setCard((prev: Card | null) =>
        prev
          ? {
              ...prev,
              cover: cover.file?.url,
            }
          : null
      );
    }
  }, [cardAttachments, setCard]);

  // Reusable component for rendering attachment sections
  const AttachmentSection: React.FC<{
    title: string;
    attachments: CardAttachment[];
    emptyText?: string;
    sectionType?: "bukti" | "po" | "other";
  }> = ({
    title,
    attachments,
    emptyText = "No attachments yet",
    sectionType,
  }) => {
    if (attachments.length === 0) {
      return (
        <div className="mb-6">
          <div className="text-xs text-gray-500 font-medium uppercase mb-2">
            {title}
          </div>
          <div className="text-sm text-gray-400 italic">{emptyText}</div>
        </div>
      );
    }

    return (
      <div className="mb-6">
        <div className="text-xs text-gray-500 font-medium uppercase mb-2">
          {title}
        </div>
        <List
          className="space-y-3"
          dataSource={attachments}
          locale={{ emptyText }}
          renderItem={(item) => (
            <List.Item className="flex items-center p-2 hover:bg-gray-50 rounded">
              <div className="flex-shrink-0 mr-3 w-20 h-15 flex items-center justify-center">
                {isImageFile(item.file?.name || "", item.file?.mimeType) ? (
                  <div className="w-20 h-15 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
                    <Image
                      preview={{
                        toolbarRender: (
                          _,
                          {
                            transform: { scale },
                            actions: {
                              onRotateLeft,
                              onRotateRight,
                              onZoomOut,
                              onZoomIn,
                            },
                          }
                        ) => (
                          <Space size={12} className="toolbar-wrapper">
                            <Button onClick={onRotateLeft}>
                              <RotateLeftOutlined />
                            </Button>
                            <Button onClick={onRotateRight}>
                              <RotateRightOutlined />
                            </Button>
                            <Button onClick={onZoomOut}>
                              <ZoomOutOutlined />
                            </Button>
                            <Button onClick={onZoomIn}>
                              <ZoomInOutlined />
                            </Button>
                            {/* Print with QR button only for PO section */}
                            {sectionType === "po" && (
                              <Button
                                onClick={() => {
                                  document
                                    .querySelector(".ant-image-preview-close")
                                    ?.dispatchEvent(
                                      new MouseEvent("click", { bubbles: true })
                                    );
                                  setTimeout(() => {
                                    handlePrintWithQR(
                                      item.file?.url,
                                      item.file?.name || "image"
                                    );
                                  }, 100);
                                }}
                              >
                                <QrCode size={14} />
                              </Button>
                            )}
                          </Space>
                        ),
                      }}
                      src={item.file?.url}
                      alt={item.file?.name || "attachment"}
                      width={80}
                      height={60}
                      style={{ objectFit: "cover" }}
                    />
                  </div>
                ) : isPDFFile(item.file?.name || "", item.file?.mimeType) ? (
                  <div
                    className="w-20 h-15 overflow-hidden rounded cursor-pointer"
                    onClick={() =>
                      handleOpenPdfModal(
                        item.file?.url || "",
                        item.file?.name || "PDF Document"
                      )
                    }
                  >
                    <PDFPreview
                      url={item.file?.url || ""}
                      fileName={item.file?.name}
                    />
                  </div>
                ) : (
                  <div className="w-20 h-15 bg-gray-100 rounded flex items-center justify-center">
                    {getFileIcon(item.file?.name || "", item.file?.mimeType)}
                  </div>
                )}
              </div>

              <div className="flex-grow min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex-grow min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.file?.name || "Unnamed file"}
                    </p>
                    <div className="flex items-center text-xs text-gray-500 space-x-2">
                      <span>{formatFileSize(item.file?.size)}</span>
                      {item.file?.mimeType && (
                        <>
                          <span>•</span>
                          <span>{item.file.mimeType}</span>
                        </>
                      )}
                      {item.createdAt && (
                        <>
                          <span>•</span>
                          <span>
                            {new Date(item.createdAt).toLocaleDateString()}
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
                      onClick={() => {
                        if (item.file?.url) {
                          const link = document.createElement("a");
                          link.href = item.file.url;
                          link.download = item.file.name || "download";
                          link.target = "_blank";
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }
                      }}
                      className="text-gray-500 hover:text-blue-600"
                    />

                    {/* Print with QR for image files in PO section only */}
                    {sectionType === "po" &&
                      isImageFile(
                        item.file?.name || "",
                        item.file?.mimeType
                      ) && (
                        <Button
                          type="text"
                          size="small"
                          icon={<QrCode size={14} />}
                          onClick={() =>
                            handlePrintWithQR(
                              item.file?.url,
                              item.file?.name || "image"
                            )
                          }
                          className="text-gray-500 hover:text-green-600"
                        />
                      )}

                    {/* Print with QR for PDF files in PO section only */}
                    {sectionType === "po" &&
                      isPDFFile(item.file?.name || "", item.file?.mimeType) && (
                        <Button
                          type="text"
                          size="small"
                          icon={<QrCode size={14} />}
                          onClick={() =>
                            handlePrintPDFWithQR(
                              item.file?.url,
                              item.file?.name || "PDF"
                            )
                          }
                          className="text-gray-500 hover:text-green-600"
                        />
                      )}

                    {canUpdateCard() && (
                      <Button
                        type="text"
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() =>
                          deleteAttachment({
                            attachmentId: item.id,
                            cardId: card.id || "",
                          })
                        }
                        className="text-gray-500 hover:text-red-600"
                      />
                    )}
                  </div>
                </div>
              </div>
            </List.Item>
          )}
        />
      </div>
    );
  };

  return (
    <>
      {contextHolder}
      <div
        className="bg-white p-4 rounded-lg mt-2"
        ref={attachmentsRef}
        tabIndex={0}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <PaperClipOutlined className="text-gray-500 mr-2" />
            <Typography.Title level={5} className="m-0">
              Attachments
            </Typography.Title>
          </div>
          <Button
            type="default"
            size="small"
            icon={<PlusOutlined />}
            className={`flex items-center ${
              !canUpdateCard() ? "opacity-50 cursor-not-allowed" : ""
            }`}
            onClick={handleOpenModal}
            disabled={!canUpdateCard()}
          >
            Add
          </Button>
        </div>

        {/* Other Files Section */}
        <AttachmentSection
          title="All Files"
          attachments={
            cardAttachments?.filter(
              (item) => item.attachableType === EnumAttachmentType.File
            ) || []
          }
          emptyText="No attachments yet"
          sectionType="other"
        />

        {/* Cards Section */}
        {attachedCards.length > 0 && (
          <>
            <div className="text-xs text-gray-500 font-medium uppercase mt-4 mb-2">
              Cards
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 auto-rows-max">
              {attachedCards.map((attachedCard) => {
                // Find the corresponding attachment to get the attachment ID for deletion
                const attachment = cardAttachments?.find(
                  (att) => att.targetCard?.id === attachedCard.id
                );

                return (
                  <AttachedCard
                    key={attachedCard.id}
                    card={attachedCard}
                    onDelete={
                      attachment
                        ? () =>
                            deleteAttachment({
                              attachmentId: attachment.id,
                              cardId: card.id || "",
                            })
                        : undefined
                    }
                  />
                );
              })}
            </div>
          </>
        )}

        <UploadModal
          isVisible={openUploadModal}
          onClose={handleCloseModal}
          onUploadComplete={handleUpload}
          uploadType="all"
          title="Upload attachment"
        />
      </div>

      {/* Overlay for drag and drop */}
      {isDraggingOver && (
        <div className="fixed inset-0 bg-blue-500 bg-opacity-10 z-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-lg text-center">
            <Upload.Dragger
              className="border-dashed border-2 border-blue-500 p-8 rounded-lg"
              showUploadList={false}
              customRequest={({ file, onSuccess }) => {
                // This is just a placeholder to make the component work
                // The actual upload is handled by the drop event listeners
                setTimeout(() => {
                  onSuccess?.({}, new XMLHttpRequest());
                }, 0);
              }}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined style={{ fontSize: "48px", color: "#1890ff" }} />
              </p>
              <p className="ant-upload-text text-lg font-medium">
                Drop files here to upload
              </p>
              <p className="ant-upload-hint text-gray-500">
                Support for single or bulk upload
              </p>
            </Upload.Dragger>
          </div>
        </div>
      )}

      {/* PDF Modal */}
      <PDFModal
        isOpen={pdfModalVisible}
        onClose={handleClosePdfModal}
        url={selectedPdf?.url || ""}
        fileName={selectedPdf?.fileName || "PDF Document"}
      />
    </>
  );
};

export default Attachments;
