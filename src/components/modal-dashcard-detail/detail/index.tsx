import { FC, useEffect, useState } from "react";
import { useCardDetailContext } from "@providers/card-detail-context";
import ShowFilter from "./filter/show";
import EditFilter from "./filter/edit";
import { DashcardDisplayType, DashcardDisplayConfig } from "@myTypes/dashcard";
import { useCustomFields } from "@hooks/custom_field";
import { useParams } from "next/navigation";
import { Button, ColorPicker } from "antd";
import { Edit } from "lucide-react";

const Detail: FC = () => {
  const {
    dashcardConfig,
    selectedCard,
    itemDashcard,
    openEditFilter,
    setProcessedItemDashcard,
    processedItemDashcard,
    isUpdatingCard,
    updateDisplayConfig,
    updateBackgroundColor,
  } = useCardDetailContext();

  const { workspaceId } = useParams();
  const { customFields } = useCustomFields(
    Array.isArray(workspaceId) ? workspaceId[0] : workspaceId
  );

  const [isEditingDisplay, setIsEditingDisplay] = useState(false);
  const [displayConfig, setDisplayConfig] = useState<DashcardDisplayConfig>(
    dashcardConfig?.displayConfig || { type: DashcardDisplayType.CARD_COUNT }
  );
  const [bgColor, setBgColor] = useState(dashcardConfig?.backgroundColor || "#4096ff");

  const handleColorChange = (color: any) => {
    setBgColor(color.toHexString());
  };

  const handleColorChangeComplete = (color: any) => {
    const hexColor = color.toHexString();
    updateBackgroundColor(hexColor);
  };

  // Calculate display value based on configuration
  const getDisplayValue = () => {
    if (displayConfig.type === DashcardDisplayType.CUSTOM_FIELD_SUM && displayConfig.customFieldId) {
      // Find the custom field to get its name
      const customField = customFields?.find(field => field.id === displayConfig.customFieldId);
      if (!customField) return processedItemDashcard?.length || 0;
      
      // Calculate sum of the custom field using the field name
      const sum = processedItemDashcard.reduce((total, item) => {
        const customFieldColumn = item.columns?.find(
          (col) => col.column === customField.name
        );
        if (!customFieldColumn) return total;
        
        const value = customFieldColumn.value;
        const numValue = typeof value === 'string' ? parseFloat(value) : (typeof value === 'number' ? value : 0);
        return total + (isNaN(numValue) ? 0 : numValue);
      }, 0);
      return Math.round(sum).toString();
    }
    return processedItemDashcard?.length || 0;
  };

  // Get display label based on configuration
  const getDisplayLabel = () => {
    if (displayConfig.type === DashcardDisplayType.CUSTOM_FIELD_SUM && displayConfig.customFieldId) {
      const customField = customFields?.find(field => field.id === displayConfig.customFieldId);
      return customField ? `${customField.name} Total` : 'Custom Field Total';
    }
    return 'Card';
  };

  // Handle display configuration save
  const handleSaveDisplayConfig = () => {
    updateDisplayConfig(displayConfig);
    setIsEditingDisplay(false);
  };

  // Sync display config when dashcard config changes
  useEffect(() => {
    if (dashcardConfig?.displayConfig) {
      setDisplayConfig(dashcardConfig.displayConfig);
    }
  }, [dashcardConfig]);

  // Process items - backend now sends all names resolved, no need to fetch lookups
  useEffect(() => {
    if (!itemDashcard.length) {
      setProcessedItemDashcard([]);
      return;
    }

    // Backend now sends:
    // - boardName directly
    // - listName directly (via list_name)
    // - member[].name (username) directly
    // - columns[].column is already the field name
    // - columns[].value for dropdowns is the label, not option ID
    // - User custom field values are resolved to usernames
    const processed = itemDashcard.map((item) => {
      const processedItem = { ...item } as any;

      // Ensure boardName and listName are set (backend sends them)
      if (!processedItem.boardName && item.boardId) {
        processedItem.boardName = item.boardId; // Fallback to ID if name missing
      }
      if (!processedItem.listName && (item as any).list_name) {
        processedItem.listName = (item as any).list_name;
      }

      return processedItem;
    });

    setProcessedItemDashcard(processed);
  }, [itemDashcard]);

  return (
    <div className="flex gap-3">
      <div className="flex flex-col gap-3">
        <div
          style={{
            backgroundColor: bgColor,
          }}
          className="w-60 h-40 rounded-lg flex flex-col items-center justify-center text-white font-bold text-xl relative"
        >
          <Button
            type="text"
            size="small"
            icon={<Edit size={14} />}
            className="absolute top-2 right-2 text-white hover:text-gray-200"
            onClick={() => setIsEditingDisplay(true)}
          />
          <div className="text-4xl font-bold mb-2">{getDisplayValue()}</div>
          <div className="text-sm opacity-90 mb-1">{getDisplayLabel()}</div>
          <div className="text-sm opacity-75">{selectedCard?.name}</div>
        </div>

        {isEditingDisplay && (
          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <div className="mb-3">
              <label className="block text-sm font-medium mb-2">Background Color</label>
              <ColorPicker
                defaultFormat="hex"
                format="hex"
                value={bgColor}
                disabledAlpha={false}
                onChange={handleColorChange}
                onChangeComplete={handleColorChangeComplete}
                showText={true}
              />
            </div>

            <div className="flex gap-2">
              <Button type="primary" size="small" onClick={handleSaveDisplayConfig}>
                Save
              </Button>
              <Button size="small" onClick={() => setIsEditingDisplay(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {openEditFilter ? <EditFilter /> : <ShowFilter />}
    </div>
  );
};

export default Detail;
