"use client";

import React, { useState } from "react";
import { Modal, Button, Input, Popover, message } from "antd";
import { Plus, X } from "lucide-react";
import CustomSizePopoverComponent from "./CustomSizePopoverComponent";

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

interface SizesModalState {
  isOpen: boolean;
  itemIndex: number;
  tabKey: string;
  fieldKey: string;
  totalQuantity: number;
}

interface ItemDetail {
  id: string;
  name: string;
  additionalFields: any;
  __rawInputs?: any;
}

interface SizesModalComponentProps {
  modalState: SizesModalState;
  onClose: () => void;
  scannedItems: ItemDetail[];
  onUpdateSize: (
    itemIndex: number,
    tabKey: string,
    fieldKey: string,
    size: string,
    quantity: number,
    customSizeName?: string
  ) => void;
  onRemoveCustomSize: (
    itemIndex: number,
    tabKey: string,
    fieldKey: string,
    customSizeName: string
  ) => void;
  tabNames: any[];
}

const SizesModalComponent: React.FC<SizesModalComponentProps> = ({
  modalState,
  onClose,
  scannedItems,
  onUpdateSize,
  onRemoveCustomSize,
  tabNames,
}) => {
  const [showCustomSizePopover, setShowCustomSizePopover] = useState(false);

  if (!modalState.isOpen) return null;

  // Handle case when there are no scanned items - create a temporary item
  let currentItem: ItemDetail;
  if (scannedItems.length === 0) {
    currentItem = {
      id: "temp",
      name: "Temporary Item",
      additionalFields: {},
    };
  } else {
    currentItem = scannedItems[modalState.itemIndex];
  }

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

  const getTotalSizes = (breakdown: SizeBreakdown): number => {
    const standardSizes = [
      breakdown.XS,
      breakdown.S,
      breakdown.M,
      breakdown.L,
      breakdown.XL,
      breakdown.XXL,
      breakdown.XXXL,
      breakdown.XXXXL,
      breakdown.XXXXXL,
    ];
    const customSizes = breakdown.custom ? Object.values(breakdown.custom) : [];
    return [...standardSizes, ...customSizes].reduce(
      (sum, value) => sum + value,
      0
    );
  };

  const breakdown = getSizeBreakdown(
    currentItem,
    modalState.tabKey,
    modalState.fieldKey
  );
  const totalSizes = getTotalSizes(breakdown);

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

  const handleSizeChange = (size: string, quantity: number) => {
    // Remove quantity restrictions - users can enter any quantity
    onUpdateSize(
      modalState.itemIndex,
      modalState.tabKey,
      modalState.fieldKey,
      size,
      quantity
    );
  };

  const handleAddCustomSize = (name: string, quantity: number) => {
    onUpdateSize(
      modalState.itemIndex,
      modalState.tabKey,
      modalState.fieldKey,
      "custom",
      quantity,
      name
    );
    setShowCustomSizePopover(false);
  };

  return (
    <Modal
      open={modalState.isOpen}
      onCancel={onClose}
      title={`Size Breakdown - ${
        tabNames.find((tab) => tab.key === modalState.tabKey)?.label
      } ${
        tabNames.find((tab) => tab.key === modalState.tabKey)?.fields[
          modalState.fieldKey
        ]?.label
      }`}
      width={600}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
      ]}
      destroyOnClose={false}
      maskClosable={false}
    >
      <div className="space-y-6 p-4">
        <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
          <span className="font-medium">Total Quantity: {totalSizes}</span>
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
              <Input
                type="number"
                min={0}
                value={(breakdown as any)[size.key] || ""}
                onChange={(e) => {
                  const value = Number.parseInt(e.target.value) || 0;
                  handleSizeChange(size.key, value);
                }}
                placeholder="0"
                className="text-center"
                onBlur={(e) => {
                  // Ensure the value is properly set on blur
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
            <Popover
              content={
                <CustomSizePopoverComponent
                  onAddCustomSize={handleAddCustomSize}
                  onCancel={() => setShowCustomSizePopover(false)}
                />
              }
              title="Add Custom Size"
              trigger="click"
              open={showCustomSizePopover}
              onOpenChange={setShowCustomSizePopover}
              placement="bottomRight"
              destroyTooltipOnHide={false}
            >
              <Button type="default" size="small" icon={<Plus size={14} />}>
                Custom Size
              </Button>
            </Popover>
          </div>

          {/* Custom Sizes List */}
          {breakdown.custom && Object.keys(breakdown.custom).length > 0 && (
            <div className="space-y-3">
              {Object.entries(breakdown.custom).map(([name, quantity]) => (
                <div
                  key={name}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <span className="font-medium">{name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">{quantity}</span>
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<X size={14} />}
                      onClick={() =>
                        onRemoveCustomSize(
                          modalState.itemIndex,
                          modalState.tabKey,
                          modalState.fieldKey,
                          name
                        )
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default SizesModalComponent;
