"use client";

import React, { useState } from "react";
import { Modal, Button, Input, Popover } from "antd";
import { Plus, X } from "lucide-react";
import CustomSizePopoverComponent from "./CustomSizePopoverComponent";
import type { SizeBreakdown } from "../types";

interface LocalSizesModalProps {
  isOpen: boolean;
  onClose: () => void;
  tabKey: string;
  fieldKey: string;
  tabNames: Array<{
    key: string;
    label: string;
    fields: Record<string, { label: string; value: number }>;
  }>;
  poIdentifier: number;
  localSizesData: Record<string, SizeBreakdown>;
  setLocalSizesData: React.Dispatch<React.SetStateAction<Record<string, SizeBreakdown>>>;
  onSave: (sizesData: Record<string, SizeBreakdown>) => void;
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
  onSave,
}) => {
  const [showCustomSizePopover, setShowCustomSizePopover] = useState(false);

  if (!isOpen) return null;

  const sizesKey = `sizes_${poIdentifier}_${tabKey}_${fieldKey}`;
  
  // Get current size breakdown or create default
  const breakdown = localSizesData[sizesKey] || {
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

  // Calculate total from all sizes
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
      (sum, value) => sum + Number(value) || 0,
      0
    );
  };

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

      if (size !== "custom") {
        updatedData[sizesKey] = {
          ...updatedData[sizesKey],
          [size]: quantity,
        };
      }

      return updatedData;
    });
  };

  const handleAddCustomSize = (name: string, quantity: number) => {
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

      updatedData[sizesKey] = {
        ...updatedData[sizesKey],
        custom: {
          ...updatedData[sizesKey].custom,
          [name]: quantity,
        },
      };

      return updatedData;
    });
    setShowCustomSizePopover(false);
  };

  const handleRemoveCustomSize = (customSizeName: string) => {
    setLocalSizesData((prev) => {
      const updatedData = { ...prev };
      
      if (updatedData[sizesKey] && updatedData[sizesKey].custom) {
        const updatedCustom = { ...updatedData[sizesKey].custom };
        delete updatedCustom[customSizeName];
        
        updatedData[sizesKey] = {
          ...updatedData[sizesKey],
          custom: updatedCustom,
        };
      }
      
      return updatedData;
    });
  };

  const handleSave = () => {
    onSave(localSizesData);
    onClose();
  };

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      title={`Size Breakdown - ${tabNames.find((tab) => tab.key === tabKey)?.label} ${tabNames.find((tab) => tab.key === tabKey)?.fields[fieldKey]?.label}`}
      width={600}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button key="save" type="primary" onClick={handleSave}>
          Save
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
                value={String(breakdown[size.key as keyof SizeBreakdown] || "")}
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
                      onClick={() => handleRemoveCustomSize(name)}
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

export default LocalSizesModal;