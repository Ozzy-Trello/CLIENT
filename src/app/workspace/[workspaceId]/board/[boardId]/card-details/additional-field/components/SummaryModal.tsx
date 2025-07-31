import React, { useState } from "react";
import { Modal, Table, Tabs, Button, message } from "antd";
import { QrcodeOutlined } from "@ant-design/icons";
import { useCardDetailContext } from "@providers/card-detail-context";
import QRCode from "react-qr-code";
import { createRoot } from "react-dom/client";
import { useAdditionalFieldsStore } from "@store/additional-fields-store";

interface SummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  poIndex: number;
  poData: any;

  poId?: string | null; // Allow null as well
  lastRefetchTime?: number; // Add timestamp for debugging refetch
}

interface SummaryItem {
  key: string;
  productName: string;
  uniqueId: string; // Keep full format for backend
  displayId: string; // Readable format for UI (e.g., "XXXXL-1")
  size: string;
  scanned: string;
}

interface QRItem {
  key: string;
  qrValue: string;
  uniqueId: string;
  displayId: string; // Readable format for QR label
  productName: string;
  size: string;
}

const SummaryModal: React.FC<SummaryModalProps> = ({
  isOpen,
  onClose,
  poIndex,
  poData,
  poId, // Add poId parameter
  lastRefetchTime, // Add lastRefetchTime parameter
}): JSX.Element => {
  const [activeTab, setActiveTab] = useState<string>("all");
  const { selectedCard } = useCardDetailContext();

  // Access store data for total PO count and all PO data
  const { qty: totalPOCount, data: allPOData } = useAdditionalFieldsStore();

  // Sticker dimensions constants
  const stickerWidth = 566.92;
  const stickerHeight = 283.46;
  const pageWidth = stickerWidth * 3; // 3 stickers side by side

  // Generate QR data for printing
  const generateQRData = (): QRItem[] => {
    const qrItems: QRItem[] = [];
    const cardId = selectedCard?.id;

    if (!cardId) {
      console.error("No card ID available for QR generation");
      return qrItems;
    }

    if (!poId) {
      console.error("No PO ID available for QR generation");
      return qrItems;
    }

    const summaryData = generateSummaryData();

    console.log("=== QR GENERATION DEBUG ===");
    console.log("Summary data:", summaryData);
    console.log("PO ID:", poId);
    console.log("Card ID:", cardId);

    summaryData.forEach((item) => {
      // Parse the uniqueId to extract components: PO1-Polo-TPJ-M-001
      const uniqueIdParts = item.uniqueId.split("-");
      console.log(`Processing item: ${item.uniqueId}`, uniqueIdParts);

      if (uniqueIdParts.length >= 5) {
        const poNumber = uniqueIdParts[0]; // PO1
        const categoryLabel = uniqueIdParts[1]; // Polo
        const fieldKey = uniqueIdParts[2]; // TPJ
        const size = uniqueIdParts[3]; // M
        const sequenceNumber = uniqueIdParts[4]; // 001

        // Create the backend expected format: itemId-tabLabel-fieldLabel-size-uniqueId-poIdentifier
        // Use the actual PO ID from the Zustand store instead of fake item ID
        const itemId = poId; // Use actual PO ID
        const tabLabel = categoryLabel.toLowerCase(); // polo
        const fieldLabel = fieldKey.toLowerCase(); // tpj
        const poIdentifier = poNumber.replace("PO", ""); // 1

        const backendFormat = `${itemId}-${tabLabel}-${fieldLabel}-${size}-${sequenceNumber}-${poIdentifier}`;

        // Create QR value in the format: cardId|backendFormat|action
        const qrValue = `${cardId}|${backendFormat}|mark_complete`;

        console.log(`Generated QR for ${item.uniqueId}:`, {
          poNumber,
          categoryLabel,
          fieldKey,
          size,
          sequenceNumber,
          itemId,
          tabLabel,
          fieldLabel,
          poIdentifier,
          backendFormat,
          qrValue,
        });

        qrItems.push({
          key: item.key,
          qrValue,
          uniqueId: item.uniqueId,
          displayId: item.displayId, // Add displayId for QR label
          productName: item.productName,
          size: item.size,
        });
      } else {
        console.warn("Invalid uniqueId format:", item.uniqueId);
      }
    });

    console.log("=== END QR GENERATION DEBUG ===");

    console.log("Generated QR items:", qrItems);
    return qrItems;
  };

  // Generate QR canvas for printing using actual QR codes
  const generateQRCanvas = async (
    qrValue: string,
    size: number
  ): Promise<HTMLCanvasElement> => {
    return new Promise((resolve) => {
      // Create a temporary div to render the QR code
      const tempDiv = document.createElement("div");
      tempDiv.style.position = "absolute";
      tempDiv.style.left = "-9999px";
      tempDiv.style.top = "-9999px";
      tempDiv.style.background = "white";
      document.body.appendChild(tempDiv);

      // Create QR code using react-qr-code
      const qrContainer = document.createElement("div");
      qrContainer.innerHTML = `
        <div id="qr-temp" style="background: white; padding: 0;">
        </div>
      `;
      tempDiv.appendChild(qrContainer);

      try {
        // Use the QRCode component to generate SVG
        const root = createRoot(qrContainer.querySelector("#qr-temp")!);

        const QRElement = React.createElement(QRCode, {
          value: qrValue,
          size: size,
          bgColor: "#FFFFFF",
          fgColor: "#000000",
          level: "M",
        });

        root.render(QRElement);

        // Wait for render and convert to canvas
        setTimeout(() => {
          const svgElement = qrContainer.querySelector("svg");
          if (svgElement) {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            if (ctx) {
              canvas.width = size;
              canvas.height = size;

              const svgData = new XMLSerializer().serializeToString(svgElement);
              const img = new Image();

              img.onload = () => {
                ctx.fillStyle = "#FFFFFF";
                ctx.fillRect(0, 0, size, size);
                ctx.drawImage(img, 0, 0, size, size);

                document.body.removeChild(tempDiv);
                resolve(canvas);
              };

              img.onerror = () => {
                document.body.removeChild(tempDiv);
                resolve(canvas);
              };

              img.src =
                "data:image/svg+xml;base64," +
                btoa(unescape(encodeURIComponent(svgData)));
            } else {
              document.body.removeChild(tempDiv);
              resolve(document.createElement("canvas"));
            }
          } else {
            document.body.removeChild(tempDiv);
            resolve(document.createElement("canvas"));
          }
        }, 100);
      } catch (error) {
        console.error("QR generation error:", error);
        document.body.removeChild(tempDiv);
        resolve(document.createElement("canvas"));
      }
    });
  };

  // Generate print page with QR codes (3 items per page like the reference)
  const generatePrintPage = async (
    items: QRItem[]
  ): Promise<HTMLCanvasElement> => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) throw new Error("Failed to get canvas context");

    // Use the constants defined at component level
    const pageHeight = stickerHeight; // Single row height

    canvas.width = pageWidth;
    canvas.height = pageHeight;

    // White background
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, pageWidth, pageHeight);

    // Layout: 3 stickers horizontally (3 columns, 1 row)
    const itemsPerPage = 3;

    // QR code size - adjusted for balance
    const qrSize = stickerHeight * 0.65; // Make QR smaller for more gap

    const qrPromises = items
      .slice(0, itemsPerPage)
      .map((item) => generateQRCanvas(item.qrValue, qrSize));
    const qrCodes = await Promise.all(qrPromises);

    items.slice(0, itemsPerPage).forEach((item, index) => {
      const x = index * stickerWidth;
      const y = 0;

      // Draw vertical separator between stickers
      if (index > 0) {
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + stickerHeight);
        ctx.stroke();
      }

      // --- Top Section: QR Code and Text ---
      const topSectionHeight = stickerHeight * 0.75; // Reverted to original
      const padding = 80; // Further increased padding for more left margin

      // QR Code (Left)
      const qrX = x + padding;
      const qrY = y + (topSectionHeight - qrSize) / 2; // Center QR in the top section
      if (qrCodes[index]) {
        ctx.drawImage(qrCodes[index], qrX, qrY, qrSize, qrSize);
      }

      // Text (Right)
      const textBlockX = qrX + qrSize + padding;
      const textBlockWidth = stickerWidth - qrSize - 3 * padding; // Adjusted for 3 paddings
      const textBlockCenterX = textBlockX + textBlockWidth / 2;

      ctx.fillStyle = "#000000";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle"; // Align text vertically to the middle

      const summaryData = generateQRData();
      const totalOfThisSize = summaryData.filter(
        (si) => si.size === item.size
      ).length;
      const totalAllSizes = summaryData.length;
      const fieldKey =
        item.uniqueId.split("-")[2]?.replace("POLO", "") || "TPJ";
      const currentPO = poIndex + 1;

      // --- Vertically center the text block ---
      const fontSize = 32; // Increased font size
      const lineHeight = 40; // Increased line height
      const textBlockCenterY = y + topSectionHeight / 2;

      const line1Y = textBlockCenterY - lineHeight;
      const line2Y = textBlockCenterY;
      const line3Y = textBlockCenterY + lineHeight;

      // Line 1: Size
      ctx.font = `bold ${fontSize}px Arial`;
      const line1 = `${item.size} ${totalOfThisSize} (${item.displayId
        .split("-")
        .pop()})`;
      ctx.fillText(line1, textBlockCenterX, line1Y, textBlockWidth);

      // Line 2: TPJ
      ctx.font = `bold ${fontSize}px Arial`;
      const line2 = `${fieldKey} - ${currentPO}/${totalPOCount}`;
      ctx.fillText(line2, textBlockCenterX, line2Y, textBlockWidth);

      // Line 3: PCS
      ctx.font = `bold ${fontSize}px Arial`;
      const line3 = `${totalAllSizes} PCS`;
      ctx.fillText(line3, textBlockCenterX, line3Y, textBlockWidth);

      // Reset baseline for other drawing operations if needed
      ctx.textBaseline = "alphabetic";

      // --- Bottom Section: Separator and Name ---
      const separatorY = y + topSectionHeight;

      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, separatorY);
      ctx.lineTo(x + stickerWidth, separatorY);
      ctx.stroke();

      ctx.font = "bold 25px Arial"; // Increased font size and bold
      ctx.textAlign = "center";
      const cardName = selectedCard?.name || item.productName;
      const bottomTextX = x + stickerWidth / 2;
      const bottomTextY =
        separatorY + (stickerHeight - topSectionHeight) / 2 + 8;
      ctx.fillText(cardName, bottomTextX, bottomTextY);
    });

    return canvas;
  };

  // Handle Generate QR button click
  const handleGenerateQR = async () => {
    try {
      message.loading("Generating QR codes...", 0);

      const qrItems = generateQRData();

      if (qrItems.length === 0) {
        message.error("No items to generate QR codes for");
        return;
      }

      const pages: HTMLCanvasElement[] = [];

      // Generate pages (3 items per page)
      for (let i = 0; i < qrItems.length; i += 3) {
        const pageItems = qrItems.slice(i, i + 3);
        const page = await generatePrintPage(pageItems);
        pages.push(page);
      }

      // Create print window
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        message.error("Please allow popups to print QR codes");
        return;
      }

      const printHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>QR Codes - PO ${poIndex + 1}</title>
          <style>
            @page {
              size: ${pageWidth}px ${stickerHeight}px;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              background: white;
              font-family: Arial, sans-serif;
            }
            .page {
              page-break-after: always;
              width: ${pageWidth}px;
              height: ${stickerHeight}px;
              margin: 0;
              padding: 0;
            }
            .page:last-child {
              page-break-after: avoid;
            }
            img {
              width: ${pageWidth}px;
              height: ${stickerHeight}px;
              display: block;
            }
            @media print {
              body {
                margin: 0;
                padding: 0;
              }
              .page {
                page-break-after: always;
                margin: 0;
                padding: 0;
                width: ${pageWidth}px;
                height: ${stickerHeight}px;
              }
              img {
                width: ${pageWidth}px;
                height: ${stickerHeight}px;
              }
            }
          </style>
        </head>
        <body>
          ${pages
            .map(
              (page, index) => `
            <div class="page">
              <img src="${page.toDataURL("image/png")}" alt="QR Codes Page ${
                index + 1
              }" />
            </div>
          `
            )
            .join("")}
        </body>
        </html>
      `;

      printWindow.document.write(printHTML);
      printWindow.document.close();

      // Auto-print after a short delay
      setTimeout(() => {
        printWindow.print();
      }, 1000);

      message.destroy();
      message.success(
        `Generated ${qrItems.length} QR codes across ${pages.length} page(s) (3 items per page)`
      );
    } catch (error) {
      console.error("QR generation error:", error);
      message.error("Failed to generate QR codes. Please try again.");
    }
  };

  // Generate summary data from PO data using new sizeBreakdowns format
  // Helper function to generate readable display ID from uniqueId
  const generateDisplayId = (
    uniqueId: string,
    size: string,
    counter: number
  ): string => {
    // Convert from "PO1-Polo-POLOTPJ-XXXXL-001" to "XXXXL-1"
    return `${size}-${counter}`;
  };

  const generateSummaryData = (): SummaryItem[] => {
    if (!poData) return [];

    const summaryItems: SummaryItem[] = [];
    let itemIndex = 0;
    // Use size-specific counters instead of global counter
    const sizeCounters: { [sizeKey: string]: number } = {};

    console.log(`🔍 [SummaryModal] PO Data:`, poData);
    console.log(
      `🔍 [SummaryModal] Available keys in poData:`,
      Object.keys(poData)
    );

    // Check if we have the new sizeBreakdowns format
    if (poData.sizeBreakdowns && Array.isArray(poData.sizeBreakdowns)) {
      console.log(
        `🔍 [SummaryModal] Using new sizeBreakdowns format:`,
        poData.sizeBreakdowns
      );

      // Group size breakdowns by category and field for display
      const groupedBreakdowns: { [key: string]: any[] } = {};

      poData.sizeBreakdowns.forEach((breakdown: any) => {
        const key = `${breakdown.category}_${breakdown.field}`;
        if (!groupedBreakdowns[key]) {
          groupedBreakdowns[key] = [];
        }
        groupedBreakdowns[key].push(breakdown);
      });

      // Generate summary items from grouped breakdowns
      Object.entries(groupedBreakdowns).forEach(([key, breakdowns]) => {
        const [categoryKey, fieldKey] = key.split("_");

        // Find the category and field labels
        const category = poData.categories.find(
          (cat: any) => cat.key === categoryKey
        );
        const field = category?.fields.find((f: any) => f.key === fieldKey);

        if (category && field && !field.isTotal) {
          breakdowns.forEach((breakdown: any) => {
            // Create size-specific counter key
            const sizeKey = `${categoryKey}_${fieldKey}_${breakdown.size}`;
            if (!sizeCounters[sizeKey]) {
              sizeCounters[sizeKey] = 1;
            }

            const currentCounter = sizeCounters[sizeKey];
            const fullUniqueId = `PO${poIndex + 1}-${
              category.label
            }-${field.key.toUpperCase()}-${breakdown.size}-${String(
              currentCounter
            ).padStart(3, "0")}`;

            summaryItems.push({
              key: `${itemIndex++}`,
              productName: field.label,
              uniqueId: fullUniqueId,
              displayId: generateDisplayId(
                fullUniqueId,
                breakdown.size,
                currentCounter
              ),
              size: breakdown.size,
              scanned: breakdown.isScanned ? "Yes" : "No",
            });

            sizeCounters[sizeKey]++;
          });
        }
      });
    } else {
      // Fallback to old format for backward compatibility
      console.log(
        `🔍 [SummaryModal] Using legacy format - checking for old size keys`
      );

      // Process categories if available
      if (poData.categories && Array.isArray(poData.categories)) {
        poData.categories.forEach((category: any) => {
          category.fields.forEach((field: any) => {
            if (field.isTotal) return; // Skip total fields

            // Use snake_case format (backend normalizes everything to this format)
            const sizesKeySnake = `sizes_${category.key}_${field.key}`;
            const sizeBreakdownData = poData[sizesKeySnake];

            console.log(
              `🔍 [SummaryModal] Checking legacy key: ${sizesKeySnake}`,
              sizeBreakdownData
            );

            if (sizeBreakdownData && typeof sizeBreakdownData === "object") {
              // Handle both uppercase and lowercase size formats
              const standardSizes = [
                "XS",
                "S",
                "M",
                "L",
                "XL",
                "XXL",
                "XXXL",
                "XXXXL",
                "XXXXXL",
              ];
              const lowercaseSizes = [
                "xs",
                "s",
                "m",
                "l",
                "xl",
                "xxl",
                "xxxl",
                "xxxxl",
                "xxxxxl",
              ];

              // Process all possible size formats
              const allSizes = [...standardSizes, ...lowercaseSizes];
              const processedSizes = new Set(); // To avoid duplicates

              allSizes.forEach((size) => {
                const normalizedSize = size.toUpperCase();
                if (processedSizes.has(normalizedSize)) return;
                processedSizes.add(normalizedSize);

                // Check both uppercase and lowercase versions
                const upperQuantity = sizeBreakdownData[normalizedSize] || 0;
                const lowerQuantity =
                  sizeBreakdownData[size.toLowerCase()] || 0;
                const quantity = Math.max(upperQuantity, lowerQuantity);

                if (quantity > 0) {
                  // Create size-specific counter key for this category, field, and size
                  const sizeKey = `${category.key}_${field.key}_${normalizedSize}`;
                  if (!sizeCounters[sizeKey]) {
                    sizeCounters[sizeKey] = 1;
                  }

                  // Create individual entries for each quantity
                  for (let i = 1; i <= quantity; i++) {
                    // Check if this specific item has been scanned
                    // Backend uses format: size.toLowerCase() + uniqueId (e.g., "xs002", "m001")
                    // The backend actually keeps XS as 'xs', not 's'
                    let statusSizeKey = normalizedSize.toLowerCase();

                    const statusKey = `${statusSizeKey}${String(i).padStart(
                      3,
                      "0"
                    )}`;
                    const isScanned =
                      sizeBreakdownData.status?.[statusKey] === "completed";

                    console.log(
                      `🔍 [SummaryModal] Checking status for ${normalizedSize}-${i}: statusKey=${statusKey}, isScanned=${isScanned}, status=`,
                      sizeBreakdownData.status?.[statusKey]
                    );

                    const currentCounter = sizeCounters[sizeKey];
                    const fullUniqueId = `PO${poIndex + 1}-${
                      category.label
                    }-${field.key.toUpperCase()}-${normalizedSize}-${String(
                      currentCounter
                    ).padStart(3, "0")}`;

                    summaryItems.push({
                      key: `${itemIndex++}`,
                      productName: field.label,
                      uniqueId: fullUniqueId,
                      displayId: generateDisplayId(
                        fullUniqueId,
                        normalizedSize,
                        currentCounter
                      ),
                      size: normalizedSize,
                      scanned: isScanned ? "Yes" : "No",
                    });

                    sizeCounters[sizeKey]++;
                  }
                }
              });

              // Custom sizes
              if (sizeBreakdownData.custom) {
                Object.entries(sizeBreakdownData.custom).forEach(
                  ([customSize, quantity]) => {
                    const qty = Number(quantity) || 0;

                    // Create size-specific counter key for custom size
                    const sizeKey = `${category.key}_${field.key}_${customSize}`;
                    if (!sizeCounters[sizeKey]) {
                      sizeCounters[sizeKey] = 1;
                    }

                    // Create individual entries for each quantity
                    for (let i = 1; i <= qty; i++) {
                      // Check if this specific item has been scanned
                      // Backend uses format: size.toLowerCase() + uniqueId (e.g., "custom001")
                      const statusKey = `${customSize.toLowerCase()}${String(
                        i
                      ).padStart(3, "0")}`;
                      const isScanned =
                        sizeBreakdownData.status?.[statusKey] === "completed";

                      const currentCounter = sizeCounters[sizeKey];
                      const fullUniqueId = `PO${poIndex + 1}-${
                        category.label
                      }-${field.key.toUpperCase()}-${customSize}-${String(
                        currentCounter
                      ).padStart(3, "0")}`;

                      summaryItems.push({
                        key: `${itemIndex++}`,
                        productName: field.label,
                        uniqueId: fullUniqueId,
                        displayId: generateDisplayId(
                          fullUniqueId,
                          customSize,
                          currentCounter
                        ),
                        size: customSize,
                        scanned: isScanned ? "Yes" : "No",
                      });

                      sizeCounters[sizeKey]++;
                    }
                  }
                );
              }
            }
          });
        });
      }
    }

    console.log(`🔍 [SummaryModal] Generated summary items:`, summaryItems);
    console.log(`🔍 [SummaryModal] Size counters used:`, sizeCounters);
    return summaryItems;
  };

  const allSummaryData = generateSummaryData();

  // Filter data based on active tab
  const getFilteredData = () => {
    switch (activeTab) {
      case "scanned":
        return allSummaryData.filter(
          (item: SummaryItem) => item.scanned === "Yes"
        );
      case "pending":
        return allSummaryData.filter(
          (item: SummaryItem) => item.scanned === "No"
        );
      default:
        return allSummaryData;
    }
  };

  const filteredData = getFilteredData();

  const columns = [
    {
      title: "Product Name",
      dataIndex: "productName",
      key: "productName",
      width: "30%",
    },
    {
      title: "Unique ID",
      dataIndex: "displayId",
      key: "displayId",
      width: "45%",
    },
    {
      title: "Size",
      dataIndex: "size",
      key: "size",
      width: "15%",
    },
    {
      title: "Scanned",
      dataIndex: "scanned",
      key: "scanned",
      width: "10%",
      render: (scanned: string) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            scanned === "Yes"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {scanned}
        </span>
      ),
    },
  ];

  const tabItems = [
    {
      key: "all",
      label: `All (${allSummaryData.length})`,
      children: (
        <Table
          columns={columns}
          dataSource={filteredData}
          pagination={false}
          size="small"
          scroll={{ y: 400 }}
          className="summary-table"
        />
      ),
    },
    {
      key: "scanned",
      label: `Scanned (${
        allSummaryData.filter((item: SummaryItem) => item.scanned === "Yes")
          .length
      })`,
      children: (
        <Table
          columns={columns}
          dataSource={filteredData}
          pagination={false}
          size="small"
          scroll={{ y: 400 }}
          className="summary-table"
        />
      ),
    },
    {
      key: "pending",
      label: `Pending (${
        allSummaryData.filter((item: SummaryItem) => item.scanned === "No")
          .length
      })`,
      children: (
        <Table
          columns={columns}
          dataSource={filteredData}
          pagination={false}
          size="small"
          scroll={{ y: 400 }}
          className="summary-table"
        />
      ),
    },
  ];

  return (
    <Modal
      title={`Summary - PO ${poIndex + 1}`}
      open={isOpen}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
        <Button
          key="generate-qr"
          type="primary"
          icon={<QrcodeOutlined />}
          onClick={handleGenerateQR}
          disabled={allSummaryData.length === 0}
        >
          Generate QR
        </Button>,
      ]}
      width={800}
      style={{
        padding: "2rem",
      }}
      className="summary-modal"
    >
      {/* QR Scanner Status */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <QrcodeOutlined className="text-blue-600" />
          <span className="font-medium text-blue-800">Pemindai QR Aktif</span>
        </div>
        <p className="text-sm text-blue-700">
          Gunakan pemindai QR eksternal Anda untuk memindai kode QR yang
          dihasilkan. Item yang dipindai akan otomatis ditandai sebagai selesai.
        </p>
        <p className="text-xs text-blue-600 mt-1">
          Hasilkan kode QR terlebih dahulu, lalu pindai menggunakan pemindai
          eksternal Anda untuk memperbarui status item sambil membiarkan ini
          tetap terbuka.
        </p>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        className="summary-tabs"
      />
    </Modal>
  );
};

export default SummaryModal;
