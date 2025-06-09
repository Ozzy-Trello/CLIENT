import { ListSelection, SelectionRef } from "@components/selection";
import { Button, Input, Select, Typography } from "antd";
import { ListFilter, Plus } from "lucide-react";
import React, { Dispatch, SetStateAction, useEffect, useRef, useState, useCallback } from "react";
import { triggers } from "@constants/automation-rule/data";
import PopoverRuleCardFilter from "@components/popover-rule-card-filter";

import {
  AutomationRule,
  AutomationRuleTrigger,
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
  triggersData: AutomationRuleTrigger[];
  setTriggersData: Dispatch<SetStateAction<AutomationRuleTrigger[]>>;
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
  groupIndex,
  index
}: {
  props: SelectTriggerProps;
  placeholder: string;
  data: TriggerItemSelection;
  itemType: string;
  groupIndex: number,
  index: number
}) => {
  const { setTriggersData, triggersData } = props;

  const options = data?.options?.map((optionItem: GeneralOptions) => ({
    value: optionItem.value,
    label: optionItem.label,
    option: optionItem,
  }));

  const onSelectionChange = (selectedAntOption: { value: string; label: React.ReactNode; option: GeneralOptions }) => {
    let copyArr = [...triggersData];
    (copyArr[groupIndex]?.items?.[index]?.[placeholder as keyof TriggerItems] as any)["value"] = selectedAntOption.option;
    setTriggersData(copyArr);
  };

  // Callback for ListSelection's onChange
  const onListChange = (selectedOption: GeneralOptions) => {
    let copyArr = [...triggersData];
    (copyArr[groupIndex]?.items?.[index]?.[placeholder as keyof TriggerItems] as any)["value"] = selectedOption;
    setTriggersData(copyArr);
  };

  if (placeholder === EnumSelectionType.List || placeholder === EnumSelectionType.OptionalList) {
    return (
      <ListSelection
        key={`list-select-${itemType}-${placeholder}`}
        width={"fit-content"}
        ref={useRef<SelectionRef>(null)}
        value={(triggersData[groupIndex]?.items?.[index] as any)?.[placeholder]?.value?.value || ''}
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
      value={(triggersData[groupIndex]?.items?.[index] as any)?.[placeholder]?.value?.value || ''}
      options={options}
      style={{ width: 120, margin: '0 5px' }}
      onChange={(value, option) => {
        onSelectionChange(option as { value: string; label: React.ReactNode; option: GeneralOptions });
      }}
    />
  );
};

const LabelRenderer = ({ props, item, groupIndex, index}: { props: SelectTriggerProps, item: TriggerItems, groupIndex: number, index: number }) => {
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
                  key={`select-option-${item.type}-${placeholder}-${groupIndex}-${index}`}
                  props={props}
                  placeholder={placeholder}
                  data={data}
                  itemType={item.type}
                  groupIndex={groupIndex}
                  index={index}
                />
              );
            }

            if (placeholder === "filter") {
              return (
                <FilterButton
                  key={`filter-button-${item.type}-${index}`}
                  itemType={item.type}
                  props={props}
                />
              );
            }
          } 
        }

        if (trimmedPart.startsWith("[") && trimmedPart.endsWith("]")) {
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
        return part;
      })}
    </div>
  );
};


const SelectTrigger: React.FC<SelectTriggerProps> = (props) => {
  const { setSelectedRule, selectedRule, triggersData, nextStep } = props;
  const [ selectedGroupIndex, setSelectedGroupIndex ] = useState<number>(0);

   // Callback for when a specific trigger item's '+' button is clicked
  const onSelectTrigger = useCallback((selectedItem: TriggerItems, index: number) => {
    const placeholders = extractPlaceholders(selectedItem.label);

    // Initialize newTriggerItem based on the selectedItem's defaults
    const newTriggerItem: SelectedTriggerItem = {
      type: selectedItem.type,
      label: selectedItem.label,
    };

    placeholders?.forEach((placeholder) => {
      // Handle GeneralOptions-based selections (e.g., <list>, <optionalList>)
      console.log('triggersData[index] as any)[placeholder]?.value: %o', triggersData[index]);
      const items = triggersData[selectedGroupIndex]?.items;
      if (items && items[index] && items[index][placeholder]) {
        newTriggerItem[placeholder] = (items[index][placeholder] as any)?.value;
      }
    });

    console.log("newTriggerItem: %o", newTriggerItem);

    setSelectedRule((prev: AutomationRule) => ({
      ...prev,
      triggerItem: newTriggerItem,
    }));

    nextStep();
  }, [selectedRule.triggerItem, nextStep, setSelectedRule]);

  return (
    <div>
      <Typography.Title level={5}>Select Trigger</Typography.Title>
      <div className="flex gap-2 my-4">
        {triggersData.map((item, index) => (
          <div
            key={item.type} // Stable key for trigger type selection
            onClick={() => { setSelectedGroupIndex(index); }}
            className={`flex flex-col justify-center items-center w-64 rounded p-2 cursor-pointer ${
              selectedRule.triggerType === item.type ? "bg-blue-100" : "bg-gray-300"
            }`}
          >
            <div>{item.icon}</div>
            <Typography.Text>{item.label}</Typography.Text>
          </div>
        ))}
      </div>
      <div>
        {triggersData[0].items?.map((item: TriggerItems, index: number) => (
          <div
            key={item.type}
            className="flex justify-between items-start rounded p-2 mb-2 bg-gray-200"
          >
            <div>
              <LabelRenderer props={props} item={item} groupIndex={selectedGroupIndex} index={index}/>
            </div>
            <Button shape="circle" onClick={() => { onSelectTrigger(item, index); }}>
              <Plus />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SelectTrigger;