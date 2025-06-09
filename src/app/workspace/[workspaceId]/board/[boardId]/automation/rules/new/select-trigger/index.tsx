import { ListSelection, SelectionRef } from "@components/selection";
import { Button, Input, Select, Typography } from "antd";
import { ListFilter, Plus } from "lucide-react";
import React, { Dispatch, SetStateAction, useEffect, useRef, useState, useCallback } from "react";
import { triggers } from "@constants/automation-rule/data";
import PopoverRuleCardFilter from "@components/popover-rule-card-filter";

import {
  AutomationRule,
  GeneralOptions,
  SelectedCardFilter,
  SelectedTriggerItem,
  TriggerItems,
  TriggerItemSelection,
} from "@myTypes/type";
import { EnumSelectionType } from "@myTypes/automation-rule";

function extractPlaceholders(pattern: string): string[] {
  const regex = /<([^>]+)>|\[([^\]]+)\]/g; // Matches both <...> and [...]
  const placeholders: string[] = [];

  let match;
  while ((match = regex.exec(pattern)) !== null) {
    placeholders.push(match[1] || match[2]);
  }
  return placeholders.filter(Boolean); 
}

interface SelectTriggerProps {
  nextStep: () => void;
  prevStep: () => void;
  setSelectedRule: Dispatch<SetStateAction<AutomationRule>>;
  selectedRule: AutomationRule;
}

// Component for the filter button
const FilterButton = ({
  itemType,
  props,
}: {
  itemType: string;
  props: SelectTriggerProps;
}) => {
  const [openFilter, setOpenFilter] = useState(false);
  const { selectedRule, setSelectedRule } = props;

  const handleSaveFilter = useCallback((filterData: SelectedCardFilter) => {
    setSelectedRule((prev) => ({
      ...prev,
      triggerItem: {
        ...prev.triggerItem,
        filter: filterData,
      } as SelectedTriggerItem,
    }));
    setOpenFilter(false);
  }, [setSelectedRule]);

  return (
    <PopoverRuleCardFilter
      key={`filter-button-${itemType}`}
      open={openFilter}
      setOpen={setOpenFilter}
      triggerEl={
        <Button type="text" size="small" className="mx-2">
          <ListFilter size={14} />
        </Button>
      }
    />
  );
};

const SelectOption = ({
  props,
  placeholder,
  data,
  itemType, 
}: {
  props: SelectTriggerProps;
  placeholder: string;
  data: TriggerItemSelection;
  itemType: string;
}) => {
  const { setSelectedRule, selectedRule } = props;

  const options = data?.options?.map((optionItem: GeneralOptions) => ({
    value: optionItem.value,
    label: optionItem.label,
    option: optionItem,
  }));

  const currentSelection = selectedRule.triggerItem?.[placeholder];

  const selectValue =
    currentSelection && typeof currentSelection === 'object' && 'value' in currentSelection
      ? (currentSelection as GeneralOptions).value
      : undefined; 

  const onSelectionChange = useCallback((selectedAntOption: { value: string; label: React.ReactNode; option: GeneralOptions }) => {
    setSelectedRule((prev) => ({
      ...prev,
      triggerItem: {
        ...prev.triggerItem,
        [placeholder]: selectedAntOption.option,
      } as SelectedTriggerItem, 
    }));
  }, [setSelectedRule, placeholder]);

  // Callback for ListSelection's onChange
  const onListChange = useCallback((selectedOption: GeneralOptions) => {
    setSelectedRule((prev) => ({
      ...prev,
      triggerItem: {
        ...prev.triggerItem,
        [placeholder]: selectedOption,
      } as SelectedTriggerItem,
    }));
  }, [setSelectedRule, placeholder]);

  if (placeholder === EnumSelectionType.List || placeholder === EnumSelectionType.OptionalList) {
    return (
      <ListSelection
        key={`list-select-${itemType}-${placeholder}`}
        width={"fit-content"}
        ref={useRef<SelectionRef>(null)}
        value={selectValue}
        onChange={(value: string, option: GeneralOptions) => {
          onListChange(option);
        }}
        className="mx-2"
      />
    );
  }

  return (
    <Select
      key={`ant-select-${itemType}-${placeholder}`}
      value={selectValue}
      options={options}
      style={{ width: 120, margin: '0 5px' }}
      onChange={(value, option) => {
        onSelectionChange(option as { value: string; label: React.ReactNode; option: GeneralOptions });
      }}
    />
  );
};

const LabelRenderer = ({ props, item, index}: { props: SelectTriggerProps, item: TriggerItems, index: number }) => {
  // If there's no placeholder in the label, just return the text
  if (!item.label.includes("<") && !item.label.includes("[")) {
    return <Typography.Text>{item.label}</Typography.Text>;
  }

  const parts = item.label.split(/(<[^>]+>|\[[^\]]+\])/g);

  return (
    <div className="flex items-center flex-wrap">
      {parts.map((part: string) => {
        const trimmedPart = part.trim();

        if (trimmedPart.startsWith("<") && trimmedPart.endsWith(">")) {
          const placeholder = trimmedPart.slice(1, -1); // Remove < and >

          if (Object.values(EnumSelectionType).includes(placeholder as EnumSelectionType)) {
            // Check if the item actually defines data for this placeholder
            if (placeholder in item && item[placeholder] && typeof item[placeholder] === 'object' && 'options' in (item[placeholder] as TriggerItemSelection)) {
              const data = item[placeholder] as TriggerItemSelection;
              return (
                <SelectOption
                  key={`select-option-${item.type}-${placeholder}-${index}`}
                  props={props}
                  placeholder={placeholder}
                  data={data}
                  itemType={item.type}
                />
              );
            }
          } else if (placeholder === "filter") {
            return (
              <FilterButton
                key={`filter-button-${item.type}-${index}`}
                itemType={item.type}
                props={props}
              />
            );
          }
        }
        // Handle [...] placeholders (Input fields)
        else if (trimmedPart.startsWith("[") && trimmedPart.endsWith("]")) {
          const placeholder = trimmedPart.slice(1, -1);
          // Get the current value from selectedRule.triggerItem, default to empty string
          const inputValue = (props.selectedRule.triggerItem?.[placeholder] as string) || '';

          return (
            <Input
              style={{ width: "fit-content" }}
              key={`input-${item.type}-${placeholder}-${index}`}
              placeholder={placeholder}
              value={inputValue}
              onChange={(e) => {
                props.setSelectedRule((prev) => ({
                  ...prev,
                  triggerItem: {
                    ...prev.triggerItem,
                    [placeholder]: e.target.value, 
                  } as SelectedTriggerItem,
                }));
              }}
            />
          );
        }

        // Regular text part
        return <span key={`text-part-${item.type}-${index}`}> {part} </span>;
      })}
    </div>
  );
};

// Renders the list of available trigger items for the selected trigger type
const renderItems = (props: SelectTriggerProps, items: TriggerItems[]) => {
  const { nextStep, setSelectedRule, selectedRule } = props;

  // Callback for when a specific trigger item's '+' button is clicked
  const onSelectTrigger = useCallback((selectedItem: TriggerItems) => {
    const placeholders = extractPlaceholders(selectedItem.label);

    // Initialize newTriggerItem based on the selectedItem's defaults
    const newTriggerItem: SelectedTriggerItem = {
      type: selectedItem.type,
      label: selectedItem.label,
    };

    placeholders.forEach((placeholder) => {
      // Handle GeneralOptions-based selections (e.g., <list>, <optionalList>)
      if (
        Object.values(EnumSelectionType).includes(placeholder as EnumSelectionType) &&
        placeholder in selectedItem &&
        (selectedItem[placeholder] as TriggerItemSelection)?.value 
      ) {
        
        newTriggerItem[placeholder] =
          (selectedRule.triggerItem?.[placeholder] as GeneralOptions) ||
          (selectedItem[placeholder] as TriggerItemSelection).value;
      }
      // Handle 'filter' placeholder
      else if (placeholder === "filter") {
        const defaultFilterLabel = ((selectedItem.filter as TriggerItemSelection)?.value?.label) || 'Card';
        const finalFilterLabel = typeof defaultFilterLabel === 'string' ? defaultFilterLabel : String(defaultFilterLabel);

        newTriggerItem.filter =
          selectedRule.triggerItem?.filter ||
          ({
            type: (selectedItem.filter as TriggerItemSelection)?.value?.value || 'card',
            selectedItem: {
              type: (selectedItem.filter as TriggerItemSelection)?.value?.value || 'card',
              label: finalFilterLabel,
            },
          } as SelectedCardFilter);
      }
      // Handle input placeholders (e.g., [duration])
      else if (selectedItem.label.includes(`[${placeholder}]`)) {
        newTriggerItem[placeholder] =
          (selectedRule.triggerItem?.[placeholder] as string) || '';
      }
    });

    setSelectedRule((prev: AutomationRule) => ({
      ...prev,
      triggerItem: newTriggerItem,
    }));

    nextStep();
  }, [selectedRule.triggerItem, nextStep, setSelectedRule]);

  return (
    <div>
      {items?.map((item: TriggerItems, index: number) => (
        <div
          key={item.type}
          className="flex justify-between items-start rounded p-2 mb-2 bg-gray-200"
        >
          <div>
            <LabelRenderer props={props} item={item} index={index} />
          </div>
          <Button shape="circle" onClick={() => { onSelectTrigger(item); }}>
            <Plus />
          </Button>
        </div>
      ))}
    </div>
  );
};

const SelectTrigger: React.FC<SelectTriggerProps> = (props) => {
  const { setSelectedRule, selectedRule } = props;
  const [itemsByTriggerType, setItemsByTriggerType] = useState<TriggerItems[]>([]);

  // Callback for when a main trigger type button is clicked (e.g., "Card", "Time")
  const onTriggerTypeClick = useCallback((type: string) => {
    setSelectedRule((prev: AutomationRule) => {
      const selectedTriggerData = triggers.find((t) => t.type === type);
      let initialTriggerItem: SelectedTriggerItem | undefined = undefined;

      if (selectedTriggerData) {
        initialTriggerItem = {
          type: selectedTriggerData.type,
          label: selectedTriggerData.label,
        };
        const placeholders = extractPlaceholders(selectedTriggerData.label);

        placeholders.forEach(placeholder => {
            // Initialize GeneralOptions-based placeholders with their default values
            if (Object.values(EnumSelectionType).includes(placeholder as EnumSelectionType) && placeholder in selectedTriggerData) {
                const key = placeholder as keyof typeof selectedTriggerData;
                const selection = (selectedTriggerData[key] as unknown as GeneralOptions);
               if (typeof selectedTriggerData[key] === 'object') {
                if (selection?.value) {
                  initialTriggerItem![placeholder] = selection.value;
                }
               }
            }
            // Initialize input placeholders
            else if (selectedTriggerData.label.includes(`[${placeholder}]`)) {
              initialTriggerItem![placeholder] = ''; 
            }
        });
      }

      return {
        ...prev,
        triggerType: type,
        triggerItem: initialTriggerItem,
      };
    });
  }, [setSelectedRule]);

  // Effect to update itemsByTriggerType when the selected trigger type changes
  useEffect(() => {
    const filteredItems = triggers.find((item) => item.type === selectedRule.triggerType);
    setItemsByTriggerType(filteredItems?.items || []);
  }, [selectedRule.triggerType]);

  // Effect to initialize triggerItem when component mounts or triggerType is initially set
  // This handles cases where `selectedRule.triggerType` might be pre-set from outside or initially.
  useEffect(() => {
    // Only attempt to initialize if a triggerType is set and triggerItem is NOT yet initialized
    if (selectedRule.triggerType && !selectedRule.triggerItem) {
        const selectedTriggerData = triggers.find((t) => t.type === selectedRule.triggerType);
        if (selectedTriggerData) {
          onTriggerTypeClick(selectedTriggerData.type);
        }
    }
  }, [selectedRule.triggerType, selectedRule.triggerItem, onTriggerTypeClick]);

  return (
    <div>
      <Typography.Title level={5}>Select Trigger</Typography.Title>
      <div className="flex gap-2 my-4">
        {triggers.map((item) => (
          <div
            key={item.type} // Stable key for trigger type selection
            onClick={() => { onTriggerTypeClick(item.type); }}
            className={`flex flex-col justify-center items-center w-64 rounded p-2 cursor-pointer ${
              selectedRule.triggerType === item.type ? "bg-blue-100" : "bg-gray-300"
            }`}
          >
            <div>{item.icon}</div>
            <Typography.Text>{item.label}</Typography.Text>
          </div>
        ))}
      </div>

      <div>{renderItems(props, itemsByTriggerType)}</div>
    </div>
  );
};

export default SelectTrigger;