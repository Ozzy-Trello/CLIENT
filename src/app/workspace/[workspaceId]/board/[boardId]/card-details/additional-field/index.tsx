import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  useAdditionalFieldsStore,
  type POData,
  type BahanItem,
} from "@store/additional-fields-store";
import { SizeBreakdownItem } from "@store/additional-fields-store";
import { SizeBreakdown, SizeBreakdownModalState } from "./types";
import SizeBreakdownModal from "./components/SizeBreakdownModal";
import SummaryModal from "./components/SummaryModal";
import ScannerModalComponent from "./components-unused/ScannerModalComponent";
import {
  useCreateAdditionalField,
  useUpdateAdditionalField,
  useCardAdditionalFields,
} from "@hooks/additional-field";
import { useQueryClient } from "@tanstack/react-query";
import { scanQRCode } from "@api/additional-field";
import { getHikmatItemList } from "@api/accurate";

// Helper function to convert sizeBreakdowns array back to modal format for display
const convertBreakdownsToModalFormat = (
  breakdowns: SizeBreakdownItem[],
  categoryKey: string,
  fieldKey: string
): SizeBreakdown => {
  const filtered = breakdowns.filter(
    (item) => item.category === categoryKey && item.field === fieldKey
  );

  const result: SizeBreakdown = {
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

  // Count quantities for each size
  const sizeCounts: { [key: string]: number } = {};
  const customCounts: { [key: string]: number } = {};

  filtered.forEach((item) => {
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

    if (standardSizes.includes(item.size)) {
      sizeCounts[item.size] = (sizeCounts[item.size] || 0) + 1;
    } else {
      customCounts[item.size] = (customCounts[item.size] || 0) + 1;
    }
  });

  // Apply counts to result
  Object.entries(sizeCounts).forEach(([size, count]) => {
    (result as any)[size] = count;
  });

  if (Object.keys(customCounts).length > 0) {
    result.custom = customCounts;
  }

  return result;
};
import { message, Tabs } from "antd";
import { debounce } from "lodash";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { selectTheme, selectIsDarkMode } from "@store/app_slice";
import { useRealtimeUpdates } from "@hooks/websocket";

// Product categories definition - following legacy tabNames structure
const productCategories = [
  {
    key: "polo",
    label: "Polo",
    fields: [
      { key: "poloTpj", label: "Polo TPJ", type: "number" },
      { key: "poloTnk", label: "Polo TNK", type: "number" },
      { key: "poloTpd", label: "Polo TPD", type: "number" },
      { key: "poloTotal", label: "Total Polo", type: "number", isTotal: true },
      { key: "custom", label: "Custom", type: "sizeBreakdown" },
    ],
  },
  {
    key: "oblong",
    label: "Oblong",
    fields: [
      { key: "oblongTpj", label: "Oblong TPJ", type: "number" },
      { key: "oblongTnk", label: "Oblong TNK", type: "number" },
      { key: "oblongTpd", label: "Oblong TPD", type: "number" },
      {
        key: "oblongTotal",
        label: "Total Oblong",
        type: "number",
        isTotal: true,
      },
      { key: "custom", label: "Custom", type: "sizeBreakdown" },
    ],
  },
  {
    key: "kemeja",
    label: "Kemeja",
    fields: [
      { key: "kemejaTpj", label: "Kemeja TPJ", type: "number" },
      { key: "kemejaTpd", label: "Kemeja TPD", type: "number" },
      {
        key: "kemejaTotal",
        label: "Total Kemeja",
        type: "number",
        isTotal: true,
      },
      { key: "custom", label: "Custom", type: "sizeBreakdown" },
    ],
  },
  {
    key: "jaket",
    label: "Jaket",
    fields: [
      { key: "jaket", label: "Total Jaket", type: "number", isTotal: true },
      { key: "custom", label: "Custom", type: "sizeBreakdown" },
    ],
  },
  {
    key: "hoodie",
    label: "Hoodie",
    fields: [
      { key: "hoodie", label: "Total Hoodie", type: "number", isTotal: true },
      { key: "custom", label: "Custom", type: "sizeBreakdown" },
    ],
  },
  {
    key: "celana",
    label: "Celana",
    fields: [
      { key: "celana", label: "Total Celana", type: "number", isTotal: true },
      { key: "custom", label: "Custom", type: "sizeBreakdown" },
    ],
  },
  {
    key: "rompi",
    label: "Rompi",
    fields: [
      { key: "rompi", label: "Total Rompi", type: "number", isTotal: true },
      { key: "custom", label: "Custom", type: "sizeBreakdown" },
    ],
  },
  {
    key: "jersey",
    label: "Jersey",
    fields: [
      { key: "jersey", label: "Total Jersey", type: "number", isTotal: true },
      { key: "custom", label: "Custom", type: "sizeBreakdown" },
    ],
  },
  {
    key: "apron",
    label: "Apron",
    fields: [
      { key: "apron", label: "Total Apron", type: "number", isTotal: true },
      { key: "custom", label: "Custom", type: "sizeBreakdown" },
    ],
  },
  {
    key: "topi",
    label: "Topi",
    fields: [
      { key: "topi", label: "Total Topi", type: "number", isTotal: true },
      { key: "custom", label: "Custom", type: "sizeBreakdown" },
    ],
  },
];

interface AdditionalFieldsProps {
  cardId: string;
}

// Move this outside the component to prevent recreation on every render
const createNewBahanItem = (index: number): BahanItem => ({
  id: `bahan-${Date.now()}-${index}`,
  butuhBahan: true,
  name: "",
  bahanId: "",
  detailProduk: {
    polo: {
      tpj: {},
      tnk: {},
      tpd: {},
    },
    oblong: {
      tpj: {},
      tnk: {},
      tpd: {},
    },
    kemeja: {
      tpj: {},
      tpd: {},
    },
    jaket: {
      total: {},
    },
    hoodie: {
      total: {},
    },
  },
});

const AdditionalFields: React.FC<AdditionalFieldsProps> = ({ cardId }) => {
  const theme = useSelector(selectTheme);
  const isDarkMode = useSelector(selectIsDarkMode);
  const { colors } = theme;

  const [produk, setProduk] = useState<string>("Sample Product Name");
  const [jumlahPOInput, setJumlahPOInput] = useState<string>("1");
  const [summaryModal, setSummaryModal] = useState<{
    isOpen: boolean;
    poIndex: number;
    poData: any;
    poId: string | null;
  }>({ isOpen: false, poIndex: 0, poData: null, poId: null });
  const [scannerModal, setScannerModal] = useState<{
    isOpen: boolean;
    poId: string;
    bahanItem?: BahanItem;
  }>({ isOpen: false, poId: "" });
  const [sizeBreakdownModal, setSizeBreakdownModal] = useState<{
    isOpen: boolean;
    categoryKey: string;
    fieldKey: string;
    sizeData: any; // You might want to define a more specific type for sizeData
    bahanItem?: any; // The current bahan item being edited
  }>({ isOpen: false, categoryKey: "", fieldKey: "", sizeData: undefined, bahanItem: undefined });
  const [additionalFieldId, setAdditionalFieldId] = useState<string | null>(
    null
  );
  const [lastRefetchTime, setLastRefetchTime] = useState<number>(Date.now());

  // QR Scanner state
  const [qrScannerBuffer, setQrScannerBuffer] = useState("");
  const qrScannerTimeoutRef = useRef<NodeJS.Timeout>();
  const qrScannerBufferRef = useRef("");

  // Zustand store
  const { qty, data, setQty, updatePOData, loadData, reset } =
    useAdditionalFieldsStore();

  const currentPO = data.find((po) => po.id === cardId) || data[0]; // Assuming cardId matches a PO ID or take the first one

  // Database hooks
  const queryClient = useQueryClient();
  const { data: additionalFieldData, refetch: refetchAdditionalFields } =
    useCardAdditionalFields(cardId);
  const createMutation = useCreateAdditionalField(cardId);
  const updateMutation = useUpdateAdditionalField(
    additionalFieldId || "",
    cardId
  );

  // WebSocket for real-time updates
  const { socket, isConnected } = useRealtimeUpdates();

  // Debug WebSocket connection status
  useEffect(() => {
    // WebSocket connection status tracking
  }, [isConnected]);

  // Load existing data when component mounts or when fresh data arrives
  useEffect(() => {

    if (additionalFieldData && additionalFieldData.length > 0) {
      const savedData = additionalFieldData[0];
      setAdditionalFieldId(savedData.id);

      try {
        const parsedData =
          typeof savedData.data === "string"
            ? JSON.parse(savedData.data)
            : savedData.data;

        if (parsedData && typeof parsedData === "object") {
          // Load the store data if it exists
          if (parsedData.storeData) {
            // Always load fresh data - this ensures WebSocket updates are reflected
            loadData({
              qty: parsedData.storeData.qty || 1,
              data: parsedData.storeData.data || [],
            });
          }
        }
      } catch (error) {
        // Error loading additional field data
      }
    } else {
      // Initialize with default data if no saved data exists
      loadData({ qty: 1, data: [] });
    }
  }, [additionalFieldData, cardId]);

  // Save data to database with debouncing
  const debouncedSave = useCallback(
    debounce(() => {
      // Get fresh data from store to avoid stale closure issues
      const currentState = useAdditionalFieldsStore.getState();
      const freshData = currentState.data;
      const freshQty = currentState.qty;

      const dataToSave = {
        storeData: {
          qty: freshQty,
          data: freshData,
        },
      };

      if (additionalFieldId) {
        updateMutation.mutate(dataToSave);
      } else {
        createMutation.mutate(dataToSave);
      }
    }, 1000),
    [additionalFieldId, updateMutation, createMutation]
  );

  // Initialize input with store value
  useEffect(() => {
    setJumlahPOInput(qty.toString());
  }, [qty]);

  const handleJumlahPOChange = (value: string) => {
    setJumlahPOInput(value);
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 1 && numValue <= 10) {
      setQty(numValue);
    }
  };

  const handleJumlahPOBlur = () => {
    const numValue = parseInt(jumlahPOInput);
    if (isNaN(numValue) || numValue < 1) {
      setJumlahPOInput("1");
      setQty(1);
    } else if (numValue > 10) {
      setJumlahPOInput("10");
      setQty(10);
    }
    debouncedSave();
  };

  const handleButuhBahanChange = (poId: string, value: boolean) => {
    if (value) {
      // When turning on butuhBahan, initialize with all categories from productCategories
      const defaultCategories = productCategories.map((category) => ({
        key: category.key,
        label: category.label,
        fields: category.fields
          .filter((field) => field.type !== "sizeBreakdown")
          .map((field) => ({
            key: field.key,
            label: field.label,
            isTotal: field.isTotal || false,
          })),
      }));

      updatePOData(poId, {
        butuhBahan: value,
        bahan: [createNewBahanItem(0)],
        categories: defaultCategories,
      });
    } else {
      // When turning off butuhBahan, clear bahan items but keep categories
      updatePOData(poId, { butuhBahan: value, bahan: [] });
    }
    debouncedSave();
  };

  const handleOpenScanner = (poId: string, bahanItem?: BahanItem) => {
    setScannerModal({
      isOpen: true,
      poId,
      bahanItem,
    });
  };

  const handleCloseScanner = () => {
    setScannerModal({
      isOpen: false,
      poId: "",
      bahanItem: undefined,
    });
  };

  const handleScanResult = (scannedData: string) => {
    // TODO: Process the scanned data and add it to the bahan items
    message.success(`Scanned: ${scannedData}`);
    handleCloseScanner();
  };

  const handleRemoveBahanTab = (targetKey: string, poId: string) => {
    // Extract the bahan index from the target key (format: "poId-index")
    const keyParts = targetKey.split("-");
    if (keyParts.length >= 2) {
      const bahanIndex = parseInt(keyParts[keyParts.length - 1]) - 1; // Convert to 0-based index

      // Get current PO data
      const currentPO = data.find((po) => po.id === poId);
      if (currentPO && currentPO.bahan && currentPO.bahan[bahanIndex]) {
        // Remove the bahan item at the specified index
        const updatedBahan = currentPO.bahan.filter(
          (_, index) => index !== bahanIndex
        );

        // Update the store
        updatePOData(poId, {
          ...currentPO,
          bahan: updatedBahan,
        });

        // Save changes
        debouncedSave();

        message.success("Bahan item removed successfully");
      }
    }
  };

  // Summary modal handlers
  const handleOpenSummary = (poIndex: number, poData: any) => {
    setSummaryModal({
      isOpen: true,
      poIndex,
      poData,
      poId: poData.id, // Add the PO ID from the poData
    });
  };

  const openSizesModal = (categoryKey: string, fieldKey: string) => {
    const modalSizeData = convertBreakdownsToModalFormat(
      currentPO?.sizeBreakdowns || [],
      categoryKey,
      fieldKey
    );

    setSizeBreakdownModal({
      isOpen: true,
      categoryKey,
      fieldKey,
      sizeData: modalSizeData,
      bahanItem: undefined, // No specific bahan item for PO-level breakdowns
    });
  };

  const closeSizesModal = () => {
    setSizeBreakdownModal({
      isOpen: false,
      categoryKey: "",
      fieldKey: "",
      sizeData: undefined,
      bahanItem: undefined,
    });
  };

  const handleCloseSummary = () => {
    setSummaryModal({
      isOpen: false,
      poIndex: 0,
      poData: null,
      poId: null,
    });
  };

  // QR Scanner processing function
  const processQRScan = async (scannedData: string) => {
    if (!scannedData.trim()) {
      return;
    }
    try {
      // Clean the scanned data by removing unwanted characters
      // Remove common scanner artifacts like "Shift", "Control", "Alt", etc.
      const cleanedData = scannedData
        .replace(/Shift/g, "")
        .replace(/Control/g, "")
        .replace(/Alt/g, "")
        .replace(/Meta/g, "")
        .replace(/Tab/g, "")
        .replace(/Escape/g, "")
        .replace(/CapsLock/g, "")
        .trim();

      // New short format with separators: poNum-categoryCode-fieldCode-size-seq
      // Example: "1-PO-TJ-M-001" instead of "cardId|po456-polo-tpj-M-001-1|mark_complete"
      // Use current card ID from component context
      const data = cleanedData;
      const action = "mark_complete"; // Default action since removed from QR

      if (!cardId) {
        throw new Error("No card ID available in current context");
      }

      if (!data) {
        throw new Error("Missing scanned data");
      }

      // Call the QR scan API using current card ID
      const response = await scanQRCode(cardId, data, action as any);

      // Check if the response is successful
      // Backend returns: { status_code: 200, message: "...", data: { success: true, ... } }
      if (response.status_code === 200 || response.data?.success) {
        message.success(response.message || "Item scanned successfully!");

        // Manual refetch to ensure immediate UI update
        // While WebSocket will also trigger updates, manual refetch ensures immediate response
        await refetchAdditionalFields();

        // Also invalidate the query cache to ensure fresh data
        queryClient.invalidateQueries({
          queryKey: ["additionalFields", cardId],
        });
      } else {
        message.error(response.message || "Failed to process scan");
      }
    } catch (error) {
      message.error("Failed to process QR scan. Please try again.");
    }
  };

  // QR Scanner keyboard handler - only active when summary modal is open
  useEffect(() => {
    const handleQRScanner = (e: KeyboardEvent) => {
      // Only handle QR scanning when summary modal is open
      if (!summaryModal.isOpen) {
        return;
      }

      // Filter out unwanted keys that external scanners might send
      const unwantedKeys = [
        "Shift",
        "Control",
        "Alt",
        "Meta",
        "Tab",
        "Escape",
        "CapsLock",
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "Home",
        "End",
        "PageUp",
        "PageDown",
        "Insert",
        "Delete",
        "F1",
        "F2",
        "F3",
        "F4",
        "F5",
        "F6",
        "F7",
        "F8",
        "F9",
        "F10",
        "F11",
        "F12",
      ];

      if (unwantedKeys.includes(e.key)) {
        return; // Ignore these keys
      }

      // Clear any existing timeout
      if (qrScannerTimeoutRef.current) {
        clearTimeout(qrScannerTimeoutRef.current);
      }

      if (e.key === "Enter") {
        e.preventDefault();
        if (qrScannerBufferRef.current.trim()) {
          processQRScan(qrScannerBufferRef.current);
        }
        qrScannerBufferRef.current = "";
        return;
      }

      // Only add printable characters to the buffer
      if (e.key.length === 1) {
        qrScannerBufferRef.current += e.key;
      }

      // Clear buffer after 100ms of no input (typical for external scanners)
      qrScannerTimeoutRef.current = setTimeout(() => {
        qrScannerBufferRef.current = "";
      }, 100);
    };

    if (summaryModal.isOpen) {
      document.addEventListener("keydown", handleQRScanner);
    }

    return () => {
      document.removeEventListener("keydown", handleQRScanner);
      if (qrScannerTimeoutRef.current) {
        clearTimeout(qrScannerTimeoutRef.current);
      }
    };
  }, [summaryModal.isOpen]);

  // Calculate efficiency functions (from legacy)
  const calculateEstBahan = (po: POData, bahanItem?: BahanItem): number => {
    const source = bahanItem || po;
    const detailProdukSum = Object.values(source.detailProduk || {}).reduce(
      (sum, category) =>
        sum +
        Object.values(category || {}).reduce(
          (catSum, field) => catSum + (field.total || 0),
          0
        ),
      0
    );
    const sizeBreakdownSum = (source.sizeBreakdowns || []).length;
    return detailProdukSum + sizeBreakdownSum;
  };

  const calculateBahanTerpakai = (
    po: POData,
    bahanItem?: BahanItem
  ): number => {
    const source = bahanItem || po;
    const detailProdukSum = Object.values(source.detailProduk || {}).reduce(
      (sum, category) =>
        sum +
        Object.values(category || {}).reduce(
          (catSum, field) => catSum + (field.total || 0),
          0
        ),
      0
    );
    const sizeBreakdownSum = (source.sizeBreakdowns || []).length;
    return detailProdukSum + sizeBreakdownSum;
  };

  const calculateEfisiensi = (po: POData, bahanItem?: BahanItem): number => {
    const estBahan = calculateEstBahan(po, bahanItem);
    const bahanTerpakai = calculateBahanTerpakai(po, bahanItem);

    if (estBahan === 0) return 0;

    return ((bahanTerpakai - estBahan) / estBahan) * 100;
  };

  return (
    <div className="mt-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span
          className="inline-flex items-center justify-center"
          style={{ color: `rgb(${colors["text-muted"]})` }}
        >
          <svg
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <rect x="5" y="5" width="14" height="14" rx="2"></rect>
            <path d="M9 9h6v6H9z"></path>
          </svg>
        </span>
        <span
          className="text-[16px] font-semibold"
          style={{ color: `rgb(${colors.text})` }}
        >
          Bahan
        </span>
      </div>

      {/* Form Fields */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {/* Produk Field */}
        <div className="col-span-2">
          <label
            className="block text-xs font-medium mb-1"
            style={{ color: `rgb(${colors["text-muted"]})` }}
          >
            Produk
          </label>
          <input
            type="text"
            value={produk}
            disabled
            className="w-full px-3 py-1.5 rounded-md cursor-not-allowed text-sm"
            style={{
              border: `1px solid rgb(${colors.border})`,
              backgroundColor: `rgb(${colors.muted})`,
              color: `rgb(${colors["text-muted"]})`,
            }}
          />
        </div>

        {/* Jml PO Field */}
        <div>
          <label
            className="block text-xs font-medium mb-1"
            style={{ color: `rgb(${colors["text-muted"]})` }}
          >
            Jml PO
          </label>
          <input
            type="text"
            value={jumlahPOInput}
            onChange={(e) => handleJumlahPOChange(e.target.value)}
            onBlur={handleJumlahPOBlur}
            className="w-full px-3 py-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            style={{
              border: `1px solid rgb(${colors.border})`,
              backgroundColor: `rgb(${colors.surface})`,
              color: `rgb(${colors.text})`,
            }}
          />
        </div>
      </div>

      {/* PO Sections */}
      <div className="space-y-8">
        {data.map((po, index) => (
          <div
            key={po.id}
            className="rounded-lg p-6"
            style={{
              border: `1px solid rgb(${colors.border})`,
              backgroundColor: `rgb(${colors.surface})`,
            }}
          >
            {/* PO Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <h3
                  className="text-base font-semibold"
                  style={{ color: `rgb(${colors.text})` }}
                >
                  PO {index + 1}
                </h3>

                {/* Scanning Status Indicator */}
                {(() => {
                  // Get all size breakdowns for this PO
                  const poSizeBreakdowns = po.sizeBreakdowns || [];
                  
                  // Also get size breakdowns from bahan items
                  const bahanSizeBreakdowns = po.bahan?.flatMap(bahanItem => 
                    bahanItem.sizeBreakdowns || []
                  ) || [];
                  
                  const allSizeBreakdowns = [...poSizeBreakdowns, ...bahanSizeBreakdowns];
                  
                  if (allSizeBreakdowns.length === 0) {
                    return null; // No items to scan
                  }
                  
                  const scannedCount = allSizeBreakdowns.filter(item => item.isScanned).length;
                  const totalCount = allSizeBreakdowns.length;
                  const allScanned = scannedCount === totalCount;
                  const progressPercentage = totalCount > 0 ? Math.round((scannedCount / totalCount) * 100) : 0;
                  
                  return (
                    <div className="flex items-center gap-2">
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
                        allScanned 
                          ? 'bg-green-100 text-green-700 border border-green-200' 
                          : 'bg-orange-100 text-orange-700 border border-orange-200'
                      }`}>
                        <span className="text-sm">
                          {allScanned ? '✓' : '⚠'}
                        </span>
                        <span>
                          {allScanned ? 'Sudah scan semua' : 'Belum selesai scan'}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {scannedCount}/{totalCount} ({progressPercentage}%)
                      </span>
                    </div>
                  );
                })()}

                {/* Summary Button */}
                <button
                  onClick={() => handleOpenSummary(index, po)}
                  className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 hover:border-blue-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                >
                  Summary
                </button>
              </div>

              {/* Butuh Bahan Toggle */}
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-medium"
                  style={{ color: `rgb(${colors["text-muted"]})` }}
                >
                  Butuh Bahan
                </span>
                <button
                  onClick={() => handleButuhBahanChange(po.id, !po.butuhBahan)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    po.butuhBahan ? "bg-blue-600" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      po.butuhBahan ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>

            {po.butuhBahan && (
              <>
                {/* Scan Bahan Button - Only show when Butuh Bahan is ON */}
                <div className="mb-6">
                  <button
                    onClick={() => handleOpenScanner(po.id)}
                    className="mb-2 px-3 py-1 rounded border border-gray-200 bg-green-600 text-white text-xs font-medium hover:bg-green-700"
                  >
                    Scan Bahan
                  </button>
                </div>
              </>
            )}

            {/* Product dropdown when butuhBahan is OFF */}
            {!po.butuhBahan && (
              <div className="mt-6">
                <ProductDropdown
                  poId={po.id}
                  poData={po}
                  currentPO={currentPO}
                  debouncedSave={debouncedSave}
                  openSizesModal={openSizesModal}
                  closeSizesModal={closeSizesModal}
                />
              </div>
            )}

            {/* Bahan Tabs - Always show tabs for each selected/scanned bahan item */}
            <div
              className="rounded-lg p-4 mt-6"
              style={{
                border: `1px solid rgb(${colors.border})`,
                backgroundColor: `rgb(${colors.muted})`,
              }}
            >
              {po.bahan && po.bahan.length > 0 ? (
                <div className="max-w-2xl">
                  <Tabs
                    type="editable-card"
                    hideAdd
                    tabPosition="top"
                    tabBarGutter={10}
                    className="overflow-x-auto"
                    style={{
                      overflowX: "auto",
                    }}
                    onEdit={(targetKey, action) => {
                      if (
                        action === "remove" &&
                        typeof targetKey === "string"
                      ) {
                        handleRemoveBahanTab(targetKey, po.id);
                      }
                    }}
                    items={po.bahan.map((bahanItem, index) => ({
                      key: `${po.id}-${index + 1}`,
                      label: (
                        <span className="flex justify-between items-center">
                          {bahanItem.name || `Bahan ${index + 1}`}
                        </span>
                      ),
                      children: (
                        <div>
                          <div
                            className="text-sm font-medium mb-3"
                            style={{ color: `rgb(${colors["text-muted"]})` }}
                          >
                            Detail Produk
                          </div>

                          <div className="grid grid-cols-3 gap-x-6 gap-y-3 mb-3">
                            <div>
                              <label
                                className="block text-xs font-medium mb-1"
                                style={{
                                  color: `rgb(${colors["text-muted"]})`,
                                }}
                              >
                                Terloading (kg/m)
                              </label>
                              <input
                                className="w-full px-3 py-2 rounded-md text-sm"
                                style={{
                                  border: `1px solid rgb(${colors.border})`,
                                  backgroundColor: `rgb(${colors.surface})`,
                                  color: `rgb(${colors.text})`,
                                }}
                                value={0}
                                readOnly
                              />
                            </div>
                            <div>
                              <label
                                className="block text-xs font-medium mb-1"
                                style={{
                                  color: `rgb(${colors["text-muted"]})`,
                                }}
                              >
                                Sisa Bahan (kg/m)
                              </label>
                              <input
                                className="w-full px-3 py-2 rounded-md text-sm"
                                style={{
                                  border: `1px solid rgb(${colors.border})`,
                                  backgroundColor: `rgb(${colors.surface})`,
                                  color: `rgb(${colors.text})`,
                                }}
                                value={0}
                                readOnly
                              />
                            </div>
                            <div>
                              <label
                                className="block text-xs font-medium mb-1"
                                style={{
                                  color: `rgb(${colors["text-muted"]})`,
                                }}
                              >
                                Jml. Produksi (+/-)
                              </label>
                              <input
                                className="w-full px-3 py-2 rounded-md text-sm"
                                style={{
                                  border: `1px solid rgb(${colors.border})`,
                                  backgroundColor: `rgb(${colors.surface})`,
                                  color: `rgb(${colors.text})`,
                                }}
                                value={0}
                                readOnly
                              />
                            </div>
                          </div>

                          {/* Show efisiensi calculation only when butuh bahan is ON */}
                          {po.butuhBahan && (
                            <div className="grid grid-cols-3 gap-x-6 gap-y-3 mb-6">
                              <div>
                                <label
                                  className="block text-xs font-medium mb-1"
                                  style={{
                                    color: `rgb(${colors["text-muted"]})`,
                                  }}
                                >
                                  Est Bahan
                                </label>
                                <input
                                  className="w-full px-3 py-2 rounded-md text-sm"
                                  style={{
                                    border: `1px solid rgb(${colors.border})`,
                                    backgroundColor: `rgb(${colors.surface})`,
                                    color: `rgb(${colors.text})`,
                                  }}
                                  value={0}
                                  readOnly
                                />
                              </div>
                              <div>
                                <label
                                  className="block text-xs font-medium mb-1"
                                  style={{
                                    color: `rgb(${colors["text-muted"]})`,
                                  }}
                                >
                                  Bahan Terpakai
                                </label>
                                <input
                                  className="w-full px-3 py-2 rounded-md text-sm"
                                  style={{
                                    border: `1px solid rgb(${colors.border})`,
                                    backgroundColor: `rgb(${colors.surface})`,
                                    color: `rgb(${colors.text})`,
                                  }}
                                  value={0}
                                  readOnly
                                />
                              </div>
                              <div>
                                <label
                                  className="block text-xs font-medium mb-1"
                                  style={{
                                    color: `rgb(${colors["text-muted"]})`,
                                  }}
                                >
                                  Efisiensi
                                </label>
                                <input
                                  className="w-full px-3 py-2 rounded-md text-sm"
                                  style={{
                                    border: `1px solid rgb(${colors.border})`,
                                    backgroundColor: `rgb(${colors.surface})`,
                                    color: `rgb(${colors.text})`,
                                  }}
                                  value={0}
                                  readOnly
                                />
                              </div>
                            </div>
                          )}

                          {/* Product Category Tabs for this bahan item */}
                          <ProductCategoriesTabs
                            poId={po.id}
                            poData={po}
                            currentPO={currentPO}
                            debouncedSave={debouncedSave}
                            openSizesModal={openSizesModal}
                            closeSizesModal={closeSizesModal}
                            bahanItem={bahanItem}
                          />
                        </div>
                      ),
                    }))}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-between mb-4">
                  <h4
                    className="text-sm font-medium"
                    style={{ color: `rgb(${colors["text-muted"]})` }}
                  >
                    No bahan items selected yet
                  </h4>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Summary Modal */}
      <SummaryModal
        isOpen={summaryModal.isOpen}
        onClose={handleCloseSummary}
        poIndex={summaryModal.poIndex}
        poData={
          summaryModal.isOpen
            ? data[summaryModal.poIndex] || summaryModal.poData
            : summaryModal.poData
        }
        poId={summaryModal.poId}
        lastRefetchTime={lastRefetchTime}
      />

      {/* Size Breakdown Modal */}
      <SizeBreakdownModal
        isOpen={sizeBreakdownModal.isOpen}
        onClose={closeSizesModal}
        categoryKey={sizeBreakdownModal.categoryKey}
        fieldKey={sizeBreakdownModal.fieldKey}
        sizeData={sizeBreakdownModal.sizeData}
        poId={currentPO?.id || ""}
        poData={currentPO}
        debouncedSave={debouncedSave}
      />

      {/* Scanner Modal */}
      <ScannerModalComponent
        isOpen={scannerModal.isOpen}
        onClose={handleCloseScanner}
        onScan={handleScanResult}
        poIdentifier={parseInt(scannerModal.poId) || 1}
      />
    </div>
  );
};

// Product Dropdown Component for when butuhBahan is false
const ProductDropdown: React.FC<{
  poId: string;
  poData: POData;
  currentPO: POData;
  debouncedSave: () => void;
  openSizesModal: (categoryKey: string, fieldKey: string) => void;
  closeSizesModal: () => void;
}> = ({
  poId,
  poData,
  currentPO,
  debouncedSave,
  openSizesModal,
  closeSizesModal,
}) => {
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const { updatePOData } = useAdditionalFieldsStore();

  // Load products from Hikmat API
  const { data: hikmatItems, isLoading: isLoadingProducts } = useQuery({
    queryKey: ["hikmat-items"],
    queryFn: () => getHikmatItemList(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleProductSelect = (productId: string) => {
    setSelectedProductId(productId);

    // Find the selected product from hikmat items
    const selectedProduct = hikmatItems?.data?.find(
      (item: any) => item.id.toString() === productId
    );

    if (selectedProduct) {
      // Create a new bahan item from the selected product
      const newBahanItem: BahanItem = {
        id: selectedProduct.id.toString(),
        butuhBahan: false, // Set to false since this is from dropdown selection
        name: selectedProduct.name,
        bahanId: selectedProduct.id.toString(),
        detailProduk: {},
        sizeBreakdowns: [],
      };

      // Add the new bahan item to the existing bahan array
      const currentBahan = poData.bahan || [];
      const updatedBahan = [...currentBahan, newBahanItem];

      // Initialize categories for the selected product - use all categories from productCategories
      const defaultCategories = productCategories.map((category) => ({
        key: category.key,
        label: category.label,
        fields: category.fields
          .filter((field) => field.type !== "sizeBreakdown")
          .map((field) => ({
            key: field.key,
            label: field.label,
            isTotal: field.isTotal || false,
          })),
      }));

      // Update PO data with the new bahan array and categories
      updatePOData(poId, {
        bahan: updatedBahan,
        categories: defaultCategories,
      });
    }

    debouncedSave();
  };

  const products = hikmatItems?.data || [];

  return (
    <div>
      {/* Product Selection Dropdown */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Product
        </label>
        <select
          value={selectedProductId}
          onChange={(e) => handleProductSelect(e.target.value)}
          className="w-64 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoadingProducts}
        >
          <option value="">
            {isLoadingProducts ? "Loading products..." : "Select a product"}
          </option>
          {products.map((product: any) => (
            <option key={product.id} value={product.id.toString()}>
              {product.name} ({product.no})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

// Product Categories Component
const ProductCategoriesTabs: React.FC<{
  poId: string;
  poData: POData;
  currentPO: POData;
  bahanItem?: BahanItem;
  debouncedSave: () => void;
  openSizesModal: (categoryKey: string, fieldKey: string) => void;
  closeSizesModal: () => void;
}> = ({
  poId,
  poData,
  currentPO,
  bahanItem,
  debouncedSave,
  openSizesModal,
  closeSizesModal,
}) => {
  const [activeTab, setActiveTab] = useState<string>("polo");
  const [sizeBreakdownModal, setSizeBreakdownModal] =
    useState<SizeBreakdownModalState>({
      isOpen: false,
      categoryKey: "",
      fieldKey: "",
      sizeData: undefined,
    });
  const { updatePOData, data } = useAdditionalFieldsStore();

  // Get current PO data
  // Determine which data source to use
  const currentDataSource = bahanItem || poData;

  // Calculate total for a category (bahan-specific)
  const calculateTotal = (categoryKey: string) => {
    if (!currentPO) return 0;

    const category = (poData.categories || []).find(
      (cat: any) => cat.key === categoryKey
    );
    if (!category) return 0;

    // Sum all non-total fields using sizeBreakdowns
    const nonTotalFields = category.fields.filter(
      (field: any) => !field.isTotal
    );
    return nonTotalFields.reduce((sum: number, field: any) => {
      // Count items in sizeBreakdowns for this category/field
      // Use bahan-specific size breakdowns if bahanItem is provided
      if (bahanItem) {
        // Only count size breakdowns from the current bahan item
        const bahanFieldTotal = (bahanItem.sizeBreakdowns || []).filter(
          (item: any) =>
            item.category === categoryKey && item.field === field.key
        ).length;
        return sum + bahanFieldTotal;
      } else {
        // Fallback to PO level if no specific bahan item
        const poFieldTotal = (currentPO.sizeBreakdowns || []).filter(
          (item: any) => item.category === categoryKey && item.field === field.key
        ).length;
        return sum + poFieldTotal;
      }
    }, 0);
  };

  // Get field value for display (bahan-specific)
  const getFieldValue = (
    categoryKey: string,
    fieldKey: string,
    isTotal: boolean
  ) => {


    if (isTotal) {
      const totalValue = calculateTotal(categoryKey).toString();

      return totalValue;
    }

    // Count items in sizeBreakdowns for this category/field
    // Use bahan-specific size breakdowns if bahanItem is provided
    let filteredItems: any[] = [];
    
    if (bahanItem) {
      // Only count size breakdowns from the current bahan item
      filteredItems = (bahanItem.sizeBreakdowns || []).filter(
        (item: any) => item.category === categoryKey && item.field === fieldKey
      );
    } else {
      // Fallback to PO level if no specific bahan item
      filteredItems = (currentPO?.sizeBreakdowns || []).filter(
        (item: any) => item.category === categoryKey && item.field === fieldKey
      );
    }

    const total = filteredItems.length;



    return total.toString();
  };

  // Check if field should be editable - ALL fields are disabled, only size breakdown can change values
  const isFieldEditable = (
    category: { fields: any[] },
    field: { isTotal: any }
  ) => {
    // All fields are disabled - only size breakdown can change values
    return false;
  };

  // Check if field can have size breakdown
  const canHaveSizeBreakdown = (
    category: { fields: any[] },
    field: { isTotal: any }
  ) => {
    // Filter out sizeBreakdown fields to get actual data fields
    const dataFields = category.fields.filter(
      (f) => f.type !== "sizeBreakdown"
    );

    // For non-total fields: can have size breakdown if in multi-field category
    if (!field.isTotal) {
      return dataFields.length > 1;
    }

    // For total fields: can only have size breakdown if it's the ONLY field in category
    // (single total field categories like Jaket, Hoodie, etc.)
    return dataFields.length === 1;
  };

  // Handle size breakdown popup (bahan-specific)
  const handleSizeBreakdown = (categoryKey: string, fieldKey: string) => {
    // Convert sizeBreakdowns to modal format for display
    // Use bahan-specific size breakdowns if bahanItem is provided
    const sizeBreakdowns = bahanItem 
      ? (bahanItem.sizeBreakdowns || [])
      : (currentPO?.sizeBreakdowns || []);
      
    const modalSizeData = convertBreakdownsToModalFormat(
      sizeBreakdowns,
      categoryKey,
      fieldKey
    );

    setSizeBreakdownModal({
      isOpen: true,
      categoryKey,
      fieldKey,
      sizeData: modalSizeData,
      bahanItem: bahanItem, // Include the current bahan item context
    });
  };

  // Size breakdown modal handlers
  const handleUpdateSize = (
    categoryKey: string,
    fieldKey: string,
    size: string,
    quantity: number,
    customSizeName?: string
  ) => {
    // Initialize sizeBreakdowns array if it doesn't exist
    if (!currentPO?.sizeBreakdowns) {
      updatePOData(poId, {
        sizeBreakdowns: [],
      });
    }

    const currentBreakdowns = currentPO?.sizeBreakdowns || [];
    let updatedBreakdowns = [...currentBreakdowns];

    if (size === "custom" && customSizeName) {
      // Handle custom sizes
      if (quantity > 0) {
        // Create individual entries for each quantity
        for (let i = 1; i <= quantity; i++) {
          const existingIndex = updatedBreakdowns.findIndex(
            (item) =>
              item.category === categoryKey &&
              item.field === fieldKey &&
              item.size === customSizeName &&
              item.uniqueId === String(i).padStart(3, "0")
          );

          if (existingIndex === -1) {
            // Add new breakdown item (preserve existing isScanned status if it exists)
            const existingItem = currentBreakdowns.find(
              (item) =>
                item.category === categoryKey &&
                item.field === fieldKey &&
                item.size === customSizeName &&
                item.uniqueId === String(i).padStart(3, "0")
            );

            updatedBreakdowns.push({
              label: `${customSizeName}-${i}`,
              size: customSizeName,
              uniqueId: String(i).padStart(3, "0"),
              isScanned: existingItem?.isScanned || false, // Preserve existing scan status
              category: categoryKey,
              field: fieldKey,
            });
          }
        }

        // Remove excess items if quantity decreased
        updatedBreakdowns = updatedBreakdowns.filter((item) => {
          if (
            item.category === categoryKey &&
            item.field === fieldKey &&
            item.size === customSizeName
          ) {
            const uniqueIdNum = parseInt(item.uniqueId);
            return uniqueIdNum <= quantity;
          }
          return true;
        });
      } else {
        // Remove all items for this custom size if quantity is 0
        updatedBreakdowns = updatedBreakdowns.filter(
          (item) =>
            !(
              item.category === categoryKey &&
              item.field === fieldKey &&
              item.size === customSizeName
            )
        );
      }
    } else {
      // Handle standard sizes
      if (quantity > 0) {
        // Create individual entries for each quantity
        for (let i = 1; i <= quantity; i++) {
          const existingIndex = updatedBreakdowns.findIndex(
            (item) =>
              item.category === categoryKey &&
              item.field === fieldKey &&
              item.size === size &&
              item.uniqueId === String(i).padStart(3, "0")
          );

          if (existingIndex === -1) {
            // Add new breakdown item (preserve existing isScanned status if it exists)
            const existingItem = currentBreakdowns.find(
              (item) =>
                item.category === categoryKey &&
                item.field === fieldKey &&
                item.size === size &&
                item.uniqueId === String(i).padStart(3, "0")
            );

            updatedBreakdowns.push({
              label: `${size}-${i}`,
              size: size,
              uniqueId: String(i).padStart(3, "0"),
              isScanned: existingItem?.isScanned || false, // Preserve existing scan status
              category: categoryKey,
              field: fieldKey,
            });
          }
        }

        // Remove excess items if quantity decreased
        updatedBreakdowns = updatedBreakdowns.filter((item) => {
          if (
            item.category === categoryKey &&
            item.field === fieldKey &&
            item.size === size
          ) {
            const uniqueIdNum = parseInt(item.uniqueId);
            return uniqueIdNum <= quantity;
          }
          return true;
        });
      } else {
        // Remove all items for this size if quantity is 0
        updatedBreakdowns = updatedBreakdowns.filter(
          (item) =>
            !(
              item.category === categoryKey &&
              item.field === fieldKey &&
              item.size === size
            )
        );
      }
    }

    // Calculate total from sizeBreakdowns for this category/field
    const total = updatedBreakdowns.filter(
      (item) => item.category === categoryKey && item.field === fieldKey
    ).length;

    // Update the store with new sizeBreakdowns and total
    updatePOData(poId, {
      sizeBreakdowns: updatedBreakdowns,
      [`${categoryKey}_total`]: total,
    });
    debouncedSave();

    // For modal display, we need to convert back to the old format temporarily
    const modalSizeData = convertBreakdownsToModalFormat(
      updatedBreakdowns,
      categoryKey,
      fieldKey
    );

    // Update modal state
    setSizeBreakdownModal((prev) => ({
      ...prev,
      sizeData: modalSizeData,
    }));
  };

  const handleRemoveCustomSize = (
    categoryKey: string,
    fieldKey: string,
    customSizeName: string
  ) => {
    // Get current sizeBreakdowns
    let updatedBreakdowns = [...(currentPO?.sizeBreakdowns || [])];

    // Remove all items for this custom size
    updatedBreakdowns = updatedBreakdowns.filter(
      (item) =>
        !(
          item.category === categoryKey &&
          item.field === fieldKey &&
          item.size === customSizeName
        )
    );

    // Calculate total from sizeBreakdowns for this category/field
    const total = updatedBreakdowns.filter(
      (item) => item.category === categoryKey && item.field === fieldKey
    ).length;

    // Update the store with new sizeBreakdowns and total
    updatePOData(poId, {
      sizeBreakdowns: updatedBreakdowns,
      [`${categoryKey}_total`]: total,
    });
    debouncedSave();

    // For modal display, we need to convert back to the old format temporarily
    const modalSizeData = convertBreakdownsToModalFormat(
      updatedBreakdowns,
      categoryKey,
      fieldKey
    );

    // Update modal state
    setSizeBreakdownModal((prev) => ({
      ...prev,
      sizeData: modalSizeData,
    }));
  };

  const closeSizeBreakdownModal = () => {
    setSizeBreakdownModal({
      isOpen: false,
      categoryKey: "",
      fieldKey: "",
      sizeData: undefined,
      bahanItem: undefined,
    });

    debouncedSave();
  };

  const handleFieldChange = (
    categoryKey: string,
    fieldKey: string,
    value: string
  ) => {
    const numericValue = parseFloat(value);
    if (isNaN(numericValue) && value !== "") return;

    const updatedDetailProduk = {
      ...currentPO.detailProduk,
      [categoryKey]: {
        ...(currentPO.detailProduk[categoryKey] || {}),
        [fieldKey]: {
          ...(currentPO.detailProduk[categoryKey]?.[fieldKey] || {}),
          total: numericValue,
        },
      },
    };

    updatePOData(poId, { ...currentPO, detailProduk: updatedDetailProduk });
    debouncedSave();
  };

  return (
    <div>
      {/* Tab Headers */}
      <div className="flex flex-wrap gap-1 mb-3 border-b border-gray-200">
        {(poData.categories || []).map((category: any) => (
          <button
            key={category.key}
            onClick={() => setActiveTab(category.key)}
            className={`px-2 py-1 text-xs font-medium rounded-t-lg transition-colors ${
              activeTab === category.key
                ? "bg-blue-50 text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {category.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-2 gap-2">
        {(poData.categories || [])
          .find((cat: any) => cat.key === activeTab)
          ?.fields.map((field: any) => {
            const category = (poData.categories || []).find(
              (cat: any) => cat.key === activeTab
            )!;
            const isEditable = isFieldEditable(category, field);
            const canBreakdown = canHaveSizeBreakdown(category, field);
            const fieldValue = getFieldValue(
              activeTab,
              field.key,
              field.isTotal || false
            );

            return (
              <div key={field.key}>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {field.label}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={getFieldValue(
                      category.key,
                      field.key,
                      field.isTotal
                    )}
                    onChange={(e) =>
                      isEditable
                        ? handleFieldChange(
                            category.key,
                            field.key,
                            e.target.value
                          )
                        : undefined
                    }
                    onBlur={() => debouncedSave()}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm ${
                      canBreakdown ? "pr-10" : ""
                    } ${
                      isEditable
                        ? "bg-white text-gray-900"
                        : "bg-gray-50 text-gray-500 cursor-not-allowed"
                    }`}
                    disabled={!isEditable}
                    readOnly={!isEditable}
                  />
                  {canBreakdown && (
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                      {getFieldValue(category.key, field.key, field.isTotal) >
                        0 && (
                        <span className="text-xs font-medium text-gray-500">
                          Total:{" "}
                          {getFieldValue(
                            category.key,
                            field.key,
                            field.isTotal
                          )}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          handleSizeBreakdown(category.key, field.key)
                        }
                        className={`p-1 transition-colors ${
                          getFieldValue(
                            category.key,
                            field.key,
                            field.isTotal
                          ) > 0
                            ? "text-blue-600"
                            : "text-gray-500"
                        } hover:text-blue-600`}
                        title={
                          getFieldValue(
                            category.key,
                            field.key,
                            field.isTotal
                          ) > 0
                            ? `Total: ${getFieldValue(
                                category.key,
                                field.key,
                                field.isTotal
                              )}`
                            : "Size Breakdown"
                        }
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.4 2.4 0 0 1 3.4 0Z" />
                          <path d="m14.5 12.5 2-2" />
                          <path d="m11.5 9.5 2-2" />
                          <path d="m8.5 6.5 2-2" />
                          <path d="m17.5 15.5 2-2" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
      </div>

      {/* Size Breakdown Modal */}
      <SizeBreakdownModal
        isOpen={sizeBreakdownModal.isOpen}
        onClose={closeSizeBreakdownModal}
        categoryKey={sizeBreakdownModal.categoryKey}
        fieldKey={sizeBreakdownModal.fieldKey}
        sizeData={sizeBreakdownModal.sizeData}
        poId={poId}
        poData={poData}
        bahanItem={sizeBreakdownModal.bahanItem} // Use bahanItem from modal state
        debouncedSave={debouncedSave}
      />
    </div>
  );
};

export default AdditionalFields;
