import React, { useEffect, useState, useRef } from "react";
import ReactDOM from "react-dom";
import { Avatar, Button, Image, List, Typography, message, Space, Upload } from "antd";
import {
  DownloadOutlined,
  PrinterOutlined,
  RotateLeftOutlined,
  RotateRightOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  InboxOutlined,
  ExportOutlined,
  EllipsisOutlined,
  PaperClipOutlined,
  PlusOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FileZipOutlined,
  FileTextOutlined,
  FileOutlined,
  QrcodeOutlined,
} from "@ant-design/icons";
import { useCardAttachment } from "@/app/hooks/card_attachment";
import UploadModal from "@/app/components/modal-upload/modal-upload";
import { EnumAttachmentType, Card, CardAttachment } from "@/app/types/card";
import { User } from "@/app/types/user";
import { FileUpload } from "@/app/types/file-upload";
import QRCode from "react-qr-code";
import { uploadFile } from "@/app/api/file";

interface AttachmentsProps {
  card: Card;
  setCard: React.Dispatch<React.SetStateAction<Card | null>>;
  currentUser: User | null;
}

const Attachments: React.FC<AttachmentsProps> = (props) => {
  const { card, setCard, currentUser } = props;
  const { cardAttachments, addAttachment } = useCardAttachment(card?.id);
  const [openUploadModal, setOpenUploadmodal] = useState<boolean>(false);
  const attachmentsRef = useRef<HTMLDivElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const [attachedCards, setAttachedCards] = useState<Card[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<FileUpload[]>([]);
  const handleCloseModal = () => {
    setOpenUploadmodal(false);
  };

  const handleOpenModal = () => {
    setOpenUploadmodal(true);
  };

  const handleUpload = (file: File, result: FileUpload) => {
    addAttachment({
      cardId: card.id,
      attachableType: EnumAttachmentType.File,
      attachableId: result.id,
      isCover: false,
    });
  };

  // Helper function to determine if a file is an image based on file name or MIME type
  const isImageFile = (fileName: string, mimeType?: string): boolean => {
    const imageExtensions = ["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp"];
    const extension = fileName.split(".").pop()?.toLowerCase() || "";

    if (mimeType && mimeType.startsWith("image/")) {
      return true;
    }

    return imageExtensions.includes(extension);
  };

  // Helper function to get appropriate file icon based on file extension
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

  // Format file size
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return "";

    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  // Canvas reference for generating QR code images
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Function to open image with QR code in print dialog
  const handlePrintWithQR = async (imageUrl?: string, fileName?: string) => {
    if (!imageUrl) return;

    try {
      // Show loading message
      const loadingMsg = message.loading("Preparing print view...", 0);

      // Create a canvas element if it doesn't exist
      if (!qrCanvasRef.current) {
        qrCanvasRef.current = document.createElement("canvas");
      }
      const canvas = qrCanvasRef.current;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        message.error("Failed to create canvas context");
        loadingMsg();
        return;
      }

      // Load the image
      const img = document.createElement("img");
      img.crossOrigin = "anonymous"; // Enable CORS

      img.onload = () => {
        // Set canvas dimensions (same as original image)
        const qrSize = Math.min(200, img.width * 0.35); // QR code size (35% of image width, max 200px)
        const padding = 10; // Padding around QR code

        canvas.width = img.width;
        canvas.height = img.height;

        // Draw original image
        ctx.drawImage(img, 0, 0, img.width, img.height);

        // Calculate QR code position (30% from left, 10% from top)
        const qrX = Math.floor(img.width * 0.3);
        const qrY = Math.floor(img.height * 0.1);

        // Draw white background for QR code with slight transparency
        ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
        ctx.fillRect(
          qrX - padding,
          qrY - padding,
          qrSize + padding * 2,
          qrSize + padding * 2
        );

        // Add border around QR code
        ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
        ctx.lineWidth = 1;
        ctx.strokeRect(
          qrX - padding,
          qrY - padding,
          qrSize + padding * 2,
          qrSize + padding * 2
        );

        // Create QR code SVG
        const qrSvg = document.createElement("div");
        qrSvg.style.position = "absolute";
        qrSvg.style.top = "-9999px";
        qrSvg.style.left = "-9999px";
        document.body.appendChild(qrSvg);

        // Create QR code element
        const qrElement = document.createElement("div");
        qrElement.style.width = `${qrSize}px`;
        qrElement.style.height = `${qrSize}px`;
        qrElement.style.position = "absolute";
        qrElement.style.top = "-9999px";
        qrElement.style.left = "-9999px";
        qrElement.style.background = "white";
        document.body.appendChild(qrElement);

        // Render QR code
        ReactDOM.render(
          <QRCode
            value={window.location.href}
            size={qrSize}
            level="M"
            fgColor="#000000"
            bgColor="#FFFFFF"
          />,
          qrElement
        );

        // Convert SVG to image
        const svgElement = qrElement.querySelector("svg");
        if (!svgElement) {
          message.error("Failed to generate QR code");
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
          // Draw QR code on canvas
          ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

          // Add small label for QR code
          ctx.font = "bold 12px Arial";
          ctx.fillStyle = "black";
          ctx.textAlign = "center";
          ctx.fillText(
            "Scan to view",
            qrX + qrSize / 2,
            qrY + qrSize + padding + 12
          );

          // Create a hidden iframe for printing
          const printFrame = document.createElement("iframe");
          printFrame.style.position = "fixed";
          printFrame.style.right = "-9999px";
          printFrame.style.bottom = "-9999px";
          printFrame.style.width = "0";
          printFrame.style.height = "0";
          printFrame.style.border = "0";
          document.body.appendChild(printFrame);

          // Convert canvas to data URL
          const dataUrl = canvas.toDataURL("image/png");

          // Set up the print frame content
          const printDocument = printFrame.contentWindow?.document;
          if (!printDocument) {
            message.error("Failed to create print document");
            document.body.removeChild(printFrame);
            document.body.removeChild(qrSvg);
            document.body.removeChild(qrElement);
            loadingMsg();
            return;
          }

          // Write the content to the iframe
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

          // Wait for the image to load before printing
          const img = printDocument.querySelector("img");
          if (img) {
            img.onload = () => {
              // Short delay to ensure everything is loaded
              setTimeout(() => {
                try {
                  // Focus the iframe and print
                  printFrame.contentWindow?.focus();
                  printFrame.contentWindow?.print();

                  // Clean up after printing (with delay to ensure print dialog opens)
                  setTimeout(() => {
                    document.body.removeChild(printFrame);
                    document.body.removeChild(qrSvg);
                    document.body.removeChild(qrElement);
                    loadingMsg();
                    message.success("Print dialog opened");
                  }, 1000);
                } catch (error) {
                  console.error("Print error:", error);
                  document.body.removeChild(printFrame);
                  document.body.removeChild(qrSvg);
                  document.body.removeChild(qrElement);
                  loadingMsg();
                  message.error("Failed to open print dialog");
                }
              }, 500);
            };

            img.onerror = () => {
              document.body.removeChild(printFrame);
              document.body.removeChild(qrSvg);
              document.body.removeChild(qrElement);
              loadingMsg();
              message.error("Failed to load image for printing");
            };
          } else {
            document.body.removeChild(printFrame);
            document.body.removeChild(qrSvg);
            document.body.removeChild(qrElement);
            loadingMsg();
            message.error("Failed to prepare image for printing");
          }
        };

        qrImg.onerror = () => {
          message.error("Failed to generate QR code");
          document.body.removeChild(qrSvg);
          document.body.removeChild(qrElement);
          loadingMsg();
        };
      };

      img.onerror = () => {
        message.error("Failed to load image");
        loadingMsg();
      };

      img.src = imageUrl;
    } catch (error) {
      message.error("An error occurred during download");
      console.error("Download error:", error);
    }
  };

  // Process files for upload (used by both paste and Upload component)
  const processFiles = async (files: File[]) => {
    if (!files.length) return;

    // Show loading message
    const loadingMsg = message.loading("Uploading file...", 0);

    try {
      // Process each file (up to 5 at a time to avoid overwhelming the server)
      const filesToProcess = files.slice(0, 5);

      for (const file of filesToProcess) {
        try {
          // Use the uploadFile function from your API
          const result = await uploadFile(file);

          if (result?.data) {
            // Call the same handler that's used by the upload modal
            handleUpload(file, result.data);
          } else {
            throw new Error("Upload failed");
          }
        } catch (error) {
          console.error("Upload error for file", file.name, error);
          message.error(`Failed to upload ${file.name}`);
        }
      }

      if (filesToProcess.length === 1) {
        message.success(
          `File "${filesToProcess[0].name}" uploaded successfully`
        );
      } else {
        message.success(`${filesToProcess.length} files uploaded successfully`);
      }

      // If there were more files than we processed, show a message
      if (files.length > 5) {
        message.info(
          `Only the first 5 files were uploaded. Please upload the remaining ${
            files.length - 5
          } files separately.`
        );
      }
    } catch (error) {
      message.error("Failed to upload files");
      console.error("Upload error:", error);
    } finally {
      // Always close the loading message
      loadingMsg();
    }
  };

  // Handle paste events for file uploads
  useEffect(() => {
    const handlePaste = async (e: Event) => {
      // Cast to ClipboardEvent to access clipboard data
      const event = e as ClipboardEvent;
      const items = event.clipboardData?.items;

      if (!items) return;

      // Collect all files from the clipboard data
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
        // Prevent the default paste behavior
        event.preventDefault();
        // Process the files
        await processFiles(files);
      }
    };

    // Add the paste event listener to the attachments container
    const attachmentsElement = attachmentsRef.current;
    if (attachmentsElement) {
      attachmentsElement.addEventListener("paste", handlePaste);
    }

    // Also add to document to catch pastes anywhere on the page
    document.addEventListener("paste", handlePaste);

    // Cleanup function
    return () => {
      if (attachmentsElement) {
        attachmentsElement.removeEventListener("paste", handlePaste);
      }
      document.removeEventListener("paste", handlePaste);
    };
  }, [card?.id]);

  // Handle file drops anywhere on the card
  useEffect(() => {
    // Track drag enter/leave with a counter to handle nested elements
    let dragCounter = 0;

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Increment counter on drag enter
      dragCounter++;

      // Only set isDraggingOver to true if we have files
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

      // Decrement counter on drag leave
      dragCounter--;

      // Only set isDraggingOver to false when counter reaches 0
      if (dragCounter === 0) {
        setIsDraggingOver(false);
      }
    };

    const handleFileDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Reset drag state
      dragCounter = 0;
      setIsDraggingOver(false);

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

    // Create wrapper functions to handle type conversion properly
    const dragEnterHandler = (e: Event) => handleDragEnter(e as DragEvent);
    const dragLeaveHandler = (e: Event) => handleDragLeave(e as DragEvent);
    const dropHandler = (e: Event) => handleFileDrop(e as DragEvent);
    const dragOverHandler = (e: Event) => handleDragOver(e as DragEvent);

    // Add event listeners to the document
    document.addEventListener("dragenter", dragEnterHandler);
    document.addEventListener("dragleave", dragLeaveHandler);
    document.addEventListener("drop", dropHandler);
    document.addEventListener("dragover", dragOverHandler);

    // Cleanup
    return () => {
      document.removeEventListener("dragenter", dragEnterHandler);
      document.removeEventListener("dragleave", dragLeaveHandler);
      document.removeEventListener("drop", dropHandler);
      document.removeEventListener("dragover", dragOverHandler);
    };
  }, [card?.id]);

  useEffect(() => {
    if (cardAttachments) {
      // Clear previous state to avoid duplications on re-renders
      setAttachedCards([]);
      setAttachedFiles([]);
      
      // Process all attachments
      cardAttachments.forEach((item: CardAttachment) => {
        if (item.attachableType === EnumAttachmentType.Card) {
          if (item.targetCard !== undefined) {
            setAttachedCards((prev) => [...prev, item.targetCard as Card]);
          }
        } else if (item.attachableType === EnumAttachmentType.File) {
          if (item.file !== undefined) {
            setAttachedFiles((prev) => [...prev, item.file as FileUpload]);
          }
        }
      });
      
      // Find cover attachment and update card cover
      const cover = cardAttachments?.find((item) => item.isCover);
      if (cover?.file?.url) {
        setCard((prev: Card | null) =>
          prev
            ? {
                ...prev,
                cover: cover?.file?.url,
              }
            : null
        );
      }
    }
  }, [cardAttachments, setCard]);

  return (
    <>
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
            className="flex items-center"
            onClick={handleOpenModal}
          >
            Add
          </Button>
        </div>

        <div className="text-xs text-gray-500 font-medium uppercase mb-2">
          Files
        </div>
        <List
          className="space-y-3"
          dataSource={cardAttachments?.filter(item => item.attachableType === EnumAttachmentType.File)}
          locale={{ emptyText: "No attachments yet" }}
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
                              <PrinterOutlined />
                            </Button>
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
                ) : (
                  <div className="w-20 h-15 bg-gray-100 rounded flex items-center justify-center">
                    {getFileIcon(item.file?.name || "", item.file?.mimeType)}
                  </div>
                )}
              </div>
              
              <div className="flex-grow">
                <div className="text-sm font-medium">{item.file?.name}</div>
                <div className="text-xs text-gray-500 flex items-center space-x-2">
                  <span>{formatFileSize(item.file?.size)}</span>
                  {item.file?.mimeType && <span>•</span>}
                  <span>{item.file?.mimeType}</span>
                  {item.isCover && (
                    <span className="bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded">
                      Cover
                    </span>
                  )}
                </div>
              </div>

              <div className="flex-shrink-0 flex space-x-1">
                {isImageFile(item.file?.name || "", item.file?.mimeType) ? (
                  <>
                    <Button
                      icon={<DownloadOutlined />}
                      size="small"
                      title="Download Original"
                      onClick={() => window.open(item.file?.url, "_blank")}
                      className="flex items-center justify-center border-0 shadow-none"
                    />
                    <Button
                      icon={<PrinterOutlined />}
                      size="small"
                      title="Print with QR Code"
                      onClick={() =>
                        handlePrintWithQR(
                          item.file?.url,
                          item.file?.name || "image"
                        )
                      }
                      className="flex items-center justify-center border-0 shadow-none"
                    />
                  </>
                ) : (
                  <Button
                    icon={<ExportOutlined />}
                    size="small"
                    title="Download"
                    onClick={() => window.open(item.file?.url, "_blank")}
                    className="flex items-center justify-center border-0 shadow-none"
                  />
                )}
                <Button
                  icon={<EllipsisOutlined />}
                  size="small"
                  title="More options"
                  className="flex items-center justify-center border-0 shadow-none"
                />
              </div>
            </List.Item>
          )}
        />
        
        {/* Cards Section */}
        {attachedCards.length > 0 && (
          <>
            <div className="text-xs text-gray-500 font-medium uppercase mt-4 mb-2">
              Cards
            </div>
            <List
              className="space-y-3"
              dataSource={attachedCards}
              locale={{ emptyText: "No attached cards yet" }}
              renderItem={(item) => (
                <List.Item className="flex items-center hover:bg-gray-50 rounded">
                  <div className="flex-shrink-0 mr-3 w-20 h-10 flex items-center justify-center">
                    {item.cover ? (
                      <img 
                        src={item.cover} 
                        alt={item.name} 
                        className="w-20 h-15 object-cover rounded"
                      />
                    ) : (
                      <div className="flex justify-center items-center w-20 h-10 rounded bg-gray-200">
                        <Avatar shape="square" src={`https://ui-avatars.com/api/?name=${item?.name}&background=random`}></Avatar>
                      </div>
                    )}
                  </div>
                
                  <div className="flex-grow">
                    <div className="text-sm font-medium">{item.name}</div>
                    <div className="text-xs text-gray-500 flex items-center space-x-2">
                      <div className="prose prose-sm max-w-none text-[10px]" dangerouslySetInnerHTML={{ __html: item.description || '' }} />
                    </div>
                  </div>
                
                  <div className="flex-shrink-0 flex space-x-1">
                    <Button 
                      icon={<ExportOutlined />} 
                      size="small" 
                      title="Download"
                      onClick={() => window.open(item.cover, '_blank')}
                      className="flex items-center justify-center border-0 shadow-none"
                    />
                    <Button 
                      icon={<EllipsisOutlined />} 
                      size="small" 
                      title="More options"
                      className="flex items-center justify-center border-0 shadow-none"
                    />
                  </div>
                </List.Item>
              )}
            />
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
                <InboxOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
              </p>
              <p className="ant-upload-text text-lg font-medium">Drop files here to upload</p>
              <p className="ant-upload-hint text-gray-500">
                Support for single or bulk upload
              </p>
            </Upload.Dragger>
          </div>
        </div>
      )}
    </>
  );
};

export default Attachments;
