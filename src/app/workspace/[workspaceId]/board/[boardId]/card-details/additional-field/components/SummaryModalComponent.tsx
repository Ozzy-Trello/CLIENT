"use client";

import React, { useRef, useState } from "react";
import { Modal, Button, Table, message } from "antd";
import { BarChart3 } from "lucide-react";
import QRCodeLib from "qrcode";
import jsPDF from "jspdf";

// Types
interface SizeBreakdown {
  XS: number;
  S: number;
  M: number;
  L: number;
  XL: number;
  XXL: number;
  XXXL: number;
  XXXXL: number;
  XXXXXL: number;
  custom?: { [key: string]: number };
}

interface SummaryModalState {
  isOpen: boolean;
  itemIndex: number;
}

interface ItemDetail {
  id: string;
  name: string;
  additionalFields: any;
  __rawInputs?: any;
}

interface SummaryModalComponentProps {
  modalState: SummaryModalState;
  onClose: () => void;
  scannedItems: ItemDetail[];
  tabNames: any[];
  selectedCard: any;
  poScannedItems?: Record<number, ItemDetail[]>; // Add PO-specific items
}

const SummaryModalComponent: React.FC<SummaryModalComponentProps> = ({
  modalState,
  onClose,
  scannedItems,
  tabNames,
  selectedCard,
  poScannedItems,
}) => {
  const isGeneratingPDF = useRef(false);
  const [activeFilter, setActiveFilter] = useState<
    "all" | "scanned" | "pending"
  >("all");

  if (!modalState.isOpen) return null;

  // Use poScannedItems if available, otherwise fall back to scannedItems
  const poIdentifier = modalState.itemIndex; // itemIndex is now used as poIdentifier
  const currentPoItems = poScannedItems?.[poIdentifier] || scannedItems;
  const currentItem = currentPoItems[0]; // Use first item for compatibility

  const getSizeBreakdown = (
    item: ItemDetail,
    tabKey: string,
    fieldKey: string
  ): SizeBreakdown => {
    // Try both formats: snake_case and camelCase
    const sizesKeySnake = `sizes_${tabKey}_${fieldKey}`;
    const sizesKeyCamel = `sizes${tabKey}${
      fieldKey.charAt(0).toUpperCase() + fieldKey.slice(1)
    }`;

    console.log(`\n--- getSizeBreakdown Debug (SummaryModal) ---`);
    console.log(`Looking for sizesKey (snake): ${sizesKeySnake}`);
    console.log(`Looking for sizesKey (camel): ${sizesKeyCamel}`);
    console.log(`Item additionalFields:`, item.additionalFields);
    console.log(
      `Available keys in additionalFields:`,
      Object.keys(item.additionalFields || {})
    );

    // Try snake_case first, then camelCase
    let existing = item.additionalFields?.[sizesKeySnake] as any;
    let foundKey = sizesKeySnake;

    if (!existing) {
      existing = item.additionalFields?.[sizesKeyCamel] as any;
      foundKey = sizesKeyCamel;
    }

    console.log(`Found existing data for ${foundKey}:`, existing);

    const result = existing
      ? {
          XS: existing.XS || existing.xs || 0,
          S: existing.S || existing.s || 0,
          M: existing.M || existing.m || 0,
          L: existing.L || existing.l || 0,
          XL: existing.XL || existing.xl || 0,
          XXL: existing.XXL || existing.xxl || 0,
          XXXL: existing.XXXL || existing.xxxl || 0,
          XXXXL: existing.XXXXL || existing.xxxxl || 0,
          XXXXXL: existing.XXXXXL || existing.xxxxxl || 0,
          custom: existing.custom || {},
        }
      : {
          XS: 0,
          S: 0,
          M: 0,
          L: 0,
          XL: 0,
          XXL: 0,
          XXXL: 0,
          XXXXL: 0,
          XXXXXL: 0,
          custom: {},
        };

    console.log(`Returning breakdown:`, result);
    console.log(`--- End getSizeBreakdown Debug (SummaryModal) ---\n`);
    return result;
  };

  const generateSummaryDataForItem = (item: ItemDetail, itemIndex: number) => {
    const summaryData: any[] = [];

    console.log(`=== SUMMARY DATA FOR ITEM ${itemIndex}: ${item.name} ===`);
    console.log("Item:", item);
    console.log("Tab names:", tabNames);

    tabNames.forEach((tab) => {
      console.log(`\n--- Processing tab: ${tab.label} (${tab.key}) ---`);
      Object.entries(tab.fields).forEach(([fieldKey, field]) => {
        const isTotalField = fieldKey.toLowerCase().includes("total");
        console.log(
          `\nProcessing field: ${fieldKey} (isTotal: ${isTotalField})`
        );

        // Only include non-total fields that have actual size breakdowns
        if (!isTotalField) {
          // Check for size breakdown data first - this is the key change
          // Use PO-specific key format: sizes_{poIdentifier}_{tabKey}_{fieldKey}
          const sizesKey = `sizes_${poIdentifier}_${tab.key}_${fieldKey}`;
          const sizeData = item.additionalFields?.[sizesKey] as any;

          console.log(`Looking for size data at key: ${sizesKey}`);
          console.log(`Size data found:`, sizeData);

          if (sizeData) {
            // Check if this field has any size breakdown data
            const hasStandardSizes = Object.entries(sizeData).some(
              ([size, quantity]) =>
                size !== "custom" &&
                size !== "status" &&
                typeof quantity === "number" &&
                quantity > 0
            );
            const hasCustomSizes =
              sizeData.custom &&
              Object.values(sizeData.custom).some(
                (quantity: any) => typeof quantity === "number" && quantity > 0
              );

            console.log(
              `Field ${fieldKey}:`,
              `hasStandardSizes=${hasStandardSizes}`,
              `hasCustomSizes=${hasCustomSizes}`
            );

            if (hasStandardSizes || hasCustomSizes) {
              console.log(`✅ Processing field ${fieldKey} - has size data`);

              // Calculate total size quantities
              const totalSizeQuantity =
                Object.entries(sizeData).reduce((total, [size, quantity]) => {
                  if (
                    size !== "custom" &&
                    size !== "status" &&
                    typeof quantity === "number"
                  ) {
                    return total + quantity;
                  }
                  return total;
                }, 0) +
                (sizeData.custom
                  ? Object.values(sizeData.custom).reduce(
                      (total: number, quantity: any) => {
                        return (
                          total + (typeof quantity === "number" ? quantity : 0)
                        );
                      },
                      0
                    )
                  : 0);

              console.log(
                `Total size quantity for ${fieldKey}:`,
                totalSizeQuantity
              );

              // Create summary entry
              summaryData.push({
                tab: tab.label,
                field: (field as any).label,
                fieldKey: fieldKey,
                tabKey: tab.key,
                totalQuantity: totalSizeQuantity, // Use calculated total
                sizeBreakdown: sizeData,
                totalSizeQuantity: totalSizeQuantity,
                itemName: item.name,
                itemId: item.id,
              });
            } else {
              console.log(`❌ Field ${fieldKey} - no size data in breakdown`);
            }
          } else {
            console.log(`❌ Field ${fieldKey} - no size breakdown found`);
          }
        } else {
          console.log(`⏭️ Skipping total field: ${fieldKey}`);
        }
      });
    });

    console.log(`\n=== FINAL SUMMARY DATA FOR ITEM ${itemIndex} ===`);
    console.log("Summary data array:", summaryData);
    console.log("Total entries:", summaryData.length);
    console.log("=== END DEBUG ===\n");

    return summaryData;
  };

  const generateSummaryData = () => {
    const summaryData: any[] = [];
    const itemsWithoutSizes: any[] = [];
    const itemsWithIncompleteSizes: any[] = [];

    // Get the PO identifier from modalState.itemIndex
    const poIdentifier = modalState.itemIndex;
    console.log("=== SUMMARY DATA GENERATION DEBUG ===");
    console.log("PO Identifier:", poIdentifier);

    // Get items for this specific PO
    const currentPoItems = poScannedItems?.[poIdentifier] || [];
    console.log("Current PO items:", currentPoItems);

    console.log("Tab names:", tabNames);
    console.log("poScannedItems:", poScannedItems);
    console.log("scannedItems:", scannedItems);

    // Process each item in the current PO
    currentPoItems.forEach((item, itemIndex) => {
      console.log(`--- Processing item ${itemIndex}: ${item.name} ---`);
      console.log(
        "Available keys in additionalFields:",
        Object.keys(item.additionalFields || {})
      );

      // Log all available keys and their values for debugging
      Object.entries(item.additionalFields || {}).forEach(([key, value]) => {
        console.log(`Key: ${key}, Value:`, value);
      });

      // Process each tab
      tabNames.forEach((tab) => {
        console.log(`--- Processing tab: ${tab.label} (${tab.key}) ---`);

        // Process each field in the tab
        Object.entries(tab.fields).forEach(([fieldKey, field]) => {
          const isTotalField = fieldKey.toLowerCase().includes("total");

          // Only include non-total fields that have actual size breakdowns
          if (!isTotalField) {
            // Check for size breakdown data directly
            const sizesKey = `sizes_${poIdentifier}_${tab.key}_${fieldKey}`;
            const sizeData = item.additionalFields?.[sizesKey] as any;

            console.log(`Looking for size data at key: ${sizesKey}`);
            console.log(`Size data found:`, sizeData);

            if (sizeData) {
              // Check if this field has any size breakdown data
              const hasStandardSizes = Object.entries(sizeData).some(
                ([size, quantity]) =>
                  size !== "custom" &&
                  size !== "status" &&
                  typeof quantity === "number" &&
                  quantity > 0
              );
              const hasCustomSizes =
                sizeData.custom &&
                Object.values(sizeData.custom).some(
                  (quantity: any) =>
                    typeof quantity === "number" && quantity > 0
                );

              console.log(
                `Field ${fieldKey}:`,
                `hasStandardSizes=${hasStandardSizes}`,
                `hasCustomSizes=${hasCustomSizes}`
              );

              if (hasStandardSizes || hasCustomSizes) {
                console.log(`✅ Processing field ${fieldKey} - has size data`);

                // Calculate total size quantities
                const totalSizeQuantity =
                  Object.entries(sizeData).reduce((total, [size, quantity]) => {
                    if (
                      size !== "custom" &&
                      size !== "status" &&
                      typeof quantity === "number"
                    ) {
                      return total + quantity;
                    }
                    return total;
                  }, 0) +
                  (sizeData.custom
                    ? Object.values(sizeData.custom).reduce(
                        (total: number, quantity: any) => {
                          return (
                            total +
                            (typeof quantity === "number" ? quantity : 0)
                          );
                        },
                        0
                      )
                    : 0);

                console.log(
                  `Total size quantity for ${fieldKey}:`,
                  totalSizeQuantity
                );

                // Create individual entries for each piece
                // Process standard sizes
                Object.entries(sizeData).forEach(([size, quantity]) => {
                  if (
                    size !== "custom" &&
                    size !== "status" &&
                    typeof quantity === "number" &&
                    quantity > 0
                  ) {
                    // Create one entry per individual item
                    for (let i = 0; i < quantity; i++) {
                      const itemKey = `${size}-${i + 1}`;
                      const statusKey = `${size.toLowerCase()}${i + 1}`;

                      // Check if this specific item has been scanned
                      const itemStatus =
                        sizeData.status?.[statusKey] === "completed"
                          ? "completed"
                          : "pending";

                      summaryData.push({
                        key: `${itemIndex}_${tab.key}_${fieldKey}_${size}_${i}`,
                        item: item.name,
                        product: `${tab.label} ${(field as any).label}`,
                        size: itemKey,
                        status: itemStatus,
                        qrData: `${item.id}-${tab.key}-${fieldKey}-${size}-${
                          i + 1
                        }`,
                      });
                    }
                    console.log(
                      `Created ${quantity} individual items for ${size}`
                    );
                  }
                });

                // Process custom sizes
                if (sizeData.custom) {
                  Object.entries(sizeData.custom).forEach(
                    ([customSize, quantity]) => {
                      if (typeof quantity === "number" && quantity > 0) {
                        // Create one entry per individual item
                        for (let i = 0; i < quantity; i++) {
                          const itemKey = `${customSize}-${i + 1}`;
                          const statusKey = `${customSize.toLowerCase()}${
                            i + 1
                          }`;

                          // Check if this specific item has been scanned
                          const itemStatus =
                            sizeData.status?.[statusKey] === "completed"
                              ? "completed"
                              : "pending";

                          summaryData.push({
                            key: `${itemIndex}_${tab.key}_${fieldKey}_${customSize}_${i}`,
                            item: item.name,
                            product: `${tab.label} ${(field as any).label}`,
                            size: itemKey,
                            status: itemStatus,
                            qrData: `${item.id}-${
                              tab.key
                            }-${fieldKey}-${customSize}-${i + 1}`,
                          });
                        }
                        console.log(
                          `Created ${quantity} individual items for ${customSize}`
                        );
                      }
                    }
                  );
                }
              } else {
                console.log(`❌ Field ${fieldKey} - no size data in breakdown`);
              }
            } else {
              console.log(`❌ Field ${fieldKey} - no size breakdown found`);
            }
          } else {
            console.log(`⏭️ Skipping total field: ${fieldKey}`);
          }
        });
      });
    });

    console.log("\n=== FINAL SUMMARY DATA ===");
    console.log("Summary data array:", summaryData);
    console.log("Items without sizes:", itemsWithoutSizes);
    console.log("Items with incomplete sizes:", itemsWithIncompleteSizes);
    console.log("Total entries:", summaryData.length);
    console.log("=== END DEBUG ===");

    return { summaryData, itemsWithoutSizes, itemsWithIncompleteSizes };
  };

  // Define table columns
  const columns = [
    {
      title: "Item",
      dataIndex: "item",
      key: "item",
      width: 150,
    },
    {
      title: "Product",
      dataIndex: "product",
      key: "product",
      width: 150,
    },
    {
      title: "Size",
      dataIndex: "size",
      key: "size",
      width: 100,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status: string) => (
        <span
          className={`px-2 py-1 text-xs rounded-full ${
            status === "completed"
              ? "bg-green-100 text-green-800"
              : "bg-yellow-100 text-yellow-800"
          }`}
        >
          {status === "completed" ? "Completed" : "Pending"}
        </span>
      ),
    },
  ];

  const summaryDataResult = generateSummaryData();
  const summaryData = summaryDataResult.summaryData;
  const itemsWithoutSizes = summaryDataResult.itemsWithoutSizes;
  const itemsWithIncompleteSizes = summaryDataResult.itemsWithIncompleteSizes;

  // Filter summary data based on active filter
  const filteredSummaryData = summaryData.filter((item) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "scanned") return item.status === "completed";
    if (activeFilter === "pending") return item.status === "pending";
    return true;
  });

  // Generate high-quality QR code as canvas
  const generateQRCanvas = async (
    text: string,
    size: number
  ): Promise<HTMLCanvasElement> => {
    return new Promise((resolve, reject) => {
      try {
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = size;
        tempCanvas.height = size;
        QRCodeLib.toCanvas(
          tempCanvas,
          text,
          {
            width: size,
            margin: 1,
            color: {
              dark: "#000000",
              light: "#FFFFFF",
            },
            errorCorrectionLevel: "M",
          },
          (error: Error | null | undefined) => {
            if (error) {
              reject(error);
            } else {
              resolve(tempCanvas);
            }
          }
        );
      } catch (error) {
        reject(error);
      }
    });
  };

  const getSizeBreakdownForQR = (
    item: ItemDetail,
    tabKey: string,
    fieldKey: string
  ): SizeBreakdown => {
    // Try both formats: snake_case and camelCase
    const sizesKeySnake = `sizes_${tabKey}_${fieldKey}`;
    const sizesKeyCamel = `sizes${tabKey}${
      fieldKey.charAt(0).toUpperCase() + fieldKey.slice(1)
    }`;

    // Try snake_case first, then camelCase
    let existing = item.additionalFields?.[sizesKeySnake] as any;

    if (!existing) {
      existing = item.additionalFields?.[sizesKeyCamel] as any;
    }

    return existing
      ? {
          XS: existing.XS || existing.xs || 0,
          S: existing.S || existing.s || 0,
          M: existing.M || existing.m || 0,
          L: existing.L || existing.l || 0,
          XL: existing.XL || existing.xl || 0,
          XXL: existing.XXL || existing.xxl || 0,
          XXXL: existing.XXXL || existing.xxxl || 0,
          XXXXL: existing.XXXXL || existing.xxxxl || 0,
          XXXXXL: existing.XXXXXL || existing.xxxxxl || 0,
          custom: existing.custom || {},
        }
      : {
          XS: 0,
          S: 0,
          M: 0,
          L: 0,
          XL: 0,
          XXL: 0,
          XXXL: 0,
          XXXXL: 0,
          XXXXXL: 0,
          custom: {},
        };
  };

  const generateQRData = () => {
    const qrItems: any[] = [];

    // Get the current card ID from selectedCard
    const cardId = selectedCard?.id;
    if (!cardId) {
      console.error("No card ID available for QR generation");
      return qrItems;
    }

    console.log("=== QR GENERATION DEBUG ===");
    console.log("summaryData:", summaryData);

    // Generate QR codes for each individual item in the summary data
    summaryData.forEach((item) => {
      if (item.qrData) {
        // Get PO identifier from modalState.itemIndex
        const poIdentifier = modalState.itemIndex;

        // Create simple format for external scanner: cardId|scannedData|action
        // Include PO identifier in the scannedData: itemId-tabKey-fieldKey-size-number-poIdentifier
        const qrDataWithPO = `${item.qrData}-${poIdentifier}`;
        const qrValue = `${cardId}|${qrDataWithPO}|mark_complete`;

        qrItems.push({
          key: item.key,
          qrValue,
          qrData: qrDataWithPO, // Keep the original data for display purposes
          label: item.size,
          product: item.product,
          item: item.item,
          productCode: `LUSIN${item.item}`,
          itemCode: item.size,
          cardName: item.item,
          bahanType: item.product,
        });
      }
    });

    console.log("Generated QR items:", qrItems);
    console.log("=== END QR GENERATION DEBUG ===");

    return qrItems;
  };

  // Generate print-ready page matching the template format
  const generateTemplatePage = async (
    items: any[]
  ): Promise<HTMLCanvasElement> => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get canvas context");

    // Custom sticker sheet size: 3 stickers horizontally - INCREASED RESOLUTION
    // Each sticker: Width: 566.92 points (≈ 200mm), Height: 283.46 points (≈ 100mm) - 2x resolution
    const stickerWidth = 566.92;
    const stickerHeight = 283.46;
    const pageWidth = stickerWidth * 3; // 3 stickers side by side
    const pageHeight = stickerHeight; // Single row height

    canvas.width = pageWidth;
    canvas.height = pageHeight;

    // White background
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, pageWidth, pageHeight);

    // Layout: 3 stickers horizontally (3 columns, 1 row)
    const cols = 3;
    const rows = 1;

    // Generate QR codes for all items (max 3 per page) - INCREASED SIZE
    const qrSize = stickerHeight * 0.6; // 60% of sticker height (was 40%)
    const qrPromises = items
      .slice(0, 3)
      .map((item) => generateQRCanvas(item.qrValue, qrSize));
    const qrCodes = await Promise.all(qrPromises);

    // Draw each sticker
    items.slice(0, 3).forEach((item, index) => {
      const col = index;
      const x = col * stickerWidth;
      const y = 0; // Single row, so y is always 0

      // Draw sticker border
      ctx.strokeStyle = "#CCCCCC";
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, stickerWidth, stickerHeight);

      // Calculate positions within each sticker - ADJUSTED FOR LARGER ELEMENTS
      const padding = 30; // Increased from 15
      const qrX = x + padding;
      const qrY = y + (stickerHeight - qrSize) / 2; // Center QR vertically
      const textX = qrX + qrSize + 30; // Increased spacing from 15 to 30
      const textStartY = y + stickerHeight / 2 - 30; // Adjusted for larger text

      // Draw QR code
      if (qrCodes[index]) {
        ctx.drawImage(qrCodes[index], qrX, qrY, qrSize, qrSize);
      }

      // Text styling - matching template format
      ctx.textAlign = "left";
      ctx.fillStyle = "#000000";

      // Size Code - UPDATED FORMAT: {cardname} - {size}
      ctx.font = "24px Arial"; // Increased from 12px
      const cardName = selectedCard?.name || item.cardName || item.item;
      const truncatedCardName =
        cardName.length > 15 ? cardName.substring(0, 15) + "..." : cardName;
      const uniqueId = item.qrData ? item.qrData.split("-").pop() || "1" : "1"; // Use qrData instead of qrValue
      const sizeCode = `${item.label} - ${uniqueId}`;
      ctx.fillText(truncatedCardName, textX, textStartY); // Adjusted Y position
      ctx.fillText(sizeCode, textX, textStartY + 32); // Adjusted Y position

      // Card Name - INCREASED FONT SIZE
      ctx.font = "24px Arial"; // Increased from 12px
      ctx.fillText(item.cardName || item.item, textX, textStartY + 64); // Adjusted Y position

      // Bahan Type - INCREASED FONT SIZE
      ctx.font = "20px Arial"; // Increased from 10px
      const bahanType = item.bahanType || item.product;

      // Always format as "Category - Subcategory" consistently
      let formattedBahanType = bahanType;
      // Handle cases like "Polo Polo TPJ" -> "Polo - Polo TPJ"
      if (bahanType.includes(" ")) {
        const words = bahanType.split(" ");
        if (words.length >= 2) {
          // Find the first repeated word or create proper format
          if (words[0] === words[1]) {
            // Case: "Polo Polo TPJ" -> "Polo - Polo TPJ"
            formattedBahanType = `${words[0]} - ${words.slice(1).join(" ")}`;
          } else {
            // Case: "Polo TPJ" -> "Polo - TPJ"
            formattedBahanType = `${words[0]} - ${words.slice(1).join(" ")}`;
          }
        }
      }

      // Always draw as single line to ensure consistency
      ctx.fillText(formattedBahanType, textX, textStartY + 96);
    });

    return canvas;
  };

  // Print stickers
  const printStickers = async () => {
    if (isGeneratingPDF.current) return;
    isGeneratingPDF.current = true;

    try {
      message.loading("Generating template stickers...", 0);
      const qrItems = generateQRData();
      const pages: HTMLCanvasElement[] = [];

      // Generate pages (3 stickers per page instead of 12)
      for (let i = 0; i < qrItems.length; i += 3) {
        const pageItems = qrItems.slice(i, i + 3);
        const page = await generateTemplatePage(pageItems);
        pages.push(page);
      }

      // Create print window
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        message.error("Please allow popups to print stickers");
        return;
      }

      const printHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>QR Template Stickers - ${currentItem.name}</title>
          <style>
            @page {
              size: A4;
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
              width: 100vw;
              height: 100vh;
            display: flex;
              align-items: center;
              justify-content: center;
            }
            .page:last-child {
              page-break-after: auto;
            }
            img {
              max-width: 100%;
              max-height: 100%;
              object-fit: contain;
            }
          </style>
        </head>
        <body>
          ${pages
            .map(
              (page, index) => `
            <div class="page">
              <img src="${page.toDataURL("image/png")}" alt="Template Page ${
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

      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 500);
      };

      message.destroy();
      message.success("Template print dialog opened successfully");
    } catch (error) {
      console.error("Error generating template stickers:", error);
      message.error("Failed to generate template stickers");
    } finally {
      isGeneratingPDF.current = false;
    }
  };

  // Open PDF in new tab instead of downloading
  const openPDFInNewTab = async () => {
    if (isGeneratingPDF.current) return;
    isGeneratingPDF.current = true;

    try {
      message.loading("Generating template PDF...", 0);
      const qrItems = generateQRData();
      const pages: HTMLCanvasElement[] = [];

      for (let i = 0; i < qrItems.length; i += 3) {
        const pageItems = qrItems.slice(i, i + 3);
        const page = await generateTemplatePage(pageItems);
        pages.push(page);
      }

      // Custom page size for sticker sheet - DOUBLED FOR HIGHER QUALITY
      const pageWidthMM = 600; // 3 stickers × 200mm each (doubled)
      const pageHeightMM = 100; // Single sticker height (doubled)

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: [pageWidthMM, pageHeightMM],
      });

      pages.forEach((page, index) => {
        if (index > 0) {
          pdf.addPage([pageWidthMM, pageHeightMM], "landscape");
        }
        const imgData = page.toDataURL("image/png");
        pdf.addImage(imgData, "PNG", 0, 0, pageWidthMM, pageHeightMM);
      });

      // Open in new tab instead of downloading
      const pdfBlob = pdf.output("blob");
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, "_blank");

      message.destroy();
      message.success("PDF opened in new tab");
    } catch (error) {
      console.error("Error generating template PDF:", error);
      message.error("Failed to generate template PDF");
    } finally {
      isGeneratingPDF.current = false;
    }
  };

  return (
    <Modal
      open={modalState.isOpen}
      onCancel={onClose}
      width={1000}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
      ]}
      destroyOnClose={false}
      maskClosable={false}
    >
      <div className="p-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Size Summary - PO {poIdentifier}
          </h2>
          <Button
            key="qr"
            type="primary"
            onClick={() => {
              if (summaryData.length === 0) {
                message.warning(
                  "No size breakdowns found to generate QR codes."
                );
                return;
              }
              openPDFInNewTab();
            }}
          >
            Generate QR Codes
          </Button>
        </div>

        {/* Filter Tabs */}
        <div className="mb-4">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveFilter("all")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeFilter === "all"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              All ({currentPoItems?.length || 0})
            </button>
            <button
              onClick={() => setActiveFilter("scanned")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeFilter === "scanned"
                  ? "bg-white text-green-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Scanned ({currentPoItems?.filter((item) => item.id).length || 0})
            </button>
            <button
              onClick={() => setActiveFilter("pending")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeFilter === "pending"
                  ? "bg-white text-orange-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Pending ({currentPoItems?.filter((item) => !item.id).length || 0})
            </button>
          </div>
        </div>

        {/* Generate summary data for table */}
        {(() => {
          const { summaryData, itemsWithoutSizes, itemsWithIncompleteSizes } =
            generateSummaryData();

          console.log("=== SUMMARY MODAL DEBUG ===");
          console.log("summaryData:", summaryData);
          console.log("itemsWithoutSizes:", itemsWithoutSizes);
          console.log("itemsWithIncompleteSizes:", itemsWithIncompleteSizes);
          console.log("activeFilter:", activeFilter);

          const filteredSummaryData = summaryData.filter((item: any) => {
            if (activeFilter === "all") return true;
            if (activeFilter === "scanned") return item.status === "scanned";
            if (activeFilter === "pending") return item.status === "pending";
            return true;
          });

          console.log("filteredSummaryData:", filteredSummaryData);
          console.log("=== END SUMMARY MODAL DEBUG ===");

          return (
            <>
              {/* Warning for items without sizes */}
              {itemsWithoutSizes.length > 0 && (
                <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span className="font-medium text-orange-800">
                      Belum memasukkan ukuran untuk:
                    </span>
                  </div>
                  <div className="space-y-1">
                    {itemsWithoutSizes.map((item, index) => (
                      <div key={index} className="text-sm text-orange-700">
                        • {item.field} ({item.quantity} pcs)
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 text-xs text-orange-600">
                    Klik ikon penggaris untuk memasukkan breakdown ukuran
                  </div>
                </div>
              )}

              {/* Warning for items with incomplete sizes */}
              {itemsWithIncompleteSizes.length > 0 && (
                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="font-medium text-yellow-800">
                      Masih kurang ukuran untuk dilengkapi:
                    </span>
                  </div>
                  <div className="space-y-1">
                    {itemsWithIncompleteSizes.map((item, index) => (
                      <div key={index} className="text-sm text-yellow-700">
                        • {item.field} - masih kurang {item.missing} ukuran (
                        {item.current}/{item.required})
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 text-xs text-yellow-600">
                    Klik ikon penggaris untuk melengkapi breakdown ukuran
                  </div>
                </div>
              )}

              {filteredSummaryData.length > 0 ? (
                <Table
                  columns={columns}
                  dataSource={filteredSummaryData}
                  pagination={false}
                  size="small"
                  className="summary-table"
                />
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>No size breakdowns found</p>
                  <p className="text-sm">
                    Add size breakdowns to fields to see them here
                  </p>
                  <div className="mt-4 text-xs text-gray-400">
                    Debug: {summaryData.length} items found,{" "}
                    {filteredSummaryData.length} after filtering
                  </div>
                </div>
              )}
            </>
          );
        })()}
      </div>
    </Modal>
  );
};

export default SummaryModalComponent;
