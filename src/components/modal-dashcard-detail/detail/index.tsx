import { FC, useEffect, useState } from "react";
import { useCardDetailContext } from "@providers/card-detail-context";
import ShowFilter from "./filter/show";
import EditFilter from "./filter/edit";
import { IItemDashcard } from "@myTypes/card";
import { LookupCache } from "@utils/lookup-cache";
import { fetchLookups } from "@utils/fetch-lookups";
import { boardDetails } from "@api/board";
import { listDetails } from "@api/list";
import { userDetails } from "@api/account";
import { customFieldDetails } from "@api/custom_field";
import { DashcardDisplayType, DashcardDisplayConfig } from "@myTypes/dashcard";
import { useCustomFields } from "@hooks/custom_field";
import { useParams } from "next/navigation";
import { Select, Button, ColorPicker } from "antd";
import { EnumCustomFieldType } from "@myTypes/custom-field";
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

  const [lookupVersion, setLookupVersion] = useState(0);
  const [isEditingDisplay, setIsEditingDisplay] = useState(false);
  const [displayConfig, setDisplayConfig] = useState<DashcardDisplayConfig>(
    dashcardConfig?.displayConfig || { type: DashcardDisplayType.CARD_COUNT }
  );
  const [bgColor, setBgColor] = useState(dashcardConfig?.backgroundColor || "#4096ff");

  const handleColorChange = (color: any) => {
    setBgColor(color.toHexString());
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
    updateBackgroundColor(bgColor);
    setIsEditingDisplay(false);
  };

  // Sync display config when dashcard config changes
  useEffect(() => {
    if (dashcardConfig?.displayConfig) {
      setDisplayConfig(dashcardConfig.displayConfig);
    }
  }, [dashcardConfig]);

  // Process items and cache lookups
  useEffect(() => {
    if (!itemDashcard.length) {
      setProcessedItemDashcard([]);
      return;
    }

    const processItems = async () => {
      // Collect all IDs that need to be cached
      const boardIds = new Set<string>();
      const listIds = new Set<string>();
      const userIds = new Set<string>();
      const fieldIds = new Set<string>();

      itemDashcard.forEach((item) => {
        if (item.boardId) boardIds.add(item.boardId);
        if (item.listId) listIds.add(item.listId);

        // Collect member IDs
        item.member?.forEach((member) => {
          if (member.id) userIds.add(member.id);
        });

        // Collect custom field IDs from columns
        item.columns?.forEach((col) => {
          if (col.column && col.column.startsWith("custom_field_")) {
            const fieldId = col.column.replace("custom_field_", "");
            fieldIds.add(fieldId);
          }
        });
      });

      // Fetch missing lookups
      const promises = [];

      if (boardIds.size > 0) {
        const unknownBoards = Array.from(boardIds).filter(
          (id) => !LookupCache.label("board", id)
        );
        if (unknownBoards.length > 0) {
          promises.push(
            fetchLookups("board", unknownBoards, boardDetails as any)
          );
        }
      }

      if (listIds.size > 0) {
        const unknownLists = Array.from(listIds).filter(
          (id) => !LookupCache.label("list", id)
        );
        if (unknownLists.length > 0) {
          promises.push(fetchLookups("list", unknownLists, listDetails as any));
        }
      }

      if (userIds.size > 0) {
        const unknownUsers = Array.from(userIds).filter(
          (id) => !LookupCache.label("user", id)
        );
        if (unknownUsers.length > 0) {
          promises.push(fetchLookups("user", unknownUsers, userDetails as any));
        }
      }

      if (fieldIds.size > 0) {
        const unknownFields = Array.from(fieldIds).filter(
          (id) => !LookupCache.label("field", id)
        );
        if (unknownFields.length > 0) {
          promises.push(
            fetchLookups("field", unknownFields, customFieldDetails as any)
          );
        }
      }

      // Wait for all lookups to complete
      await Promise.all(promises);

      // Process items with cached data
      const processed = itemDashcard.map((item) => {
        const processedItem = { ...item } as any;

        // Add board and list names
        if (item.boardId) {
          processedItem.boardName =
            LookupCache.label("board", item.boardId) || item.boardId;
        }
        if (item.listId) {
          processedItem.listName =
            LookupCache.label("list", item.listId) || item.listId;
        }

        // Process members with names
        if (item.member) {
          processedItem.member = item.member.map((member) => ({
            ...member,
            name:
              LookupCache.label("user", member.id) || member.name || member.id,
          }));
        }

        // Process custom field columns
        if (item.columns) {
          processedItem.columns = item.columns.map((col) => {
            const processedCol = { ...col };

            // If it's a custom field, try to get the field name and option labels
            if (col.column.startsWith("custom_field_")) {
              const fieldId = col.column.replace("custom_field_", "");
              const fieldName = LookupCache.label("field", fieldId);

              if (fieldName) {
                processedCol.column = fieldName;
              }

              // Try to get option label for the value
              if (col.value && col.type === "select") {
                const optionLabel = LookupCache.label("field", col.value);
                if (optionLabel) {
                  processedCol.value = optionLabel;
                }
              }
            }

            return processedCol;
          });
        }

        return processedItem;
      });

      setProcessedItemDashcard(processed);
      setLookupVersion((v) => v + 1);
    };

    processItems();
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
