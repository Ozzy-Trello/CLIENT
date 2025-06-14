import {
  CustomFieldSelection,
  FieldValueInput,
  ListSelection,
  SelectionRef,
  UserSelection,
} from "@components/selection";
import { Button, Input, Select, Typography } from "antd";
import { ListFilter, Plus } from "lucide-react";
import React, {
  Dispatch,
  SetStateAction,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
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
import {
  EnumInputType,
  EnumSelectionType,
  EnumTextType,
} from "@myTypes/automation-rule";
import Item from "antd/es/list/Item";
import { EnumOptionsSubject } from "@myTypes/options";

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

  const handleSaveFilter = useCallback(
    (filterData: SelectedCardFilter) => {
      setSelectedRule((prev) => ({
        ...prev,
        triggerItem: {
          ...prev.triggerItem,
          filter: filterData,
        } as SelectedTriggerItem,
      }));
      setOpenFilter(false);
    },
    [setSelectedRule]
  );

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
  index,
}: {
  props: SelectTriggerProps;
  placeholder: string;
  data: TriggerItemSelection;
  itemType: string;
  groupIndex: number;
  index: number;
}) => {
  const { setTriggersData, triggersData } = props;

  const options = data?.options?.map((optionItem: GeneralOptions) => ({
    value: optionItem.value,
    label: optionItem.label,
    option: optionItem,
  }));

  const onSelectionChange = (selectedAntOption: {
    value: string;
    label: React.ReactNode;
    option: GeneralOptions;
  }) => {
    let copyArr = [...triggersData];
    (
      copyArr[groupIndex]?.items?.[index]?.[
        placeholder as keyof TriggerItems
      ] as any
    )["value"] = selectedAntOption.option;
    setTriggersData(copyArr);
  };

  // Callback for ListSelection's onChange
  const onListChange = (selectedOption: GeneralOptions) => {
    let copyArr = [...triggersData];
    (
      copyArr[groupIndex]?.items?.[index]?.[
        placeholder as keyof TriggerItems
      ] as any
    )["value"] = selectedOption;
    setTriggersData(copyArr);
  };

  const onUserChange = (selectedOption: GeneralOptions) => {
    let copyArr = [...triggersData];
    (copyArr[groupIndex]?.items?.[index]?.[placeholder as keyof TriggerItems] as any).data = [selectedOption.value];
    setTriggersData(copyArr);
  };

  const onCustomFieldChange = (selectedOption: GeneralOptions) => {
    let copyArr = [...triggersData];
    (
      copyArr[groupIndex]?.items?.[index]?.[
        placeholder as keyof TriggerItems
      ] as any
    )["value"] = selectedOption;

    setTriggersData(copyArr);
  };

  const onFieldValueChange = (value: string) => {
    let copyArr = [...triggersData];
    (
      copyArr[groupIndex]?.items?.[index]?.[
        placeholder as keyof TriggerItems
      ] as any
    )["value"] = value;
    setTriggersData(copyArr);
  };

  if (placeholder === EnumSelectionType.Fields) {
    const currentValue =
      (triggersData[groupIndex]?.items?.[index] as any)?.[placeholder]?.value
        ?.value || "";

    return (
      <div>
        <CustomFieldSelection
          key={`custom-field-select-${itemType}-${placeholder}`}
          width={"fit-content"}
          ref={useRef<SelectionRef>(null)}
          value={currentValue}
          onChange={(value: string, option: GeneralOptions) => {
            onCustomFieldChange(option);
          }}
          className="mx-2"
        />
      </div>
    );
  }

  if (placeholder === EnumInputType.FieldValue) {
    const field = triggersData.find(
      (item) => item.label.toLowerCase() === EnumSelectionType.Fields
      // @ts-ignore
    )?.items?.[0]?.fields?.value as any;
    return (
      <FieldValueInput
        key={`field-value-input-${itemType}-${placeholder}`}
        width={"fit-content"}
        ref={useRef<SelectionRef>(null)}
        field={field}
        onChange={(value: string) => {
          onFieldValueChange(value);
        }}
        className="mx-2"
      />
    );
  }

  if ( placeholder === EnumSelectionType.List || placeholder === EnumSelectionType.OptionalList) {
    return (
      <span className="mx-2">
        <ListSelection
          key={`list-select-${itemType}-${placeholder}`}
          width={"fit-content"}
          ref={useRef<SelectionRef>(null)}
          value={
            (triggersData[groupIndex]?.items?.[index] as any)?.[placeholder]
              ?.value?.value || ""
          }
          onChange={(value: string, option: GeneralOptions) => {
            onListChange(option);
          }}
          className="mr-2 ml-2"
        />
      </span>
    );
  }

  return (
    <>
      <Select
        key={`ant-select-${itemType}-${placeholder}`}
        value={
          (triggersData[groupIndex]?.items?.[index] as any)?.[placeholder]?.value
            ?.value || ""
        }
        options={options}
        style={{ width: 120, margin: "0 5px" }}
        onChange={(value, option) => {
          onSelectionChange(
            option as {
              value: string;
              label: React.ReactNode;
              option: GeneralOptions;
            }
          );
        }}
      />

      {(placeholder == EnumSelectionType.OptionalBySubject || placeholder == EnumSelectionType.BySubject) 
        &&  [
          EnumOptionsSubject.BySpecificUser, 
          EnumOptionsSubject.ByAnyoneExceptSpecificUser
        ].includes((triggersData[groupIndex]?.items?.[index] as any)?.[placeholder]?.value?.value)
        && (
        <UserSelection 
          key={`user-select-${itemType}-${placeholder}`}
          width={"fit-content"}
          ref={useRef<SelectionRef>(null)}
          onChange={(value: string, option: GeneralOptions) => {
            onUserChange(option);
          }}
          className="mx-2"
        />
      )}

    </>
  );
};

const LabelRenderer = ({
  props,
  item,
  groupIndex,
  index,
}: {
  props: SelectTriggerProps;
  item: TriggerItems;
  groupIndex: number;
  index: number;
}) => {
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

          if (
            Object.values(EnumSelectionType).includes(
              placeholder as EnumSelectionType
            )
          ) {
            // Check if the item actually defines data for this placeholder
            if (
              placeholder in item &&
              item[placeholder] &&
              typeof item[placeholder] === "object" &&
              "options" in (item[placeholder] as TriggerItemSelection)
            ) {
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
          const inputValue =
            (props.selectedRule.triggerItem?.[placeholder] as string) || "";

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
  const [selectedGroupIndex, setSelectedGroupIndex] = useState<number>(0);

  // Callback for when a specific trigger item's '+' button is clicked
  const onSelectTrigger = useCallback(
    (selectedItem: TriggerItems, index: number) => {
      const placeholders = extractPlaceholders(selectedItem.label);

      // Initialize newTriggerItem based on the selectedItem's defaults
      const newTriggerItem: SelectedTriggerItem = {
        type: selectedItem.type,
        label: selectedItem.label,
      };


      placeholders?.forEach((placeholder) => {
        // Handle GeneralOptions-based selections (e.g., <list>, <optionalList>)
        const items = triggersData[selectedGroupIndex]?.items;
        
        if (items && items[index] && items[index][placeholder]) {
          console.log("next step: items: ", items[index][placeholder]);
          newTriggerItem[placeholder] = (items[index][placeholder] as any)?.value;
          if (items[index][placeholder] && typeof items[index][placeholder] === "object" && "data" in (items[index][placeholder] as any)) {
            (newTriggerItem[placeholder] as any)["data"] = (items[index][placeholder] as any).data;
          }
        }
      });

      setSelectedRule((prev: AutomationRule) => ({
        ...prev,
        triggerItem: newTriggerItem,
        triggerType: triggersData[selectedGroupIndex]?.type,
      }));

      nextStep();
    },
    [selectedRule.triggerItem, nextStep, setSelectedRule, selectedGroupIndex]
  );

  return (
    <div>
      <Typography.Title level={5}>Select Trigger</Typography.Title>
      <div className="flex gap-2 my-4">
        {triggersData.map((item, index) => (
          <div
            key={item.type}
            onClick={() => {
              setSelectedGroupIndex(index);
            }}
            className={`flex flex-col justify-center items-center w-64 rounded p-2 cursor-pointer ${
              selectedGroupIndex === index ? "bg-blue-100" : "bg-gray-300"
            }`}
          >
            <div>{item.icon}</div>
            <Typography.Text>{item.label}</Typography.Text>
          </div>
        ))}
      </div>
      <div>
        {triggersData[selectedGroupIndex]?.items?.map(
          (item: TriggerItems, index: number) => (
            <div
              key={item.type}
              className="flex justify-between items-start rounded p-2 mb-2 bg-gray-200"
            >
              <div>
                <LabelRenderer
                  props={props}
                  item={item}
                  groupIndex={selectedGroupIndex}
                  index={index}
                />
              </div>
              <Button
                shape="circle"
                onClick={() => {
                  onSelectTrigger(item, index);
                }}
              >
                <Plus />
              </Button>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default SelectTrigger;
