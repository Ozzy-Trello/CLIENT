import React, { useState } from "react";
import { Modal, Table, Tabs, Button, message } from "antd";
import { QrcodeOutlined } from "@ant-design/icons";
import { useSelector } from "react-redux";
import { selectTheme, selectIsDarkMode } from "@store/app_slice";
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
  bahanId?: string; // Add bahan ID for grouping
  bahanName?: string; // Add bahan name for display
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
  const theme = useSelector(selectTheme);
  const isDarkMode = useSelector(selectIsDarkMode);
  const { colors } = theme;

  const [activeTab, setActiveTab] = useState<string>("all");
  const { selectedCard } = useCardDetailContext();

  // Access store data for total PO count and all PO data
  const { qty: totalPOCount, data: allPOData } = useAdditionalFieldsStore();

  // Sticker dimensions constants
  const stickerWidth = 566.92;
  const stickerHeight = 283.46;
  const pageWidth = stickerWidth * 3; // 3 stickers side by side

  // Helper functions to avoid conflicts in QR codes
  const getCategoryCode = (label: string): string => {
    const labelLower = label.toLowerCase();
    if (labelLower.includes('polo')) return 'PO';
    if (labelLower.includes('jaket')) return 'JK';
    if (labelLower.includes('kemeja')) return 'KM';
    if (labelLower.includes('oblong')) return 'OB';
    if (labelLower.includes('hoodie')) return 'HD';
    if (labelLower.includes('celana')) return 'CL';
    if (labelLower.includes('rompi')) return 'RP';
    if (labelLower.includes('jersey')) return 'JS';
    if (labelLower.includes('apron')) return 'AP';
    return label.substring(0, 2).toUpperCase();
  };
  
  const getFieldCode = (key: string): string => {
    const keyUpper = key.toUpperCase();
    // Handle specific polo variants
    if (keyUpper === 'POLOTPJ' || keyUpper === 'TPJ') return 'TJ';
    if (keyUpper === 'POLOTNK' || keyUpper === 'TNK') return 'TK';
    if (keyUpper === 'POLOTPD' || keyUpper === 'TPD') return 'TD';
    // Handle other common patterns
    if (keyUpper.startsWith('POLO')) return keyUpper.substring(4, 6) || keyUpper.substring(0, 2);
    if (keyUpper === 'CUSTOM') return 'CU';
    if (keyUpper === 'TOTAL') return 'TO';
    return keyUpper.substring(0, 2);
  };

  // Generate QR data for printing
  const generateQRData = (): QRItem[] => {
    const qrItems: QRItem[] = [];
    const cardId = selectedCard?.id;

    if (!cardId) {
      return qrItems;
    }

    if (!poId) {
      return qrItems;
    }

    const summaryData = generateSummaryData();

    summaryData.forEach((item) => {
      // Parse the uniqueId to extract components: PO1-Polo-TPJ-M-001
      const uniqueIdParts = item.uniqueId.split("-");

      if (uniqueIdParts.length >= 5) {
        const poNumber = uniqueIdParts[0]; // PO1
        const categoryLabel = uniqueIdParts[1]; // Polo
        const fieldKey = uniqueIdParts[2]; // TPJ
        const size = uniqueIdParts[3]; // M
        const sequenceNumber = uniqueIdParts[4]; // 001

        // Create short format with separators for readability and flexibility
        // Use minimal separators while maintaining readability
        const categoryCode = getCategoryCode(categoryLabel);
        const fieldCode = getFieldCode(fieldKey);
        const poNum = poNumber.replace("PO", ""); // 1, 10, 100, etc.
        
        // Enhanced format with bahan ID: poNum-bahanId-categoryCode-fieldCode-size-seq
        // Example: 1-B001-PO-TJ-M-001 (PO1, Bahan B001, Polo, TPJ, size M, sequence 001)
        // If no bahan ID, use "B000" as default for backward compatibility
        const bahanId = item.bahanId || "B000";
        const shortFormat = `${poNum}-${bahanId}-${categoryCode}-${fieldCode}-${size}-${sequenceNumber}`;
        const qrValue = shortFormat; // No card ID - passed as parameter during scan
        
        // Backend parsing format:
        // 1. Split by '-' to get: [poNum, bahanId, categoryCode, fieldCode, size, sequenceNumber]
        // 2. Map codes: PO=Polo, JK=Jaket, TJ=TPJ, TK=TNK, TD=TPD, etc.
        // 3. Default action to "mark_complete"
        // 4. Card ID will be passed as parameter during scanning (not in QR data)
        // 5. Supports any length PO numbers (1, 10, 100, etc.)
        // 6. Supports bahan-specific scanning with bahan ID

        qrItems.push({
          key: item.key,
          qrValue,
          uniqueId: item.uniqueId,
          displayId: item.displayId, // Add displayId for QR label
          productName: item.productName,
          size: item.size,
        });
      } else {
      }
    });

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
          level: "L", // Low error correction for simpler QR codes with fewer dots
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
                // Improve rendering quality
                ctx.imageSmoothingEnabled = false; // Disable smoothing for crisp pixels
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

    // QR code size - keeping original size, relying on data reduction for better readability
    const qrSize = stickerHeight * 0.65; // Original QR size

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

    // Collect all size breakdowns from both PO level and bahan items
    const allSizeBreakdowns: any[] = [];
    
    // Add PO-level size breakdowns
    if (poData.sizeBreakdowns && Array.isArray(poData.sizeBreakdowns)) {
      allSizeBreakdowns.push(...poData.sizeBreakdowns);
    }
    
    // Add bahan-level size breakdowns with bahan information
    if (poData.bahan && Array.isArray(poData.bahan)) {
      poData.bahan.forEach((bahanItem: any, index: number) => {
        if (bahanItem.sizeBreakdowns && Array.isArray(bahanItem.sizeBreakdowns)) {
          // Add bahan information to each size breakdown
          const bahanSizeBreakdowns = bahanItem.sizeBreakdowns.map((breakdown: any) => ({
            ...breakdown,
            bahanId: bahanItem.bahanId || bahanItem.id || `B${String(index + 1).padStart(3, "0")}`,
            bahanName: bahanItem.name || `Bahan ${index + 1}`
          }));
          allSizeBreakdowns.push(...bahanSizeBreakdowns);
        }
      });
    }
    


    // Check if we have any size breakdowns
    if (allSizeBreakdowns.length > 0) {
      // Group size breakdowns by category and field for display
      const groupedBreakdowns: { [key: string]: any[] } = {};

      allSizeBreakdowns.forEach((breakdown: any) => {
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
              bahanId: breakdown.bahanId,
              bahanName: breakdown.bahanName,
            });

            sizeCounters[sizeKey]++;
          });
        }
      });
    } else {
      // Fallback to old format for backward compatibility

      // Process categories if available
      if (poData.categories && Array.isArray(poData.categories)) {
        poData.categories.forEach((category: any) => {
          category.fields.forEach((field: any) => {
            if (field.isTotal) return; // Skip total fields

            // Use snake_case format (backend normalizes everything to this format)
            const sizesKeySnake = `sizes_${category.key}_${field.key}`;
            const sizeBreakdownData = poData[sizesKeySnake];

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

  // Group data by bahan
  const groupDataByBahan = (data: SummaryItem[]) => {
    const groups: { [key: string]: { name: string; items: SummaryItem[] } } = {};
    
    data.forEach((item) => {
      const groupKey = item.bahanId || 'po-level';
      const groupName = item.bahanName || 'PO Level';
      
      if (!groups[groupKey]) {
        groups[groupKey] = {
          name: groupName,
          items: []
        };
      }
      
      groups[groupKey].items.push(item);
    });
    
    return groups;
  };

  const groupedData = groupDataByBahan(filteredData);

  const columns = [
    {
      title: "Product Name",
      dataIndex: "productName",
      key: "productName",
      width: "35%",
    },
    {
      title: "Unique ID",
      dataIndex: "displayId",
      key: "displayId",
      width: "30%",
    },
    {
      title: "Size",
      dataIndex: "size",
      key: "size",
      width: "20%",
    },
    {
      title: "Scanned",
      dataIndex: "scanned",
      key: "scanned",
      width: "15%",
      render: (scanned: string) => (
        <span
          className="px-2 py-1 rounded-full text-xs font-medium"
          style={{
            backgroundColor:
              scanned === "Yes"
                ? `rgb(${colors.success})`
                : `rgb(${colors.destructive})`,
            color: `rgb(${colors.surface})`,
          }}
        >
          {scanned}
        </span>
      ),
    },
  ];

  // Custom grouped table component
  const GroupedTable = () => (
    <div style={{ marginTop: "1rem", maxHeight: "400px", overflowY: "auto" }}>
      {Object.entries(groupedData).map(([groupKey, group], index) => (
        <div key={groupKey} style={{ marginBottom: index < Object.keys(groupedData).length - 1 ? "1.5rem" : "0" }}>
          {/* Bahan Header */}
          <div
            className="px-3 py-2 font-medium text-sm rounded-t-lg"
            style={{
              backgroundColor: `rgb(${colors.muted})`,
              borderBottom: `1px solid rgb(${colors.border})`,
              color: `rgb(${colors.text})`,
            }}
          >
            {group.name} ({group.items.length} items)
          </div>
          
          {/* Table for this group */}
          <Table
            columns={columns}
            dataSource={group.items}
            pagination={false}
            size="middle"
            showHeader={index === 0} // Only show header for first group
            className="summary-table"
            style={{
              marginTop: "0",
            }}
          />
        </div>
      ))}
    </div>
  );

  const tabItems = [
    {
      key: "all",
      label: `All (${allSummaryData.length})`,
      children: <GroupedTable />,
    },
    {
      key: "scanned",
      label: `Scanned (${
        allSummaryData.filter((item: SummaryItem) => item.scanned === "Yes")
          .length
      })`,
      children: <GroupedTable />,
    },
    {
      key: "pending",
      label: `Pending (${
        allSummaryData.filter((item: SummaryItem) => item.scanned === "No")
          .length
      })`,
      children: <GroupedTable />,
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
      width={900}
      style={{
        padding: "2rem",
      }}
      bodyStyle={{
        padding: "1.5rem",
      }}
      className="summary-modal"
    >
      {/* QR Scanner Status */}
      <div
        className="mb-6 p-4 rounded-lg"
        style={{
          backgroundColor: `rgb(${colors.muted})`,
          border: `1px solid rgb(${colors.border})`,
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <QrcodeOutlined style={{ color: `rgb(${colors.primary})` }} />
          <span
            className="font-medium"
            style={{ color: `rgb(${colors.text})` }}
          >
            Pemindai QR Aktif
          </span>
        </div>
        <p
          className="text-sm"
          style={{ color: `rgb(${colors["text-muted"]})` }}
        >
          Gunakan pemindai QR eksternal Anda untuk memindai kode QR yang
          dihasilkan. Item yang dipindai akan otomatis ditandai sebagai selesai.
        </p>
        <p
          className="text-xs mt-1"
          style={{ color: `rgb(${colors["text-muted"]})` }}
        >
          Hasilkan kode QR terlebih dahulu, lalu pindai menggunakan pemindai
          eksternal Anda untuk memperbarui status item sambil membiarkan ini
          tetap terbuka.
        </p>
      </div>

      {/* Scanning Progress Status */}
      {(() => {
        const totalItems = allSummaryData.length;
        const scannedItems = allSummaryData.filter((item: SummaryItem) => item.scanned === "Yes").length;
        const isAllScanned = totalItems > 0 && scannedItems === totalItems;
        const progressPercentage = totalItems > 0 ? Math.round((scannedItems / totalItems) * 100) : 0;

        return (
          <div
            className="mb-4 p-3 rounded-lg flex items-center justify-between"
            style={{
              backgroundColor: isAllScanned 
                ? `rgba(${colors.success}, 0.1)` 
                : `rgba(${colors.warning}, 0.1)`,
              border: `1px solid ${isAllScanned 
                ? `rgb(${colors.success})` 
                : `rgb(${colors.warning})`}`,
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: isAllScanned 
                    ? `rgb(${colors.success})` 
                    : `rgb(${colors.warning})`,
                }}
              />
              <span
                className="font-medium"
                style={{ 
                  color: isAllScanned 
                    ? `rgb(${colors.success})` 
                    : `rgb(${colors.warning})` 
                }}
              >
                {isAllScanned ? "✓ Sudah scan semua" : "⚠ Belum selesai scan"}
              </span>
            </div>
            <div className="text-right">
              <div
                className="text-sm font-medium"
                style={{ 
                  color: isAllScanned 
                    ? `rgb(${colors.success})` 
                    : `rgb(${colors.warning})` 
                }}
              >
                {scannedItems}/{totalItems} items ({progressPercentage}%)
              </div>
              <div
                className="text-xs"
                style={{ color: `rgb(${colors["text-muted"]})` }}
              >
                {isAllScanned ? "Semua item telah dipindai" : `${totalItems - scannedItems} item belum dipindai`}
              </div>
            </div>
          </div>
        );
      })()}

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
