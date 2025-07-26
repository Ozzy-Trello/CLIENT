"use client";

import React, { useState, useRef } from "react";
import { Button, Input, message } from "antd";
import type { InputRef } from "antd";

interface CustomSizePopoverComponentProps {
  onAddCustomSize: (name: string, quantity: number) => void;
  onCancel: () => void;
}

const CustomSizePopoverComponent: React.FC<CustomSizePopoverComponentProps> = ({
  onAddCustomSize,
  onCancel,
}) => {
  const [customSizeName, setCustomSizeName] = useState("");
  const [customSizeQuantity, setCustomSizeQuantity] = useState("");
  const nameInputRef = useRef<InputRef>(null);
  const quantityInputRef = useRef<InputRef>(null);

  const handleAddCustomSize = () => {
    const name = customSizeName.trim();
    const quantity = Number.parseInt(customSizeQuantity);

    if (!name) {
      message.error("Please enter a custom size name");
      return;
    }

    if (isNaN(quantity) || quantity < 0) {
      message.error("Please enter a valid quantity");
      return;
    }

    // Removed quantity restrictions - users can enter any quantity

    onAddCustomSize(name, quantity);
    setCustomSizeName("");
    setCustomSizeQuantity("");
  };

  const handleNameKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && customSizeName.trim()) {
      e.preventDefault();
      quantityInputRef.current?.focus();
      setCustomSizeQuantity("1");
    }
  };

  const handleQuantityKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && customSizeName.trim() && customSizeQuantity) {
      e.preventDefault();
      handleAddCustomSize();
    }
  };

  return (
    <div className="p-4 space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Custom Size Name
        </label>
        <Input
          ref={nameInputRef}
          placeholder="e.g., XXXXS"
          value={customSizeName}
          onChange={(e) => setCustomSizeName(e.target.value)}
          onKeyPress={handleNameKeyPress}
          autoFocus
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Quantity
        </label>
        <Input
          ref={quantityInputRef}
          type="number"
          placeholder="0"
          min={0}
          value={customSizeQuantity}
          onChange={(e) => setCustomSizeQuantity(e.target.value)}
          onKeyPress={handleQuantityKeyPress}
        />
      </div>
      <div className="flex gap-2">
        <Button
          type="primary"
          size="small"
          onClick={handleAddCustomSize}
          disabled={!customSizeName.trim() || !customSizeQuantity}
        >
          Add Size
        </Button>
        <Button
          size="small"
          onClick={() => {
            setCustomSizeName("");
            setCustomSizeQuantity("");
            onCancel();
          }}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default CustomSizePopoverComponent;
