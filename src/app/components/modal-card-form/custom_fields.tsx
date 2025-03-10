import React, { useState, useEffect } from "react";
import { Checkbox, Input, Select, Tag, Typography, message } from "antd";
import { ChevronDown } from "lucide-react";
import { CustomField } from "@/app/dto/types";
import { useDispatch, useSelector } from "react-redux";
import { updateCard } from "@/app/store/card_slice";
import { RootState } from "@/app/store";
import { moveCard } from "@/app/store/list_slice";

// Type definitions
interface CustomFieldsSectionProps {
  customFields: CustomField[];
  cardId: string;
}

const CustomFieldsSection: React.FC<CustomFieldsSectionProps> = ({
  customFields,
  cardId,
}) => {
  // Map of fields that should appear in the UI with their default values
  const fieldDefaults: Record<string, string | boolean> = {
    Priority: "",
    Cabang: "",
    "Deal Maker": "",
    "Desain Langsung": "",
    Produk: "",
    Varian: "",
    "Jenis Cetak": "",
    Bahan: "",
    Warna: "",
    Desainer: "",
    "Revisi Desain": false,
    "Terkirim ke DM": false,
    "Desain ACC": false,
  };

  // Define the order of fields
  const fieldOrder = [
    "Priority",
    "Cabang",
    "Deal Maker",
    "Desain Langsung",
    "Produk",
    "Varian",
    "Jenis Cetak",
    "Bahan",
    "Warna",
    "Desainer",
    "Revisi Desain",
    "Terkirim ke DM",
    "Desain ACC",
  ];

  // Get dispatch function for Redux
  const dispatch = useDispatch();

  // Get the current user from Redux state
  const currentUser = useSelector(
    (state: RootState) => state.users.currentUser
  );

  // Get the current card from Redux state for real-time updates
  const card = useSelector((state: RootState) =>
    state.cards.cards.find((c) => c.id === cardId)
  );

  // Get all lists from Redux store
  const allLists = useSelector((state: RootState) => state.lists.lists);

  // Get current board ID
  const currentBoard = useSelector(
    (state: RootState) => state.boards?.currentBoard || null
  );

  // Load values from localStorage if available
  const loadValuesFromStorage = () => {
    try {
      // First try to get values from Redux state (most up-to-date)
      if (card && card.customFields) {
        const reduxValues: Record<string, string | boolean> = {};
        card.customFields.forEach((field: any) => {
          reduxValues[field.name] = field.value?.displayValue;
        });
        console.log("Loaded values from Redux state:", reduxValues);
        return reduxValues;
      }

      // Try to get from persist:root storage next
      const persistRoot = localStorage.getItem("persist:root");
      if (persistRoot) {
        const parsedRoot = JSON.parse(persistRoot);
        if (parsedRoot.cards) {
          const cardsState = JSON.parse(parsedRoot.cards);
          const persistedCard = cardsState.cards.find(
            (c: any) => c.id === cardId
          );
          if (persistedCard && persistedCard.customFields) {
            const loadedValues: Record<string, string | boolean> = {};
            persistedCard.customFields.forEach((field: any) => {
              loadedValues[field.name] = field.value?.displayValue;
            });
            console.log("Loaded values from persist:root:", loadedValues);
            return loadedValues;
          }
        }
      }

      // Fallback to direct localStorage
      const storedValues = localStorage.getItem(`customFields_${cardId}`);
      if (storedValues) {
        return JSON.parse(storedValues);
      }
    } catch (error) {
      console.error("Error loading custom fields from storage:", error);
    }

    // If all else fails, use the provided custom fields
    const fieldValues: Record<string, string | boolean> = {};
    customFields.forEach((field) => {
      fieldValues[field.name] =
        field.value?.displayValue || fieldDefaults[field.name] || "";
    });
    return fieldValues;
  };

  // State to track field values
  const [values, setValues] = useState<Record<string, string | boolean>>(
    loadValuesFromStorage()
  );

  // Update local state when Redux state changes
  useEffect(() => {
    if (card && card.customFields) {
      const reduxValues: Record<string, string | boolean> = {};
      card.customFields.forEach((field: any) => {
        reduxValues[field.name] = field.value?.displayValue;
      });

      // Only update if values are different to avoid infinite loop
      const hasChanges = Object.keys(reduxValues).some(
        (key) => reduxValues[key] !== values[key]
      );

      if (hasChanges) {
        console.log("Updating local state from Redux:", reduxValues);
        setValues(reduxValues);
      }
    }
  }, [card, cardId]);

  // Save values to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(`customFields_${cardId}`, JSON.stringify(values));
      console.log("Custom fields saved to localStorage:", values);
    } catch (error) {
      console.error("Error saving custom fields to localStorage:", error);
    }
  }, [values, cardId]);

  // Combine default fields with actual values
  const mergedFields = fieldOrder.map((fieldName) => ({
    name: fieldName,
    value:
      values[fieldName] !== undefined
        ? values[fieldName]
        : fieldDefaults[fieldName],
    isCheckbox: ["Revisi Desain", "Terkirim ke DM", "Desain ACC"].includes(
      fieldName
    ),
  }));

  // Get the icon component for a field
  const getIconComponent = (fieldName: string): JSX.Element => {
    const isCheckboxField = [
      "Revisi Desain",
      "Terkirim ke DM",
      "Desain ACC",
    ].includes(fieldName);

    if (isCheckboxField) {
      return (
        <svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
      );
    }

    return (
      <svg
        className="w-4 h-4"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M4 6H20M4 12H20M4 18H20"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  };

  // Handle field value changes
  const handleFieldChange = (fieldName: string, value: string | boolean) => {
    // Create a copy of the current values
    const newValues = { ...values };

    // Special handling for checkbox fields that need to be mutually exclusive
    if (
      fieldName === "Revisi Desain" ||
      fieldName === "Terkirim ke DM" ||
      fieldName === "Desain ACC"
    ) {
      if (value === true) {
        // If this checkbox is being checked, uncheck the others
        newValues["Revisi Desain"] = false;
        newValues["Terkirim ke DM"] = false;
        newValues["Desain ACC"] = false;

        // Then check the selected one
        newValues[fieldName] = true;

        // Move card to appropriate list
        moveCardToList(fieldName);
      } else {
        // Just update the value normally if unchecking
        newValues[fieldName] = value;
      }
    } else {
      // For all other fields, just update the value
      newValues[fieldName] = value;
    }

    // Define branch-specific data
    const branchData: Record<string, { dealMaker: string; designer: string }> =
      {
        WBT: { dealMaker: "Uswatun Hasanah", designer: "Shodiq" },
        KLT: { dealMaker: "Ramli Ramadhan", designer: "Tyo" },
        KBT: { dealMaker: "John Doe", designer: "Andi" },
        MGW: { dealMaker: "Jane Smith", designer: "Budi" },
        SLO: { dealMaker: "Alex Johnson", designer: "Citra" },
      };

    // Handle related field updates
    if (fieldName === "Cabang" && typeof value === "string") {
      // Get the branch data if it exists
      const branchInfo = branchData[value];

      // Update Deal Maker and Designer based on branch selection if data exists
      if (branchInfo) {
        newValues["Deal Maker"] = branchInfo.dealMaker;
        newValues["Desainer"] = branchInfo.designer;
        console.log(
          `Updated fields for branch ${value}: Deal Maker=${branchInfo.dealMaker}, Designer=${branchInfo.designer}`
        );
      }
    }

    // Update the state with new values
    setValues(newValues);

    // Save to Redux and localStorage
    saveCustomFields(newValues);
  };

  // Save custom fields to Redux store and localStorage
  const saveCustomFields = (newValues: Record<string, string | boolean>) => {
    // Prepare custom fields for Redux update
    const customFieldsForUpdate = Object.entries(newValues).map(
      ([name, value]) => ({
        name,
        value: {
          displayValue: value,
          rawValue: value,
        },
      })
    );

    try {
      // Directly dispatch to Redux store with the current user
      dispatch(
        updateCard({
          id: cardId,
          customFields: customFieldsForUpdate,
          user: currentUser || {
            id: "system",
            fullname: "System",
            avatar: "",
            role: "system",
          },
        })
      );

      // Also save to localStorage as a backup
      localStorage.setItem(`customFields_${cardId}`, JSON.stringify(newValues));
      console.log("Custom fields saved to localStorage:", newValues);
    } catch (error) {
      console.error("Error updating card custom fields:", error);
    }
  };

  // Function to move card to appropriate list based on checkbox selection
  const moveCardToList = (fieldName: string) => {
    try {
      // Find the current list that contains this card
      let sourceListId = "";
      let boardId = currentBoard;

      for (const list of allLists) {
        if (list.cardIds && list.cardIds.includes(cardId)) {
          sourceListId = list.id;

          // If we don't have a currentBoard, extract the board ID from the list ID
          if (!boardId && list.id) {
            // List IDs are typically in the format "boardId:listId"
            const parts = list.id.split(":");
            if (parts.length > 0) {
              boardId = parts[0];
            }
          }

          break;
        }
      }

      if (!sourceListId) {
        console.error("Card not found in any list");
        message.error("Card not found in any list");
        return;
      }

      if (!boardId) {
        console.error("Could not determine board ID");
        message.error("Could not determine board ID");
        return;
      }

      // Determine target list based on checkbox
      let targetListTitle = "";
      if (fieldName === "Revisi Desain") {
        targetListTitle = "Revisi Desain";
      } else if (fieldName === "Terkirim ke DM") {
        targetListTitle = "Terkirim ke DM";
      } else if (fieldName === "Desain ACC") {
        targetListTitle = "Desain Acc";
      }

      // Find the target list ID
      const targetList = allLists.find(
        (list) => list.title === targetListTitle && list.id.startsWith(boardId)
      );

      if (!targetList) {
        console.error(`Target list "${targetListTitle}" not found`);
        message.error(`Target list "${targetListTitle}" not found`);
        return;
      }

      // Don't move if already in the correct list
      if (sourceListId === targetList.id) {
        return;
      }

      // Move the card
      dispatch(
        moveCard({
          sourceListId,
          destinationListId: targetList.id,
          cardId,
        })
      );

      message.success(`Card moved to ${targetListTitle}`);
    } catch (error) {
      console.error("Error moving card between lists:", error);
      message.error("Failed to move card to the appropriate list");
    }
  };

  // Render each custom field
  const renderField = (field: {
    name: string;
    value: string | boolean;
    isCheckbox: boolean;
  }) => {
    const isCheckboxField = field.isCheckbox;
    const isInputField = field.name === "Warna";
    const isDropdownField = !isCheckboxField && !isInputField;

    // Options for dropdown fields
    const getDropdownOptions = (fieldName: string) => {
      const options = {
        Priority: ["URGENT"],
        Cabang: ["WBT", "KLT", "KBT", "MGW", "SLO"],
        "Deal Maker": [
          "Uswatun Hasanah",
          "Ramli Ramadhan",
          "John Doe",
          "Jane Smith",
          "Alex Johnson",
        ],
        "Desain Langsung": ["Ya", "Tidak"],
        Produk: ["HEMCA Polo", "T-Shirt", "Jacket", "Hoodie"],
        Varian: ["Polos", "KMB"],
        "Jenis Cetak": ["Bordir", "DTF", "Rubber"],
        Bahan: [
          "Lacost Pique Supersoft",
          "Cotton Combed 30s",
          "Cotton Combed 24s",
        ],
        Desainer: ["Shodiq", "Tyo", "Andi", "Budi", "Citra"],
      };

      return options[fieldName as keyof typeof options] || [];
    };

    // Special styling for status checkboxes
    const isStatusCheckbox = [
      "Revisi Desain",
      "Terkirim ke DM",
      "Desain ACC",
    ].includes(field.name);
    let checkboxColor = "text-blue-600";
    let checkboxTooltip = "";

    if (isStatusCheckbox) {
      if (field.name === "Revisi Desain") {
        checkboxColor = "text-orange-500";
        checkboxTooltip = "Move card to Revisi Desain list";
      } else if (field.name === "Terkirim ke DM") {
        checkboxColor = "text-cyan-500";
        checkboxTooltip = "Move card to Terkirim ke DM list";
      } else if (field.name === "Desain ACC") {
        checkboxColor = "text-green-500";
        checkboxTooltip = "Move card to Desain ACC list";
      }
    }

    return (
      <div key={field.name} className="mb-6 text-sm">
        <div className="flex items-center text-gray-600 mb-1">
          <span className="mr-2">{getIconComponent(field.name)}</span>
          <span className="text-xs font-medium">{field.name}</span>
        </div>

        {isCheckboxField ? (
          <div className="pl-6">
            <Checkbox
              checked={Boolean(field.value)}
              onChange={(e) => handleFieldChange(field.name, e.target.checked)}
              className={isStatusCheckbox ? checkboxColor : ""}
              title={checkboxTooltip}
            ></Checkbox>
          </div>
        ) : isInputField ? (
          <Input
            value={field.value as string}
            className="w-full bg-gray-50 rounded p-2 border border-gray-200 text-sm"
            placeholder="Enter color description"
            size="small"
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
          />
        ) : (
          <Select
            className="w-full text-sm"
            value={(field.value as string) || undefined}
            placeholder="Select..."
            suffixIcon={<ChevronDown size={16} />}
            options={getDropdownOptions(field.name).map((option) => ({
              value: option,
              label: option,
            }))}
            onChange={(value) => handleFieldChange(field.name, value)}
            style={{
              borderRadius: "0.25rem",
            }}
            dropdownStyle={{
              borderRadius: "0.25rem",
              boxShadow:
                "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
            }}
            popupClassName="custom-dropdown"
          />
        )}
      </div>
    );
  };

  // Render field labels for display in the card
  const renderFieldLabels = () => {
    return (
      <div className="field-labels flex flex-wrap gap-1 mt-4">
        {Object.entries(values).map(([name, value]) => {
          // Skip rendering empty values and checkboxes that are false
          if (value === "" || (typeof value === "boolean" && !value)) {
            return null;
          }

          // Get appropriate color based on field type
          let color = "default";
          if (name === "Priority" && value === "URGENT") {
            color = "red";
          } else if (name === "Cabang") {
            color = "blue";
          } else if (name === "Deal Maker") {
            color = "purple";
          } else if (name === "Desainer") {
            color = "green";
          } else if (typeof value === "boolean" && value === true) {
            color = "success";
          }

          return (
            <Tag color={color} key={name} className="py-1 px-2">
              {name}: {typeof value === "boolean" ? "Yes" : value}
            </Tag>
          );
        })}
      </div>
    );
  };

  // Render the component
  return (
    <div className="custom-fields-section mb-6">
      <div className="section-header mb-4">
        <span className="section-icon">
          <i className="fi fi-rr-apps"></i>
        </span>
        <Typography.Title level={5} className="m-0">
          Custom Fields
        </Typography.Title>
      </div>

      {/* Sort fields and render them in a flex layout */}
      <div className="flex flex-wrap text-sm">
        {mergedFields
          .sort((a, b) => {
            // Status checkboxes go to the very bottom
            const aIsStatus = [
              "Revisi Desain",
              "Terkirim ke DM",
              "Desain ACC",
            ].includes(a.name);
            const bIsStatus = [
              "Revisi Desain",
              "Terkirim ke DM",
              "Desain ACC",
            ].includes(b.name);

            if (aIsStatus && !bIsStatus) return 1;
            if (!aIsStatus && bIsStatus) return -1;

            // Other checkboxes come before status checkboxes but after regular fields
            const aIsCheckbox = a.isCheckbox;
            const bIsCheckbox = b.isCheckbox;

            if (aIsCheckbox && !bIsCheckbox) return 1;
            if (!aIsCheckbox && bIsCheckbox) return -1;

            // Otherwise maintain alphabetical order
            return a.name.localeCompare(b.name);
          })
          .map((field, index) => (
            <div key={index} className="w-full md:w-1/3 pr-4 mb-4">
              {renderField(field)}
            </div>
          ))}
      </div>

      <style jsx global>{`
        .ant-select-item-option-selected {
          background-color: #f0f7ff !important;
          font-weight: normal !important;
        }

        .ant-select-item-option-active {
          background-color: #f5f5f5 !important;
        }

        .ant-select-dropdown {
          padding: 4px !important;
        }
      `}</style>
    </div>
  );
};

export default CustomFieldsSection;
