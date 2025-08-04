"use client";

import React, { useState } from "react";
import { Modal, Button, Input, Popover, message } from "antd";
import { Plus, X } from "lucide-react";
import { useSelector } from "react-redux";
import { selectTheme, selectIsDarkMode } from "@store/app_slice";
import { SizeBreakdown, SizeBreakdownModalState, SizeBreakdownItem } from "../types";
import { 
  useAdditionalFieldsStore,
  type POData,
  type BahanItem 
} from "@store/additional-fields-store";

interface CustomSizePopoverProps {
  onAddCustomSize: (name: string, quantity: number) => void;
  onCancel: () => void;
}

const CustomSizePopover: React.FC<CustomSizePopoverProps> = ({
  onAddCustomSize,
  onCancel,
}) => {
  const theme = useSelector(selectTheme);
  const isDarkMode = useSelector(selectIsDarkMode);
  const { colors } = theme;
  
  const [customSizeName, setCustomSizeName] = useState("");
  const [customSizeQuantity, setCustomSizeQuantity] = useState("");

  const handleAddCustomSize = () => {
    const name = customSizeName.trim();
    const quantity = parseInt(customSizeQuantity) || 0;

    if (!name) {
      message.error("Please enter a custom size name");
      return;
    }

    if (quantity < 0) {
      message.error("Please enter a valid quantity");
      return;
    }

    onAddCustomSize(name, quantity);
    setCustomSizeName("");
    setCustomSizeQuantity("");
  };

  const handleNameKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && customSizeName.trim()) {
      e.preventDefault();
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
    <div className="p-4 space-y-3 w-64">
      <div>
        <label 
          className="block text-sm font-medium mb-1"
          style={{ color: `rgb(${colors['text-muted']})` }}
        >
          Custom Size Name
        </label>
        <Input
          placeholder="e.g., XXXXS"
          value={customSizeName}
          onChange={(e) => setCustomSizeName(e.target.value)}
          onKeyPress={handleNameKeyPress}
          autoFocus
        />
      </div>
      <div>
        <label 
          className="block text-sm font-medium mb-1"
          style={{ color: `rgb(${colors['text-muted']})` }}
        >
          Quantity
        </label>
        <Input
          type="number"
          placeholder="0"
          min={0}
          step={1}
          value={customSizeQuantity}
          onChange={(e) => {
            const inputValue = e.target.value;
            if (inputValue === "" || inputValue === null || inputValue === undefined) {
              setCustomSizeQuantity("");
              return;
            }
            
            // Allow empty string for user to clear the field
            if (inputValue === "") {
              setCustomSizeQuantity("");
              return;
            }
            
            // Parse and validate the number
            const numericValue = parseInt(inputValue, 10);
            if (!isNaN(numericValue) && numericValue >= 0) {
              setCustomSizeQuantity(numericValue.toString());
            }
          }}
          onKeyDown={(e) => {
            // Prevent 'e', 'E', '+', '-', '.' from being entered
            if (['e', 'E', '+', '-', '.'].includes(e.key)) {
              e.preventDefault();
            }
          }}
          onKeyPress={handleQuantityKeyPress}
        />
      </div>
      <div className="flex gap-2">
        <Button
          type="primary"
          size="small"
          onClick={handleAddCustomSize}
          disabled={!customSizeName.trim()}
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

interface SizeBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryKey: string;
  fieldKey: string;
  sizeData: SizeBreakdown | undefined;
  poId: string;
  poData: POData;
  bahanItem?: BahanItem;
  debouncedSave: () => void;
}

const SizeBreakdownModal: React.FC<SizeBreakdownModalProps> = ({
  isOpen,
  onClose,
  categoryKey,
  fieldKey,
  sizeData,
  poId,
  poData,
  bahanItem,
  debouncedSave,
}) => {
  const theme = useSelector(selectTheme);
  const isDarkMode = useSelector(selectIsDarkMode);
  const { colors } = theme;
  
  const [breakdown, setBreakdown] = useState<SizeBreakdown>({
    XS: 0, S: 0, M: 0, L: 0, XL: 0, XXL: 0, XXXL: 0, XXXXL: 0, XXXXXL: 0, custom: {}
  });
  const [showCustomSizePopover, setShowCustomSizePopover] = useState(false);
  const { updatePOData } = useAdditionalFieldsStore();

  React.useEffect(() => {
    if (isOpen) {
      console.log("=== MODAL INITIALIZATION DEBUG ===");
      console.log("sizeData passed to modal:", sizeData);
      console.log("sizeData.custom:", sizeData?.custom);
      console.log("Category:", categoryKey, "Field:", fieldKey);
      
      const initialBreakdown = sizeData || {
        XS: 0, S: 0, M: 0, L: 0, XL: 0, XXL: 0, XXXL: 0, XXXXL: 0, XXXXXL: 0, custom: {}
      };
      
      console.log("Setting breakdown to:", initialBreakdown);
      setBreakdown(initialBreakdown);
      console.log("=== END MODAL INITIALIZATION DEBUG ===");
    } else {
      setBreakdown({
        XS: 0, S: 0, M: 0, L: 0, XL: 0, XXL: 0, XXXL: 0, XXXXL: 0, XXXXXL: 0, custom: {}
      });
    }
    // We only want to sync from props when the modal opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const currentDataSource = bahanItem || poData;

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

  const handleUpdateSizeBreakdown = (updatedBreakdown: SizeBreakdown) => {
    console.log("=== SIZE BREAKDOWN UPDATE DEBUG ===");
    console.log("Updated breakdown:", updatedBreakdown);
    console.log("Category:", categoryKey, "Field:", fieldKey);
    
    const newSizeBreakdowns = (poData.sizeBreakdowns || []).filter(
      (item) =>
        !(item.category === categoryKey && item.field === fieldKey)
    );

    console.log("Filtered existing breakdowns:", newSizeBreakdowns.length);

    // Add updated sizes if quantity > 0
    Object.entries(updatedBreakdown).forEach(([size, quantity]) => {
      console.log(`Processing size: ${size}, quantity: ${quantity}, type: ${typeof quantity}`);
      
      if (size === "custom" && typeof quantity === "object") {
        console.log("Processing custom sizes:", quantity);
        // Handle custom sizes
        Object.entries(quantity as Record<string, number>).forEach(
          ([customSize, customQuantity]) => {
            console.log(`Custom size: ${customSize}, quantity: ${customQuantity}`);
            if (customQuantity > 0) {
              for (let i = 0; i < customQuantity; i++) {
                const newItem = {
                  label: `${customSize}-${i + 1}`,
                  size: customSize,
                  uniqueId: `${Date.now()}-${customSize}-${i}`,
                  isScanned: false,
                  category: categoryKey,
                  field: fieldKey,
                };
                console.log("Adding custom size item:", newItem);
                newSizeBreakdowns.push(newItem);
              }
            }
          }
        );
      } else if (quantity > 0) {
        console.log(`Adding standard size: ${size}`);
        for (let i = 0; i < (quantity as number); i++) {
          newSizeBreakdowns.push({
            label: `${size}-${i + 1}`,
            size: size,
            uniqueId: `${Date.now()}-${size}-${i}`,
            isScanned: false,
            category: categoryKey,
            field: fieldKey,
          });
        }
      }
    });

    console.log("Final size breakdowns:", newSizeBreakdowns);
    console.log("Custom sizes in final breakdown:", newSizeBreakdowns.filter(sb => !['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'XXXXL', 'XXXXXL'].includes(sb.size)));

    if (bahanItem) {
      updatePOData(poId, {
        ...poData,
        bahan: poData.bahan.map((b) =>
          b.id === bahanItem.id
            ? { ...b, sizeBreakdowns: newSizeBreakdowns } : b
        ),
      });
    } else {
      updatePOData(poId, { ...poData, sizeBreakdowns: newSizeBreakdowns });
    }
    console.log("=== END SIZE BREAKDOWN UPDATE DEBUG ===");
    debouncedSave();
  };

  const handleSizeChange = (size: string, quantity: number) => {
    const updatedBreakdown = {
      ...breakdown,
      [size]: quantity,
    };
    setBreakdown(updatedBreakdown);
    handleUpdateSizeBreakdown(updatedBreakdown);
  };

  const handleAddCustomSize = (name: string, quantity: number) => {
    console.log("=== ADD CUSTOM SIZE DEBUG ===");
    console.log("Adding custom size:", name, "quantity:", quantity);
    console.log("Current breakdown before:", breakdown);
    
    const updatedBreakdown = {
      ...breakdown,
      custom: {
        ...breakdown.custom,
        [name]: quantity,
      },
    };
    
    console.log("Updated breakdown after:", updatedBreakdown);
    console.log("=== END ADD CUSTOM SIZE DEBUG ===");
    
    setBreakdown(updatedBreakdown);
    handleUpdateSizeBreakdown(updatedBreakdown);
    setShowCustomSizePopover(false);
  };

  const handleRemoveCustomSize = (name: string) => {
    const updatedCustom = { ...breakdown.custom };
    delete updatedCustom[name];
    const updatedBreakdown = {
      ...breakdown,
      custom: updatedCustom,
    };
    setBreakdown(updatedBreakdown);
    handleUpdateSizeBreakdown(updatedBreakdown);
  };

  return (
    <Modal
      title={`Set Sizes for ${categoryKey} - ${fieldKey}`}
      open={isOpen}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      <div className="space-y-6 p-4">
        <div 
          className="flex justify-between items-center p-4 rounded-lg"
          style={{ backgroundColor: `rgb(${colors.muted})` }}
        >
          <span 
            className="font-medium"
            style={{ color: `rgb(${colors.text})` }}
          >
            Total Quantity: {totalSizes}
          </span>
          <span 
            className="font-medium"
            style={{ color: `rgb(${colors.primary})` }}
          >
            Calculated from sizes
          </span>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {standardSizes.map((size) => (
            <div key={size.key} className="space-y-3">
              <label 
                className="block text-sm font-medium"
                style={{ color: `rgb(${colors['text-muted']})` }}
              >
                {size.label}
              </label>
              <Input
                type="number"
                min={0}
                step={1}
                value={(breakdown as any)[size.key] || 0}
                onChange={(e) => {
                  const inputValue = e.target.value;
                  const numericValue = parseInt(inputValue, 10);
                  const value = isNaN(numericValue) ? 0 : Math.max(0, numericValue);
                  handleSizeChange(size.key, value);
                }}
                placeholder="0"
                className="text-center"
                onKeyDown={(e) => {
                  // Prevent 'e', 'E', '+', '-', '.' from being entered
                  if (['e', 'E', '+', '-', '.'].includes(e.key)) {
                    e.preventDefault();
                  }
                }}

              />
            </div>
          ))}
        </div>

        {/* Custom Sizes */}
        <div 
          className="pt-6"
          style={{ borderTop: `1px solid rgb(${colors.border})` }}
        >
          <div className="flex items-center justify-between mb-4">
            <h4 
              className="font-medium"
              style={{ color: `rgb(${colors.text})` }}
            >
              Custom Sizes
            </h4>
            <Popover
              content={
                <CustomSizePopover
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
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{ backgroundColor: `rgb(${colors.muted})` }}
                >
                  <span 
                    className="font-medium"
                    style={{ color: `rgb(${colors.text})` }}
                  >
                    {name}
                  </span>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={quantity || 0}
                      onChange={(e) => {
                        const inputValue = e.target.value;
                        const numericValue = parseInt(inputValue, 10);
                        const value = isNaN(numericValue) ? 0 : Math.max(0, numericValue);

                        const updatedBreakdown = {
                          ...breakdown,
                          custom: {
                            ...breakdown.custom,
                            [name]: value,
                          },
                        };
                        setBreakdown(updatedBreakdown);
                        handleUpdateSizeBreakdown(updatedBreakdown);
                      }}
                      placeholder="0"
                      className="text-center w-20"
                      onKeyDown={(e) => {
                        // Prevent 'e', 'E', '+', '-', '.' from being entered
                        if (['e', 'E', '+', '-', '.'].includes(e.key)) {
                          e.preventDefault();
                        }
                      }}

                    />
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<X size={14} />}
                      onClick={() =>
                        handleRemoveCustomSize(name)
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

export default SizeBreakdownModal;