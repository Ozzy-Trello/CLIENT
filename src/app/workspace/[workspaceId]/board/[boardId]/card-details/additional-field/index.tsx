"use client";

import type React from "react";

import { getItemDetail } from "@api/accurate";
import {
  useCardAdditionalFields,
  useCreateAdditionalField,
  useUpdateAdditionalField,
  useUpdateAdditionalFieldItem,
} from "@hooks/additional-field";
import { useCardDetailContext } from "@providers/card-detail-context";
import type { AdditionalFieldItem } from "@myTypes/additional-field";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Scanner } from "@yudiel/react-qr-scanner";
import { Tabs, Modal, Button, Input, Popover, message, Table } from "antd";
import { useEffect, useState, useRef } from "react";
import { Plus, X, Ruler, BarChart3 } from "lucide-react";
import QRCodeLib from "qrcode";
import jsPDF from "jspdf";
import type { InputRef } from "antd/lib/input/Input";
import { scanQRCode } from "@api/additional-field";

// Import extracted components
import SummaryModalComponent from "./components/SummaryModalComponent";
import SizesModalComponent from "./components/SizesModalComponent";
import CustomSizePopoverComponent from "./components/CustomSizePopoverComponent";
import JumlahPOComponent from "./components/JumlahPOComponent";
import ScannerModalComponent from "./components/ScannerModalComponent";
import TabContentComponent from "./components/TabContentComponent";
import type {
  SizeBreakdown,
  SizesModalState,
  SummaryModalState,
  QRCodeModalState,
  ItemDetail,
  AdditionalTab,
} from "./components/types";

// Using the type from our types file instead of local interface
// type ItemDetail = AdditionalFieldItem; // Removed duplicate declaration

// --- Calculation utility functions ---
/**
 * Est Bahan (Estimated Material)
 * Formula (provided by user):
 * (
 *   (Polo TPD / 3.15) +
 *   (Polo TPJ / 2.6) +
 *   (Polo TNK / 1.95) +
 *   (Oblong TPD / 4.35) +
 *   (Oblong TPJ / 3.65) +
 *   (Oblong TNK / 3) +
 *   (Total Jml Hoodie / 1.33) +
 *   (Kemeja TPD * 1.3) +
 *   (Kemeja TPJ * 1.5) +
 *   (Total Jml Jaket * 1.5) +
 *   (Total Jml Rompi * 1.2) +
 *   (Total Jml Celana * 1.2) +
 *   (Total Jml Apron * 1.5) +
 *   (Total Jml Jersey / 4)
 * )
 *
 * Each field is taken from item.additionalFields (per tabKey/fieldKey conventions)
 */
function calculateEstBahan(item: ItemDetail): number {
  if (!item.additionalFields) return 0;

  const get = (tab: string, field: string): number => {
    // Ensure the value is a valid number with 3 decimal places
    return Number.parseFloat(
      Number(item.additionalFields?.[tab]?.[field] ?? 0).toFixed(2)
    );
  };

  const result =
    get("1", "poloTpd") / 3.15 +
    get("1", "poloTpj") / 2.6 +
    get("1", "poloTpk") / 1.95 +
    get("2", "oblongTpd") / 4.35 +
    get("2", "oblongTpj") / 3.65 +
    get("2", "oblongTpk") / 3 +
    get("5", "hoodie") / 1.33 +
    get("3", "kemejaTpd") * 1.3 +
    get("3", "kemejaTpj") * 1.5 +
    get("4", "jaket") * 1.5 +
    get("7", "rompi") * 1.2 +
    get("6", "celana") * 1.2 +
    get("9", "apron") * 1.5 +
    get("8", "jersey") / 4;

  // Return the result with exactly 3 decimal places
  return Number.parseFloat(result.toFixed(2));
}

/**
 * Bahan Terpakai (Material Used)
 * Formula: Bahan Terpakai = usedAmount
 * - usedAmount: The actual amount of material used for this item (from Accurate)
 */
function calculateBahanTerpakai(item: ItemDetail): number {
  return Number((item.usedAmount || 0) - (item.remainingAmount || 0)) || 0;
}

/**
 * Efisiensi (Efficiency)
 * Formula: Efisiensi = ((Est Bahan - Bahan Terpakai) / Est Bahan) * 100
 * - Est Bahan: Estimated material needed (see above)
 * - Bahan Terpakai: Actual material used (see above)
 * - Returns efficiency as a percentage (0 if Est Bahan is 0)
 */
function calculateEfisiensi(item: ItemDetail): number {
  const estBahan = calculateEstBahan(item);
  return Number.parseFloat((estBahan - (item.remainingAmount || 0)).toFixed(2));
}

// Tab names configuration
const tabNames: AdditionalTab[] = [
  {
    key: "1",
    label: "Polo",
    fields: {
      poloTpj: {
        label: "Polo TPJ",
        value: 0,
      },
      poloTpk: {
        label: "Polo TPK",
        value: 0,
      },
      poloTpd: {
        label: "Polo TPD",
        value: 0,
      },
      poloTotal: {
        label: "Total Polo",
        value: 0,
      },
    },
  },
  {
    key: "2",
    label: "Oblong",
    fields: {
      oblongTpj: {
        label: "Oblong TPJ",
        value: 0,
      },
      oblongTpk: {
        label: "Oblong TPK",
        value: 0,
      },
      oblongTpd: {
        label: "Oblong TPD",
        value: 0,
      },
      oblongTotal: {
        label: "Total Oblong",
        value: 0,
      },
    },
  },
  {
    key: "3",
    label: "Kemeja",
    fields: {
      kemejaTpj: {
        label: "Kemeja TPJ",
        value: 0,
      },
      kemejaTpd: {
        label: "Kemeja TPD",
        value: 0,
      },
      kemejaTotal: {
        label: "Total Kemeja",
        value: 0,
      },
    },
  },
  {
    key: "4",
    label: "Jaket",
    fields: {
      jaket: {
        label: "Total Jaket",
        value: 0,
      },
    },
  },
  {
    key: "5",
    label: "Hoodie",
    fields: { hoodie: { label: "Total Hoodie", value: 0 } },
  },
  {
    key: "6",
    label: "Celana",
    fields: { celana: { label: "Total Celana", value: 0 } },
  },
  {
    key: "7",
    label: "Rompi",
    fields: { rompi: { label: "Total Rompi", value: 0 } },
  },
  {
    key: "8",
    label: "Jersey",
    fields: { jersey: { label: "Total Jersey", value: 0 } },
  },
  {
    key: "9",
    label: "Apron",
    fields: { apron: { label: "Total Apron", value: 0 } },
  },
  {
    key: "10",
    label: "Topi",
    fields: { topi: { label: "Total Topi", value: 0 } },
  },
];

const baseInputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-4 text-xs py-2 text-gray-900 text-base focus:outline-none focus:ring-2 focus:ring-blue-200 transition placeholder-gray-400 shadow-none appearance-none";

const labelClass =
  "block text-[15px] font-medium text-gray-800 mb-1 flex items-center gap-2";

const sectionTitleClass =
  "text-[20px] font-semibold text-gray-900 mb-2 flex items-center gap-2";

const AdditionalFields: React.FC = () => {
  const { selectedCard } = useCardDetailContext();
  const cardId: string = selectedCard?.id || "";
  const queryClient = useQueryClient();

  const [scannedItems, setScannedItems] = useState<ItemDetail[]>([]);
  const [poScannedItems, setPoScannedItems] = useState<
    Record<number, ItemDetail[]>
  >({});
  const [currentScannedId, setCurrentScannedId] = useState<string | null>(null);
  const [butuhBahan, setButuhBahan] = useState<Record<number, boolean>>({});

  // Save butuhBahan state when it changes
  const handleButuhBahanChange = (poId: number, value: boolean) => {
    setButuhBahan((prev) => ({ ...prev, [poId]: value }));

    // Save to database immediately when butuhBahan changes
    const currentData = {
      poScannedItems: poScannedItems,
      butuhBahan: { ...butuhBahan, [poId]: value },
      jumlahPO: jumlahPO,
    };

    if (additionalFieldId) {
      updateMutation.mutate(currentData);
    } else {
      createMutation.mutate(currentData);
    }
  };

  // Save jumlahPO state when it changes
  const handleJumlahPOChange = (value: number) => {
    setJumlahPO(value);

    // Save to database immediately when jumlahPO changes
    const currentData = {
      poScannedItems: poScannedItems,
      butuhBahan: butuhBahan,
      jumlahPO: value,
    };

    if (additionalFieldId) {
      updateMutation.mutate(currentData);
    } else {
      createMutation.mutate(currentData);
    }
  };
  const [showScanner, setShowScanner] = useState(false);
  const [currentPoForScan, setCurrentPoForScan] = useState<number>(1);
  const [additionalFieldId, setAdditionalFieldId] = useState<string | null>(
    null
  );

  // Sizes modal state
  const [sizesModal, setSizesModal] = useState<SizesModalState>({
    isOpen: false,
    itemIndex: 0,
    tabKey: "",
    fieldKey: "",
    totalQuantity: 0,
  });

  // Summary modal state
  const [summaryModal, setSummaryModal] = useState<SummaryModalState>({
    isOpen: false,
    itemIndex: 0,
  });

  // QR Scanner state
  const [qrScannerBuffer, setQrScannerBuffer] = useState("");
  const qrScannerTimeoutRef = useRef<NodeJS.Timeout>();
  const qrScannerBufferRef = useRef("");

  // Jumlah PO state
  const [jumlahPO, setJumlahPO] = useState<number>(1);

  const { data: additionalFieldData } = useCardAdditionalFields(cardId);

  // Load data from additionalFieldData
  useEffect(() => {
    if (additionalFieldData && additionalFieldData.length > 0) {
      try {
        const firstItem = additionalFieldData[0];
        const savedData =
          typeof firstItem.data === "string"
            ? JSON.parse(firstItem.data)
            : firstItem.data;

        // Handle both old and new data structures
        if (savedData.poScannedItems) {
          // New structure with poScannedItems
          setPoScannedItems(savedData.poScannedItems);
          if (savedData.butuhBahan) {
            setButuhBahan(savedData.butuhBahan);
          }
          if (savedData.jumlahPO) {
            setJumlahPO(savedData.jumlahPO);
          }
        } else if (Array.isArray(savedData)) {
          // Old structure - array of items
          setScannedItems(savedData);
        }
      } catch (error) {
        console.error("Error loading additional field data:", error);
      }
    }
  }, [additionalFieldData]);

  const { data: itemDetail, error } = useQuery({
    queryKey: ["itemDetail", currentScannedId],
    queryFn: async () => {
      if (!currentScannedId) throw new Error("No scanned item ID");
      const response = await getItemDetail(currentScannedId);
      return response.data;
    },
    enabled: !!currentScannedId,
  });

  const createMutation = useCreateAdditionalField(cardId);
  const updateMutation = useUpdateAdditionalField(
    additionalFieldId || "",
    cardId
  );

  // Update specific item mutation
  const updateItemMutation = useUpdateAdditionalFieldItem(
    additionalFieldId || "",
    cardId
  );

  // QR Scanner handler - only active when summary modal is open
  useEffect(() => {
    const handleQRScanner = (e: KeyboardEvent) => {
      // Only handle QR scanning when summary modal is open
      if (!summaryModal.isOpen) return;

      // Clear any existing timeout
      if (qrScannerTimeoutRef.current) {
        clearTimeout(qrScannerTimeoutRef.current);
      }

      if (e.key === "Enter") {
        e.preventDefault();
        processQRScan(qrScannerBufferRef.current);
        qrScannerBufferRef.current = "";
      } else if (e.key.length === 1) {
        // Add character to buffer
        qrScannerBufferRef.current += e.key;

        // Clear buffer after 100ms of no input (typical for external scanners)
        qrScannerTimeoutRef.current = setTimeout(() => {
          qrScannerBufferRef.current = "";
        }, 100);
      }
    };

    // Only add listener when summary modal is open
    if (summaryModal.isOpen) {
      document.addEventListener("keydown", handleQRScanner);
    }

    return () => {
      document.removeEventListener("keydown", handleQRScanner);
      if (qrScannerTimeoutRef.current) {
        clearTimeout(qrScannerTimeoutRef.current);
      }
    };
  }, [summaryModal.isOpen]); // Removed qrScannerBuffer from dependencies

  const processQRScan = async (scannedData: string) => {
    if (!scannedData.trim()) return;

    try {
      console.log("=== FRONTEND QR SCAN DEBUG ===");
      console.log("Raw scanned data:", scannedData);

      // Parse the scanned data: cardId|scannedData|action
      const parts = scannedData.split("|");
      let cardId, data, action;

      console.log("Split parts:", parts);

      if (parts.length >= 2) {
        cardId = parts[0];
        data = parts[1];
        action = parts[2] || "mark_complete";
      } else {
        throw new Error("Invalid QR scan format");
      }

      console.log("Parsed parameters:");
      console.log("- cardId:", cardId);
      console.log("- data:", data);
      console.log("- action:", action);

      if (!cardId || !data) {
        throw new Error("Missing cardId or scannedData");
      }

      console.log("Calling scanQRCode API...");

      // Call the QR scan API
      const response = await scanQRCode(cardId, data, action as any);

      console.log("API response:", response);
      console.log("=== END FRONTEND QR SCAN DEBUG ===");

      if (response.statusCode === 200) {
        message.success("Item scanned successfully!");

        // Invalidate the additional fields query to refresh the data
        await queryClient.invalidateQueries({
          queryKey: ["additionalFields", cardId],
        });

        // Optionally refetch the data immediately
        await queryClient.refetchQueries({
          queryKey: ["additionalFields", cardId],
        });
      } else {
        message.error(response.message || "Failed to process scan");
      }
    } catch (error) {
      console.error("QR scan error:", error);
      message.error("Failed to process QR scan. Please try again.");
    }
  };

  // Helper functions for sizes
  const updateSizeBreakdown = (
    itemIndex: number,
    tabKey: string,
    fieldKey: string,
    size: string,
    quantity: number,
    customSizeName?: string
  ) => {
    setScannedItems((prevItems) => {
      const updatedItems = [...prevItems];
      const sizesKey = `sizes_${tabKey}_${fieldKey}`;

      if (!updatedItems[itemIndex].additionalFields) {
        updatedItems[itemIndex].additionalFields = {};
      }

      if (!updatedItems[itemIndex].additionalFields[sizesKey]) {
        updatedItems[itemIndex].additionalFields[sizesKey] = {
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
        } as unknown as Record<string, any>;
      }

      if (size === "custom" && customSizeName) {
        // Handle custom size
        const currentSizes = updatedItems[itemIndex].additionalFields[
          sizesKey
        ] as any;
        currentSizes.custom = {
          ...currentSizes.custom,
          [customSizeName]: quantity,
        };
      } else if (size !== "custom") {
        // Handle standard size
        const currentSizes = updatedItems[itemIndex].additionalFields[
          sizesKey
        ] as any;
        currentSizes[size] = quantity;
      }

      // Save to database
      if (additionalFieldId) {
        updateMutation.mutate(updatedItems);
      }

      return updatedItems;
    });
  };

  const removeCustomSize = (
    itemIndex: number,
    tabKey: string,
    fieldKey: string,
    customSizeName: string
  ) => {
    setScannedItems((prevItems) => {
      const updatedItems = [...prevItems];
      const sizesKey = `sizes_${tabKey}_${fieldKey}`;

      const currentSizes = updatedItems[itemIndex].additionalFields?.[
        sizesKey
      ] as any;

      if (currentSizes?.custom) {
        delete currentSizes.custom[customSizeName];
      }

      // Save to database
      if (additionalFieldId) {
        updateMutation.mutate(updatedItems);
      }

      return updatedItems;
    });
  };

  // Sizes modal handlers
  const openSizesModal = (
    itemIndex: number,
    tabKey: string,
    fieldKey: string,
    totalQuantity: number,
    poIdentifier?: number
  ) => {
    setSizesModal({
      isOpen: true,
      itemIndex,
      tabKey: poIdentifier ? `${poIdentifier}_${tabKey}` : tabKey,
      fieldKey,
      totalQuantity,
    });
  };

  const closeSizesModal = () => {
    setSizesModal({
      isOpen: false,
      itemIndex: 0,
      tabKey: "",
      fieldKey: "",
      totalQuantity: 0,
    });
  };

  // Summary modal handlers
  const openSummaryModal = (itemIndex: number) => {
    setSummaryModal({
      isOpen: true,
      itemIndex,
    });
  };

  const closeSummaryModal = () => {
    setSummaryModal({
      isOpen: false,
      itemIndex: 0,
    });
  };

  // Load existing data when component mounts
  useEffect(() => {
    // console.log(additionalFieldData, "<< in iisinya apa");
    if (additionalFieldData && additionalFieldData.length > 0) {
      const existingData = additionalFieldData[0];
      setAdditionalFieldId(existingData.id);

      // Handle data that might be a string or already an object
      let parsedData;
      if (typeof existingData.data === "string") {
        parsedData = JSON.parse(existingData.data);
      } else {
        parsedData = existingData.data;
      }

      // For backward compatibility, if the data is an array (old single-PO format),
      // convert it to the new multi-PO format
      if (Array.isArray(parsedData)) {
        // Old format: array of items
        setScannedItems(parsedData || []);
        // Convert to new format: PO-specific items
        setPoScannedItems({ 1: parsedData || [] });
      } else if (parsedData && typeof parsedData === "object") {
        // New format: PO-specific items
        if (parsedData.poScannedItems) {
          // New structure with poScannedItems, butuhBahan, jumlahPO
          setPoScannedItems(parsedData.poScannedItems);
          if (parsedData.butuhBahan) {
            setButuhBahan(parsedData.butuhBahan);
          }
          if (parsedData.jumlahPO) {
            setJumlahPO(parsedData.jumlahPO);
          }
          // For backward compatibility, flatten all PO items into scannedItems
          const allItems = Object.values(
            parsedData.poScannedItems
          ).flat() as ItemDetail[];
          setScannedItems(allItems);
        } else {
          // Old format: direct PO items
          setPoScannedItems(parsedData);
          // For backward compatibility, flatten all PO items into scannedItems
          const allItems = Object.values(parsedData).flat() as ItemDetail[];
          setScannedItems(allItems);
        }
      } else {
        setScannedItems([]);
        setPoScannedItems({});
      }
    }
  }, [additionalFieldData]);

  // Handle new scanned items
  useEffect(() => {
    if (itemDetail && currentScannedId) {
      console.log("=== PROCESS SCANNED ITEM DEBUG ===");
      console.log("itemDetail:", itemDetail);
      console.log("currentScannedId:", currentScannedId);
      console.log("currentPoForScan:", currentPoForScan);

      const initialFields: Record<string, Record<string, number>> = {};

      tabNames.forEach((tab) => {
        initialFields[tab.key] = {};
        Object.keys(tab.fields).forEach((fieldKey) => {
          initialFields[tab.key][fieldKey] = 0;
        });
      });

      const newItem = {
        id: currentScannedId,
        name: itemDetail.name,
        color: itemDetail.color,
        variant: itemDetail.variant,
        pattern: itemDetail.pattern,
        remainingAmount: itemDetail.remainingAmount,
        usedAmount: itemDetail.usedAmount,
        estimatedProduction: itemDetail.estimatedProduction,
        additionalFields: initialFields,
      };

      console.log("New item to add:", newItem);

      // Add to the specific PO that's currently being scanned
      setPoScannedItems((prevPoItems) => {
        console.log("Previous PO items:", prevPoItems);
        const currentPoItems = prevPoItems[currentPoForScan] || [];
        console.log(
          "Current PO items for PO",
          currentPoForScan,
          ":",
          currentPoItems
        );
        const updatedPoItems = [...currentPoItems, newItem];
        console.log(
          "Updated PO items for PO",
          currentPoForScan,
          ":",
          updatedPoItems
        );
        const updatedPoScannedItems = {
          ...prevPoItems,
          [currentPoForScan]: updatedPoItems,
        };
        console.log("Final updated PO scanned items:", updatedPoScannedItems);

        // Save to database - save the multi-PO structure with butuhBahan state
        const dataToSave = {
          poScannedItems: updatedPoScannedItems,
          butuhBahan: butuhBahan,
          jumlahPO: jumlahPO,
        };

        if (additionalFieldId) {
          // Update existing record with multi-PO data
          updateMutation.mutate(dataToSave);
        } else {
          // Create new record with multi-PO data
          createMutation.mutate(dataToSave);
        }

        return updatedPoScannedItems;
      });

      // Also update the legacy scannedItems for backward compatibility
      setScannedItems((prevItems) => {
        const updatedItems = [...(prevItems || []), newItem];
        return updatedItems;
      });

      setCurrentScannedId(null);
    }
  }, [
    itemDetail,
    currentScannedId,
    additionalFieldId,
    cardId,
    updateMutation,
    createMutation,
    currentPoForScan,
  ]);

  // Global keyboard listener for external scanner - DISABLED when summary modal is open
  useEffect(() => {
    let scannedBuffer = "";
    let bufferTimeout: NodeJS.Timeout;

    const handleKeyPress = (e: KeyboardEvent) => {
      // Skip if summary modal is open (QR scanning is active)
      if (summaryModal.isOpen) return;

      // Reset buffer if too much time has passed
      clearTimeout(bufferTimeout);

      if (e.key === "Enter") {
        e.preventDefault();
        if (scannedBuffer.trim()) {
          const scannedValue = scannedBuffer.trim();

          // Check if the scanned value is a URL
          if (
            scannedValue.startsWith("http://") ||
            scannedValue.startsWith("https://")
          ) {
            // It's a URL - open it in a new tab
            window.open(scannedValue, "_blank");
            scannedBuffer = "";
            return;
          }

          // If it's not a URL, treat it as an item ID
          setCurrentScannedId(scannedValue);
          scannedBuffer = "";
        }
      } else if (e.key.length === 1) {
        // Add character to buffer
        scannedBuffer += e.key;

        // Clear buffer after 100ms of no input (typical for external scanners)
        bufferTimeout = setTimeout(() => {
          scannedBuffer = "";
        }, 100);
      }
    };

    // Only listen when scanner is not active and summary modal is closed
    if (!showScanner && !summaryModal.isOpen) {
      document.addEventListener("keydown", handleKeyPress);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyPress);
      clearTimeout(bufferTimeout);
    };
  }, [showScanner, summaryModal.isOpen]);

  const handleFieldChange = (
    itemIndex: number,
    tabKey: string,
    fieldKey: string,
    value: string,
    poIdentifier?: number
  ) => {
    if (poIdentifier) {
      // Handle PO-specific data
      setPoScannedItems((prevPoItems) => {
        const currentPoItems = prevPoItems[poIdentifier] || [];
        const updatedItems = [...currentPoItems];

        // Accept comma or dot as decimal separator
        const numericValue = Number.parseFloat(value.replace(",", "."));

        // Store raw string for editing (only for these fields)
        if (!updatedItems[itemIndex].__rawInputs)
          updatedItems[itemIndex].__rawInputs = {};

        // Include PO identifier in the key if provided
        const rawInputKey = poIdentifier
          ? `${poIdentifier}_${tabKey}.${fieldKey}`
          : `${tabKey}.${fieldKey}`;
        updatedItems[itemIndex].__rawInputs[rawInputKey] = value;

        // Update nested additionalFields
        if (updatedItems[itemIndex].additionalFields) {
          // Create PO-specific key if PO identifier is provided
          const actualTabKey = poIdentifier
            ? `${poIdentifier}_${tabKey}`
            : tabKey;

          if (!updatedItems[itemIndex].additionalFields[actualTabKey]) {
            updatedItems[itemIndex].additionalFields[actualTabKey] = {};
          }

          updatedItems[itemIndex].additionalFields[actualTabKey] = {
            ...updatedItems[itemIndex].additionalFields[actualTabKey],
            [fieldKey]: numericValue,
          };
        }

        // Clean up old status entries when quantity changes
        const sizesKey = poIdentifier
          ? `sizes_${poIdentifier}_${tabKey}_${fieldKey}`
          : `sizes_${tabKey}_${fieldKey}`;
        const sizeData = updatedItems[itemIndex].additionalFields?.[
          sizesKey
        ] as any;
        if (sizeData?.status) {
          const newQuantity = numericValue;
          const currentStatusEntries = Object.keys(sizeData.status);

          // Remove status entries that exceed the new quantity
          currentStatusEntries.forEach((statusKey) => {
            // Extract the unique ID from status key (e.g., "xs15" -> 15)
            const match = statusKey.match(/\d+$/);
            if (match) {
              const uniqueId = parseInt(match[0]);
              if (uniqueId > newQuantity) {
                delete sizeData.status[statusKey];
              }
            }
          });
        }

        // Reset size breakdown quantities when main quantity changes
        if (sizeData) {
          const newQuantity = numericValue;
          const oldTotal = Object.entries(sizeData).reduce(
            (total, [key, value]) => {
              if (
                key !== "status" &&
                key !== "custom" &&
                typeof value === "number"
              ) {
                return total + value;
              }
              return total;
            },
            0
          );

          // If the total has changed, reset all size quantities to 0
          if (oldTotal !== newQuantity) {
            Object.keys(sizeData).forEach((key) => {
              if (key !== "status" && key !== "custom") {
                sizeData[key] = 0;
              }
            });
            // Clear status entries since quantities are reset
            if (sizeData.status) {
              sizeData.status = {};
            }
          }
        }

        // Special handling for Terloading (usedAmount) and Sisa Bahan (remainingAmount)
        if (
          (tabKey === "materialUsage" && fieldKey === "bahanTerpakai") ||
          (tabKey === "materialUsage" && fieldKey === "usedAmount")
        ) {
          updatedItems[itemIndex].usedAmount = numericValue;
        }

        if (
          (tabKey === "remainingAmount" && fieldKey === "remainingAmount") ||
          (tabKey === "materialUsage" && fieldKey === "sisaBahan")
        ) {
          updatedItems[itemIndex].remainingAmount = numericValue;
        }

        // Update total fields for tabs < 4
        tabNames.forEach((tab) => {
          if (tab.key === tabKey) {
            const actualTabKey = poIdentifier
              ? `${poIdentifier}_${tabKey}`
              : tabKey;
            Object.keys(tab.fields).forEach((key) => {
              if (key.toLowerCase().includes("total") && +tab.key < 4) {
                updatedItems[itemIndex].additionalFields[actualTabKey][key] =
                  calculateTotalForField(actualTabKey, key, itemIndex);
              }
            });
          }
        });

        return {
          ...prevPoItems,
          [poIdentifier]: updatedItems,
        };
      });
    } else {
      // Handle legacy data (fallback)
      setScannedItems((prevItems) => {
        const updatedItems = [...prevItems];

        // Accept comma or dot as decimal separator
        const numericValue = Number.parseFloat(value.replace(",", "."));

        // Store raw string for editing (only for these fields)
        if (!updatedItems[itemIndex].__rawInputs)
          updatedItems[itemIndex].__rawInputs = {};

        // Include PO identifier in the key if provided
        const rawInputKey = poIdentifier
          ? `${poIdentifier}_${tabKey}.${fieldKey}`
          : `${tabKey}.${fieldKey}`;
        updatedItems[itemIndex].__rawInputs[rawInputKey] = value;

        // Update nested additionalFields
        if (updatedItems[itemIndex].additionalFields) {
          // Create PO-specific key if PO identifier is provided
          const actualTabKey = poIdentifier
            ? `${poIdentifier}_${tabKey}`
            : tabKey;

          if (!updatedItems[itemIndex].additionalFields[actualTabKey]) {
            updatedItems[itemIndex].additionalFields[actualTabKey] = {};
          }

          updatedItems[itemIndex].additionalFields[actualTabKey] = {
            ...updatedItems[itemIndex].additionalFields[actualTabKey],
            [fieldKey]: numericValue,
          };
        }

        // Clean up old status entries when quantity changes
        const sizesKey = poIdentifier
          ? `sizes_${poIdentifier}_${tabKey}_${fieldKey}`
          : `sizes_${tabKey}_${fieldKey}`;
        const sizeData = updatedItems[itemIndex].additionalFields?.[
          sizesKey
        ] as any;
        if (sizeData?.status) {
          const newQuantity = numericValue;
          const currentStatusEntries = Object.keys(sizeData.status);

          // Remove status entries that exceed the new quantity
          currentStatusEntries.forEach((statusKey) => {
            // Extract the unique ID from status key (e.g., "xs15" -> 15)
            const match = statusKey.match(/\d+$/);
            if (match) {
              const uniqueId = parseInt(match[0]);
              if (uniqueId > newQuantity) {
                delete sizeData.status[statusKey];
              }
            }
          });
        }

        // Reset size breakdown quantities when main quantity changes
        if (sizeData) {
          const newQuantity = numericValue;
          const oldTotal = Object.entries(sizeData).reduce(
            (total, [key, value]) => {
              if (
                key !== "status" &&
                key !== "custom" &&
                typeof value === "number"
              ) {
                return total + value;
              }
              return total;
            },
            0
          );

          // If the total has changed, reset all size quantities to 0
          if (oldTotal !== newQuantity) {
            Object.keys(sizeData).forEach((key) => {
              if (key !== "status" && key !== "custom") {
                sizeData[key] = 0;
              }
            });
            // Clear status entries since quantities are reset
            if (sizeData.status) {
              sizeData.status = {};
            }
          }
        }

        // Special handling for Terloading (usedAmount) and Sisa Bahan (remainingAmount)
        if (
          (tabKey === "materialUsage" && fieldKey === "bahanTerpakai") ||
          (tabKey === "materialUsage" && fieldKey === "usedAmount")
        ) {
          updatedItems[itemIndex].usedAmount = numericValue;
        }

        if (
          (tabKey === "remainingAmount" && fieldKey === "remainingAmount") ||
          (tabKey === "materialUsage" && fieldKey === "sisaBahan")
        ) {
          updatedItems[itemIndex].remainingAmount = numericValue;
        }

        // Update total fields for tabs < 4
        tabNames.forEach((tab) => {
          if (tab.key === tabKey) {
            const actualTabKey = poIdentifier
              ? `${poIdentifier}_${tabKey}`
              : tabKey;
            Object.keys(tab.fields).forEach((key) => {
              if (key.toLowerCase().includes("total") && +tab.key < 4) {
                updatedItems[itemIndex].additionalFields[actualTabKey][key] =
                  calculateTotalForField(actualTabKey, key, itemIndex);
              }
            });
          }
        });

        return updatedItems;
      });
    }
  };

  const handleScan = (codes: any) => {
    if (codes.length > 0) {
      const scannedValue = codes[0].rawValue;

      // Check if scannedValue exists and is a string
      if (!scannedValue || typeof scannedValue !== "string") {
        console.error("Invalid scanned value:", scannedValue);
        return;
      }

      // Check if the scanned value is a URL
      if (
        scannedValue.startsWith("http://") ||
        scannedValue.startsWith("https://")
      ) {
        // It's a URL - open it in a new tab
        window.open(scannedValue, "_blank");
        setShowScanner(false);
        return;
      }

      // If it's not a URL, treat it as an item ID
      setCurrentScannedId(scannedValue);
      setShowScanner(false);
    }
  };

  // Wrapper function for camera scanner that converts string to expected format
  const handleCameraScan = (scannedValue: string) => {
    // Convert string to the format expected by handleScan
    const codes = [{ rawValue: scannedValue }];
    handleScan(codes);
  };

  const handleRemoveTab = (targetKey: string) => {
    // Extract PO identifier and item index from targetKey (e.g., "1-2" -> PO 1, item 2)
    const match = targetKey.match(/^(\d+)-(\d+)$/);
    if (match) {
      const poIdentifier = parseInt(match[1]);
      const itemIndex = parseInt(match[2]) - 1;

      setPoScannedItems((prevPoItems) => {
        const currentPoItems = prevPoItems[poIdentifier] || [];
        const updatedPoItems = [...currentPoItems];
        updatedPoItems.splice(itemIndex, 1);

        return {
          ...prevPoItems,
          [poIdentifier]: updatedPoItems,
        };
      });
    } else {
      // Fallback for non-PO specific keys
      const itemIndex = parseInt(targetKey) - 1;
      setScannedItems((prevItems) => {
        const updatedItems = [...prevItems];
        updatedItems.splice(itemIndex, 1);
        return updatedItems;
      });
    }
  };

  const handleSave = () => {
    const dataToSave = scannedItems.map((item, index) => {
      // First, update the total values in the additionalFields
      const updatedAdditionalFields = { ...item.additionalFields };

      // Calculate and update all total fields
      tabNames.forEach((tab) => {
        Object.keys(tab.fields).forEach((fieldKey) => {
          // check if the key is less than 4
          if (fieldKey.toLowerCase().includes("total") && +tab.key < 4) {
            // Update the total value in additionalFields
            if (updatedAdditionalFields && updatedAdditionalFields[tab.key]) {
              updatedAdditionalFields[tab.key][fieldKey] =
                calculateTotalForField(tab.key, fieldKey, index);
            }
          }
        });
      });

      // Now create the fields array with updated values
      const updatedFields = tabNames.map((tab) => ({
        key: tab.key,
        label: tab.label,
        fields: Object.entries(tab.fields).reduce((acc, [fieldKey, field]) => {
          const isTotalField = fieldKey.toLowerCase().includes("total");
          const value = isTotalField
            ? calculateTotalForField(tab.key, fieldKey, index)
            : item.additionalFields?.[tab.key]?.[fieldKey] || 0;

          acc[fieldKey as keyof typeof tab.fields] = {
            label: field.label,
            value: value,
          };
          return acc;
        }, {} as typeof tab.fields),
      }));

      return {
        ...item,
        additionalFields: updatedAdditionalFields,
        fields: updatedFields,
      };
    });

    // Include butuhBahan state in the saved data
    const dataWithButuhBahan = {
      items: dataToSave,
      butuhBahan: butuhBahan,
    };

    console.log(JSON.stringify(dataWithButuhBahan, null, 2)); // Save the data in JSON format (you can replace this with an API call to save the data)
  };

  const calculateTotalForField = (
    tabKey: string,
    fieldKey: string,
    itemIndex: number
  ): number => {
    // Check if this is a PO-specific tab key (e.g., "1_1" for PO 1, tab 1)
    const poMatch = tabKey.match(/^(\d+)_(.+)$/);
    const actualTabKey = poMatch ? poMatch[2] : tabKey;

    // Get the current tab's fields
    const currentTab = tabNames.find((tab) => tab.key === actualTabKey);
    if (!currentTab) return 0;

    // Get all non-total field keys for this tab
    const nonTotalFieldKeys = Object.keys(currentTab.fields).filter(
      (key) => !key.toLowerCase().includes("total")
    );

    // Check if the item exists at the given index
    if (!scannedItems[itemIndex]) {
      // When no scanned items, we can't calculate totals
      // This will be handled by the component's local state
      return 0;
    }

    // Sum up all non-total fields for this item in this tab
    return nonTotalFieldKeys.reduce((sum, key) => {
      const value =
        scannedItems[itemIndex].additionalFields?.[tabKey]?.[key] || 0;
      return sum + Number(value);
    }, 0);
  };

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-4">
        <span className="inline-flex items-center justify-center text-gray-700">
          <svg
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <rect x="5" y="5" width="14" height="14" rx="2"></rect>
            <path d="M9 9h6v6H9z"></path>
          </svg>
        </span>
        <span className="text-[18px] font-semibold text-gray-900">Bahan</span>
      </div>

      {/* Jumlah PO Input */}

      <JumlahPOComponent
        jumlahPO={jumlahPO}
        setJumlahPO={handleJumlahPOChange}
        labelClass={labelClass}
        baseInputClass={baseInputClass}
      />

      {/* Render TabContentComponent based on jumlahPO */}
      <div className="space-y-6">
        {Array.from({ length: jumlahPO }, (_, index) => (
          <TabContentComponent
            key={`po-${index + 1}`}
            poIdentifier={index + 1}
            showScanner={showScanner}
            setShowScanner={setShowScanner}
            error={error}
            scannedItems={poScannedItems[index + 1] || []}
            handleRemoveTab={handleRemoveTab}
            handleFieldChange={handleFieldChange}
            openSizesModal={openSizesModal}
            openSummaryModal={openSummaryModal}
            calculateTotalForField={calculateTotalForField}
            calculateEstBahan={calculateEstBahan}
            calculateBahanTerpakai={calculateBahanTerpakai}
            calculateEfisiensi={calculateEfisiensi}
            tabNames={tabNames}
            labelClass={labelClass}
            baseInputClass={baseInputClass}
            sectionTitleClass={sectionTitleClass}
            onScanButtonClick={() => {
              console.log("=== SCAN BUTTON CLICK DEBUG ===");
              console.log("Setting currentPoForScan to:", index + 1);
              setCurrentPoForScan(index + 1);
            }}
            setCurrentScannedId={setCurrentScannedId}
            butuhBahan={butuhBahan[index + 1] ?? true}
            setButuhBahan={(value) => handleButuhBahanChange(index + 1, value)}
          />
        ))}
      </div>

      {/* Save button removed since data is saved automatically */}

      {showScanner && (
        <ScannerModalComponent
          isOpen={showScanner}
          onClose={() => setShowScanner(false)}
          onScan={handleCameraScan}
        />
      )}

      {sizesModal.isOpen && (
        <SizesModalComponent
          modalState={sizesModal}
          onClose={closeSizesModal}
          scannedItems={scannedItems}
          onUpdateSize={updateSizeBreakdown}
          onRemoveCustomSize={removeCustomSize}
          tabNames={tabNames}
        />
      )}

      {summaryModal.isOpen && (
        <SummaryModalComponent
          modalState={summaryModal}
          onClose={closeSummaryModal}
          scannedItems={scannedItems}
          tabNames={tabNames}
          selectedCard={selectedCard}
        />
      )}
    </div>
  );
};

export default AdditionalFields;
