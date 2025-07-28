"use client";

import React, { useState, useEffect, useRef } from "react";
import { Tabs, Button, Input, Modal, message, Select } from "antd";
import { ChevronDown, ChevronRight, Ruler, BarChart3, X } from "lucide-react";
import type { AdditionalTab, ItemDetail } from "./types";
import { manualInputBahanId } from "@api/additional-field";
import { useHikmatItemList } from "@hooks/accurate";

// Local Sizes Modal Component
interface LocalSizesModalProps {
  isOpen: boolean;
  onClose: () => void;
  tabKey: string;
  fieldKey: string;
  tabNames: AdditionalTab[];
  poIdentifier: number;
  localSizesData: Record<string, Record<string, any>>;
  setLocalSizesData: React.Dispatch<
    React.SetStateAction<Record<string, Record<string, any>>>
  >;
}

const LocalSizesModal: React.FC<LocalSizesModalProps> = ({
  isOpen,
  onClose,
  tabKey,
  fieldKey,
  tabNames,
  poIdentifier,
  localSizesData,
  setLocalSizesData,
}) => {
  const [showCustomSizePopover, setShowCustomSizePopover] = useState(false);

  if (!isOpen) return null;

  const sizesKey = `sizes_${poIdentifier}_${tabKey}_${fieldKey}`;
  const currentSizes = localSizesData[sizesKey] || {
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

  const getTotalSizes = (): number => {
    const standardSizes = [
      currentSizes.XS || 0,
      currentSizes.S || 0,
      currentSizes.M || 0,
      currentSizes.L || 0,
      currentSizes.XL || 0,
      currentSizes.XXL || 0,
      currentSizes.XXXL || 0,
      currentSizes.XXXXL || 0,
      currentSizes.XXXXXL || 0,
    ];
    const customSizes = currentSizes.custom
      ? Object.values(currentSizes.custom).map((val) => Number(val) || 0)
      : [];
    return [...standardSizes, ...customSizes].reduce(
      (sum, value) => sum + value,
      0
    );
  };

  const handleSizeChange = (size: string, quantity: number) => {
    setLocalSizesData((prev) => ({
      ...prev,
      [sizesKey]: {
        ...prev[sizesKey],
        [size]: quantity,
      },
    }));
  };

  const handleAddCustomSize = (name: string, quantity: number) => {
    setLocalSizesData((prev) => ({
      ...prev,
      [sizesKey]: {
        ...prev[sizesKey],
        custom: {
          ...prev[sizesKey]?.custom,
          [name]: quantity,
        },
      },
    }));
    setShowCustomSizePopover(false);
  };

  const handleRemoveCustomSize = (customSizeName: string) => {
    setLocalSizesData((prev) => {
      const updatedSizes = { ...prev[sizesKey] };
      if (updatedSizes.custom) {
        delete updatedSizes.custom[customSizeName];
      }
      return {
        ...prev,
        [sizesKey]: updatedSizes,
      };
    });
  };

  const standardSizes = [
    { key: "XS", label: "XS" },
    { key: "S", label: "S" },
    { key: "M", label: "M" },
    { key: "L", label: "L" },
    { key: "XL", label: "XL" },
    { key: "XXL", label: "XXL" },
    { key: "XXXL", label: "XXXL" },
    { key: "XXXXL", label: "XXXXL" },
    { key: "XXXXXL", label: "XXXXXL" },
  ];

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      title={`Size Breakdown - ${
        tabNames.find((tab) => tab.key === tabKey)?.label || ""
      } ${
        tabNames.find((tab) => tab.key === tabKey)?.fields[fieldKey]?.label ||
        ""
      }`}
      width={600}
      footer={
        [
          <Button key="close" onClick={onClose}>
            Close
          </Button>,
        ] as React.ReactNode[]
      }
      destroyOnClose={false}
      maskClosable={false}
    >
      <div className="space-y-6 p-4">
        <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
          <span className="font-medium">Total Quantity: {getTotalSizes()}</span>
          <span className="font-medium text-blue-600">
            Calculated from sizes
          </span>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {standardSizes.map((size) => (
            <div key={size.key} className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                {size.label}
              </label>
              <input
                type="number"
                min={0}
                value={currentSizes[size.key] || ""}
                onChange={(e) => {
                  const value = Number.parseInt(e.target.value) || 0;
                  handleSizeChange(size.key, value);
                }}
                placeholder="0"
                className="text-center border border-gray-300 rounded px-3 py-2"
                onBlur={(e) => {
                  const value = Number.parseInt(e.target.value) || 0;
                  handleSizeChange(size.key, value);
                }}
              />
            </div>
          ))}
        </div>

        {/* Custom Sizes */}
        <div className="border-t pt-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-900">Custom Sizes</h4>
            <Button
              type="default"
              size="small"
              icon={<Ruler size={14} />}
              onClick={() => setShowCustomSizePopover(true)}
            >
              Custom Size
            </Button>
          </div>

          {/* Custom Sizes List */}
          {currentSizes.custom &&
            Object.keys(currentSizes.custom).length > 0 && (
              <div className="space-y-3">
                {Object.entries(currentSizes.custom).map(
                  ([name, quantity]: [string, any]) => (
                    <div
                      key={name}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <span className="font-medium">{name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-600">
                          {quantity}
                        </span>
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<X size={14} />}
                          onClick={() => handleRemoveCustomSize(name)}
                        />
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
        </div>
      </div>
    </Modal>
  );
};

interface TabContentComponentProps {
  poIdentifier: number; // Add PO identifier
  showScanner: boolean;
  setShowScanner: (show: boolean) => void;
  error: any;
  scannedItems: ItemDetail[];
  handleRemoveTab: (targetKey: string) => void;
  handleFieldChange: (
    itemIndex: number,
    tabKey: string,
    fieldKey: string,
    value: string,
    poIdentifier: number
  ) => void;
  openSizesModal: (
    itemIndex: number,
    tabKey: string,
    fieldKey: string,
    totalQuantity: number,
    poIdentifier: number
  ) => void;
  openSummaryModal: (itemIndex: number) => void;
  calculateTotalForField: (
    tabKey: string,
    fieldKey: string,
    itemIndex: number
  ) => number;

  calculateEstBahan: (item: ItemDetail) => number;
  calculateBahanTerpakai: (item: ItemDetail) => number;
  calculateEfisiensi: (item: ItemDetail) => number;
  tabNames: AdditionalTab[];
  labelClass: string;
  baseInputClass: string;
  sectionTitleClass: string;
  onScanButtonClick: () => void;
  setCurrentScannedId: (id: string | null) => void;
  butuhBahan: boolean;
  setButuhBahan: (value: boolean) => void;
}

const TabContentComponent: React.FC<TabContentComponentProps> = ({
  poIdentifier,
  showScanner,
  setShowScanner,
  error,
  scannedItems,
  handleRemoveTab,
  handleFieldChange,
  openSizesModal,
  openSummaryModal,
  calculateTotalForField,
  calculateEstBahan,
  calculateBahanTerpakai,
  calculateEfisiensi,
  tabNames,
  labelClass,
  baseInputClass,
  sectionTitleClass,
  onScanButtonClick,
  setCurrentScannedId,
  butuhBahan,
  setButuhBahan,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [manualBahanId, setManualBahanId] = useState<string>("");
  const [localFieldValues, setLocalFieldValues] = useState<
    Record<string, Record<string, string>>
  >({});
  const [localSizesData, setLocalSizesData] = useState<
    Record<string, Record<string, any>>
  >({});
  const [localSizesModal, setLocalSizesModal] = useState<{
    isOpen: boolean;
    tabKey: string;
    fieldKey: string;
  }>({
    isOpen: false,
    tabKey: "",
    fieldKey: "",
  });

  // Track which scanned item is currently selected for the product category tabs
  const [selectedItemIndex, setSelectedItemIndex] = useState<number>(0);

  // Get Hikmat item list for dropdown
  const { data: hikmatItems, isLoading: isLoadingHikmatItems } =
    useHikmatItemList();

  // Reset dropdown when scanned items change
  useEffect(() => {
    setManualBahanId("");
  }, [scannedItems]);

  // Handle manual bahan ID selection
  const handleBahanItemSelect = async (selectedId: string) => {
    if (!selectedId.trim()) {
      message.error("Please select a bahan item");
      return;
    }

    try {
      console.log("=== DROPDOWN SELECT DEBUG ===");
      console.log("Selected ID:", selectedId);
      console.log("Current PO Identifier:", poIdentifier);

      // Set the current PO for scanning to this PO
      onScanButtonClick();
      console.log("Called onScanButtonClick()");

      // Use the same logic as scanning - set the current scanned ID
      // This will trigger the useEffect that processes the scanned item
      setCurrentScannedId(selectedId);
      console.log("Set currentScannedId to:", selectedId);

      // Reset the dropdown immediately
      setManualBahanId("");
      console.log("Dropdown reset to:", ""); // Debug log
      message.success("Bahan item selected successfully");
    } catch (error) {
      message.error("Failed to select bahan item");
      console.error("Error selecting bahan item:", error);
    }
  };

  // Helper function to get individual field value (non-total fields)
  const getIndividualFieldValue = (
    tabKey: string,
    fieldKey: string,
    itemIndex: number = 0
  ): number => {
    if (scannedItems.length > 0) {
      // For non-total fields, get from scanned items
      const actualTabKey = `${poIdentifier}_${tabKey}`;
      return Number(
        scannedItems[itemIndex]?.additionalFields?.[actualTabKey]?.[fieldKey] ||
          0
      );
    } else {
      // Use local sizes data when no scanned items
      const sizesKey = `sizes_${poIdentifier}_${tabKey}_${fieldKey}`;
      const sizeData = localSizesData[sizesKey];

      if (sizeData) {
        // Calculate total from local sizes
        const standardSizes = [
          sizeData.XS || 0,
          sizeData.S || 0,
          sizeData.M || 0,
          sizeData.L || 0,
          sizeData.XL || 0,
          sizeData.XXL || 0,
          sizeData.XXXL || 0,
          sizeData.XXXXL || 0,
          sizeData.XXXXXL || 0,
        ];
        const customSizes = sizeData.custom
          ? Object.values(sizeData.custom).map((val) => Number(val) || 0)
          : [];
        const total = [...standardSizes, ...customSizes].reduce(
          (sum, value) => sum + value,
          0
        );
        return total;
      }

      // Fallback to local field values
      return Number(localFieldValues[tabKey]?.[fieldKey] || 0);
    }
  };

  // Helper function to get field value
  const getFieldValue = (
    tabKey: string,
    fieldKey: string,
    isTotalField: boolean,
    itemIndex: number = 0
  ) => {
    if (isTotalField) {
      // Calculate totals from individual field values (which come from sizes)
      const currentTab = tabNames.find((tab) => tab.key === tabKey);
      if (!currentTab) return 0;

      const nonTotalFieldKeys = Object.keys(currentTab.fields).filter(
        (key) => !key.toLowerCase().includes("total")
      );

      return nonTotalFieldKeys.reduce((sum, key) => {
        // Get the value for each individual field (which comes from sizes)
        const individualFieldValue = getIndividualFieldValue(
          tabKey,
          key,
          itemIndex
        );
        return sum + individualFieldValue;
      }, 0);
    }

    // For non-total fields, use the individual field value function
    return getIndividualFieldValue(tabKey, fieldKey, itemIndex);
  };

  // Helper function to handle field change
  const handleLocalFieldChange = (
    tabKey: string,
    fieldKey: string,
    value: string
  ) => {
    if (scannedItems.length > 0) {
      // Use the main handler when we have scanned items
      handleFieldChange(0, tabKey, fieldKey, value, poIdentifier);
    } else {
      // Store in local state when no scanned items
      setLocalFieldValues((prev) => ({
        ...prev,
        [tabKey]: {
          ...prev[tabKey],
          [fieldKey]: value,
        },
      }));
    }
  };

  // Local function to handle size updates when no scanned items
  const handleLocalSizeUpdate = (
    tabKey: string,
    fieldKey: string,
    size: string,
    quantity: number,
    customSizeName?: string
  ) => {
    const sizesKey = `sizes_${poIdentifier}_${tabKey}_${fieldKey}`;

    setLocalSizesData((prev) => {
      const updatedData = { ...prev };

      if (!updatedData[sizesKey]) {
        updatedData[sizesKey] = {
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
      }

      if (size === "custom" && customSizeName) {
        // Handle custom size
        updatedData[sizesKey].custom = {
          ...updatedData[sizesKey].custom,
          [customSizeName]: quantity,
        };
      } else if (size !== "custom") {
        // Handle standard size
        updatedData[sizesKey][size] = quantity;
      }

      return updatedData;
    });
  };

  return (
    <div className=" p-4 bg-white">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-800">
            PO #{poIdentifier}
            {/* {!butuhBahan && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                (Tabs Only)
              </span>
            )} */}
          </h3>

          {/* Butuh Bahan Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">Butuh Bahan</span>
            <button
              type="button"
              onClick={() => setButuhBahan(!butuhBahan)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                butuhBahan ? "bg-blue-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                  butuhBahan ? "translate-x-5" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-1 text-gray-600 hover:text-gray-800 transition-colors px-2 py-1 rounded hover:bg-gray-100"
        >
          {isCollapsed ? (
            <>
              <ChevronRight size={16} />
              <span className="text-sm">Expand</span>
            </>
          ) : (
            <>
              <ChevronDown size={16} />
              <span className="text-sm">Collapse</span>
            </>
          )}
        </button>
      </div>

      {!isCollapsed && (
        <>
          {butuhBahan ? (
            <>
              <button
                type="button"
                onClick={() => {
                  onScanButtonClick();
                  setShowScanner(true);
                }}
                className="mb-2 px-3 py-1 rounded border border-gray-200 bg-white text-gray-700 text-xs font-medium"
              >
                SCAN BAHAN
              </button>

              {error && (
                <div className="text-red-600 text-xs mt-2">
                  {(error as Error).message}
                </div>
              )}

              <Tabs
                type="editable-card"
                hideAdd
                onEdit={(targetKey, action) => {
                  if (action === "remove") {
                    handleRemoveTab(targetKey as string);
                  }
                }}
                onChange={(activeKey) => {
                  // Extract item index from the active key (e.g., "1-2" -> index 1)
                  const match = activeKey.match(/^(\d+)-(\d+)$/);
                  if (match) {
                    const itemIndex = parseInt(match[2]) - 1;
                    setSelectedItemIndex(itemIndex);
                  }
                }}
                items={scannedItems.map((item, index) => ({
                  key: `${poIdentifier}-${index + 1}`,
                  label: (
                    <span className="flex justify-between items-center">
                      {item.name}
                    </span>
                  ),
                  tabKey: `${poIdentifier}-${index + 1}`,
                  children: (
                    <div>
                      <div className={sectionTitleClass}>Detail Produk</div>

                      <div className="grid grid-cols-3 gap-x-6 gap-y-3 mb-3">
                        <div>
                          <label className={labelClass}>
                            Terloading (kg/m)
                          </label>
                          <input
                            className={baseInputClass}
                            value={
                              item.__rawInputs?.[
                                `${poIdentifier}_materialUsage.bahanTerpakai`
                              ] ??
                              item.__rawInputs?.[
                                "materialUsage.bahanTerpakai"
                              ] ??
                              item.additionalFields?.[
                                `${poIdentifier}_materialUsage`
                              ]?.bahanTerpakai ??
                              item.additionalFields?.materialUsage
                                ?.bahanTerpakai ??
                              item.usedAmount ??
                              ""
                            }
                            onChange={(e) => {
                              // cannot pass if its alphabetical
                              if (!isNaN(Number(e.target.value))) {
                                handleFieldChange(
                                  index,
                                  "materialUsage",
                                  "bahanTerpakai",
                                  e.target.value,
                                  poIdentifier
                                );
                              }
                            }}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>
                            Sisa Bahan (kg/m)
                          </label>
                          <input
                            className={baseInputClass}
                            value={
                              item.__rawInputs?.[
                                `${poIdentifier}_remainingAmount.remainingAmount`
                              ] ??
                              item.__rawInputs?.[
                                "remainingAmount.remainingAmount"
                              ] ??
                              item.additionalFields?.[
                                `${poIdentifier}_remainingAmount`
                              ]?.remainingAmount ??
                              item.additionalFields?.remainingAmount
                                ?.remainingAmount ??
                              item.remainingAmount ??
                              ""
                            }
                            onChange={(e) => {
                              // cannot pass if its alphabetical
                              if (!isNaN(Number(e.target.value))) {
                                handleFieldChange(
                                  index,
                                  "remainingAmount",
                                  "remainingAmount",
                                  e.target.value,
                                  poIdentifier
                                );
                              }
                            }}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>
                            Jml. Produksi (+/-)
                          </label>
                          <input
                            className={baseInputClass}
                            value={item.estimatedProduction ?? 0}
                            readOnly
                          />
                        </div>
                      </div>

                      {/* Show efisiensi calculation only when butuh bahan is ON */}
                      <div className="grid grid-cols-3 gap-x-6 gap-y-3 mb-3">
                        <div>
                          <label className={labelClass}>Est Bahan</label>
                          <input
                            className={baseInputClass}
                            value={calculateEstBahan(item)}
                            readOnly
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Bahan Terpakai</label>
                          <input
                            className={baseInputClass}
                            value={calculateBahanTerpakai(item)}
                            readOnly
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Efisiensi</label>
                          <input
                            className={baseInputClass}
                            value={calculateEfisiensi(item)}
                            readOnly
                          />
                        </div>
                      </div>

                      {/* Removed the nested product category tabs - they're now at the bottom level */}
                    </div>
                  ),
                }))}
              />
            </>
          ) : (
            <>
              {/* Manual bahan selection when butuh bahan is OFF */}
              <div className="mb-2">
                <Select
                  key={`bahan-select-${poIdentifier}-${scannedItems.length}`}
                  placeholder="Select Bahan Item"
                  value={manualBahanId}
                  onChange={(value) => {
                    if (value) {
                      handleBahanItemSelect(value);
                    }
                  }}
                  className="w-64"
                  loading={isLoadingHikmatItems}
                  showSearch
                  filterOption={(input, option) =>
                    String(option?.label ?? "")
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                  options={
                    hikmatItems?.data?.map((item: any) => ({
                      value: item.id.toString(),
                      label: `${item.name} (${item.no})`,
                    })) || []
                  }
                />
              </div>

              {error && (
                <div className="text-red-600 text-xs mt-2">
                  {(error as Error).message}
                </div>
              )}

              <Tabs
                type="editable-card"
                hideAdd
                onEdit={(targetKey, action) => {
                  if (action === "remove") {
                    handleRemoveTab(targetKey as string);
                  }
                }}
                onChange={(activeKey) => {
                  // Extract item index from the active key (e.g., "1-2" -> index 1)
                  const match = activeKey.match(/^(\d+)-(\d+)$/);
                  if (match) {
                    const itemIndex = parseInt(match[2]) - 1;
                    setSelectedItemIndex(itemIndex);
                  }
                }}
                items={scannedItems.map((item, index) => ({
                  key: `${poIdentifier}-${index + 1}`,
                  label: (
                    <span className="flex justify-between items-center">
                      {item.name}
                    </span>
                  ),
                  tabKey: `${poIdentifier}-${index + 1}`,
                  children: (
                    <div>
                      <div className={sectionTitleClass}>Detail Produk</div>

                      <div className="grid grid-cols-3 gap-x-6 gap-y-3 mb-3">
                        <div>
                          <label className={labelClass}>
                            Terloading (kg/m)
                          </label>
                          <input
                            className={baseInputClass}
                            value={
                              item.__rawInputs?.[
                                `${poIdentifier}_materialUsage.bahanTerpakai`
                              ] ??
                              item.__rawInputs?.[
                                "materialUsage.bahanTerpakai"
                              ] ??
                              item.additionalFields?.[
                                `${poIdentifier}_materialUsage`
                              ]?.bahanTerpakai ??
                              item.additionalFields?.materialUsage
                                ?.bahanTerpakai ??
                              item.usedAmount ??
                              ""
                            }
                            onChange={(e) => {
                              // cannot pass if its alphabetical
                              if (!isNaN(Number(e.target.value))) {
                                handleFieldChange(
                                  index,
                                  "materialUsage",
                                  "bahanTerpakai",
                                  e.target.value,
                                  poIdentifier
                                );
                              }
                            }}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>
                            Sisa Bahan (kg/m)
                          </label>
                          <input
                            className={baseInputClass}
                            value={
                              item.__rawInputs?.[
                                `${poIdentifier}_remainingAmount.remainingAmount`
                              ] ??
                              item.__rawInputs?.[
                                "remainingAmount.remainingAmount"
                              ] ??
                              item.additionalFields?.[
                                `${poIdentifier}_remainingAmount`
                              ]?.remainingAmount ??
                              item.additionalFields?.remainingAmount
                                ?.remainingAmount ??
                              item.remainingAmount ??
                              ""
                            }
                            onChange={(e) => {
                              // cannot pass if its alphabetical
                              if (!isNaN(Number(e.target.value))) {
                                handleFieldChange(
                                  index,
                                  "remainingAmount",
                                  "remainingAmount",
                                  e.target.value,
                                  poIdentifier
                                );
                              }
                            }}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>
                            Jml. Produksi (+/-)
                          </label>
                          <input
                            className={baseInputClass}
                            value={item.estimatedProduction ?? 0}
                            readOnly
                          />
                        </div>
                      </div>

                      {/* NO efisiensi calculation when butuh bahan is OFF - just show the bahan tab */}
                    </div>
                  ),
                }))}
              />
            </>
          )}

          {/* Always show tabs regardless of butuhBahan or scanned items */}
          <div className="mb-4">
            <div className="max-w-2xl">
              <Tabs
                tabPosition="top"
                tabBarGutter={10}
                className="overflow-x-auto"
                style={{
                  overflowX: "auto",
                }}
                items={tabNames.map((tab) => ({
                  key: tab.key,
                  label: (
                    <span className="max-w-32 truncate" title={tab.label}>
                      {tab.label}
                    </span>
                  ),
                  children: (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                      {Object.entries(tab.fields).map(([fieldKey, field]) => {
                        const isTotalField = fieldKey
                          .toLowerCase()
                          .includes("total");
                        const fieldValue = getFieldValue(
                          tab.key,
                          fieldKey,
                          isTotalField,
                          selectedItemIndex
                        );

                        return (
                          <div key={fieldKey} className="relative">
                            <label className={labelClass}>{field.label}</label>
                            <div className="relative">
                              <input
                                className={`${baseInputClass} ${
                                  !isTotalField ? "pr-10" : ""
                                }`}
                                placeholder="0"
                                value={fieldValue}
                                disabled={true}
                                readOnly={true}
                                onChange={undefined}
                              />
                              {!isTotalField && (
                                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      // Allow opening sizes modal even when no scanned items
                                      // Users will enter sizes first, then the total will be calculated
                                      if (scannedItems.length > 0) {
                                        openSizesModal(
                                          selectedItemIndex, // Use selected item index
                                          tab.key,
                                          fieldKey,
                                          0, // Start with 0, users will add sizes
                                          poIdentifier
                                        );
                                      } else {
                                        // Open local sizes modal
                                        setLocalSizesModal({
                                          isOpen: true,
                                          tabKey: tab.key,
                                          fieldKey: fieldKey,
                                        });
                                      }
                                    }}
                                    disabled={false}
                                    className="p-1 transition-colors text-gray-500 hover:text-blue-600"
                                    title="Size Breakdown"
                                  >
                                    <Ruler size={14} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ),
                }))}
              />
            </div>
          </div>

          {/* Summary Button - moved here to be under the tabs */}
          <div className="mt-4 flex justify-center">
            <Button
              type="default"
              size="small"
              onClick={() => openSummaryModal(poIdentifier)} // Pass poIdentifier
              icon={<BarChart3 size={14} />}
              className="flex items-center gap-2 px-4 py-2"
            >
              View Size Summary
            </Button>
          </div>
        </>
      )}

      {/* {isCollapsed && (
        <div className="text-gray-500 text-sm italic">
          {butuhBahan
            ? "Content collapsed. Click 'Expand' to view details and tabs."
            : "Tabs only. Click 'Expand' to view field inputs."}
        </div>
      )} */}

      {/* Local Sizes Modal */}
      {localSizesModal.isOpen && (
        <LocalSizesModal
          isOpen={localSizesModal.isOpen}
          onClose={() =>
            setLocalSizesModal({ isOpen: false, tabKey: "", fieldKey: "" })
          }
          tabKey={localSizesModal.tabKey}
          fieldKey={localSizesModal.fieldKey}
          tabNames={tabNames}
          poIdentifier={poIdentifier}
          localSizesData={localSizesData}
          setLocalSizesData={setLocalSizesData}
        />
      )}
    </div>
  );
};

export default TabContentComponent;
