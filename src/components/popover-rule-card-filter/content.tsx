import { cardFilters } from "@constants/automation-rule/data-card-filter";
import { Button, Input, Select, Typography } from "antd";
import { Plus } from "lucide-react";
import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from "react";
import { CustomFieldSelection, FieldValueInput, ListSelection, SelectionRef, UserSelection } from "../selection";
import { AutomationRule, AutomationRuleTrigger, CardTriggerFilterItem, GeneralOptions, TriggerItemSelection } from "@myTypes/type";
import { EnumInputType, EnumSelectionType } from "@myTypes/automation-rule";
import { EnumOptionBySubject } from "@myTypes/options";
import { filter } from "lodash";

interface PopoverRuleCardFilterContentProps {
  setTriggersData: React.Dispatch<React.SetStateAction<AutomationRuleTrigger[]>>;
  triggersData: AutomationRuleTrigger[];
  selectedTriggersGroupIndex: number;
  selectedTriggerIndex: number;
}
function extractPlaceholders(pattern: string): string[] {
  const regex = /<([^>]+)>|\[([^\]]+)\]/g; // Matches both <...> and [...]
  const placeholders: string[] = [];

  let match;
  while ((match = regex.exec(pattern)) !== null) {
    placeholders.push(match[1] || match[2]);
  }
  return placeholders.filter(Boolean);
}

const SelectOption = ({
  props,
  placeholder,
  data,
  itemType,
  groupIndex,
  index,
}: {
  props: PopoverRuleCardFilterContentProps;
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
    // let copyArr = [...triggersData];
    // (
    //   copyArr[groupIndex]?.items?.[index]?.[
    //     placeholder as keyof TriggerItems
    //   ] as any
    // )["value"] = selectedAntOption.option;
    // setTriggersData(copyArr);
  };

  // Callback for ListSelection's onChange
  const onListChange = (selectedOption: GeneralOptions) => {
    // let copyArr = [...triggersData];
    // (
    //   copyArr[groupIndex]?.items?.[index]?.[
    //     placeholder as keyof TriggerItems
    //   ] as any
    // )["value"] = selectedOption;
    // setTriggersData(copyArr);
  };

  const onUserChange = (selectedOption: GeneralOptions) => {
    // let copyArr = [...triggersData];
    // (copyArr[groupIndex]?.items?.[index]?.[placeholder as keyof TriggerItems] as any).data = [selectedOption.value];
    // setTriggersData(copyArr);
  };

  const onCustomFieldChange = (selectedOption: GeneralOptions) => {
    // let copyArr = [...triggersData];
    // (
    //   copyArr[groupIndex]?.items?.[index]?.[
    //     placeholder as keyof TriggerItems
    //   ] as any
    // )["value"] = selectedOption;

    // setTriggersData(copyArr);
  };

  const onFieldValueChange = (value: string) => {
    // let copyArr = [...triggersData];
    // (
    //   copyArr[groupIndex]?.items?.[index]?.[
    //     placeholder as keyof TriggerItems
    //   ] as any
    // )["value"] = value;
    // setTriggersData(copyArr);
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
          (cardFilters[groupIndex]?.items?.[index] as any)?.[placeholder]?.value?.value || ""
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
          EnumOptionBySubject.BySpecificUser, 
          EnumOptionBySubject.ByAnyoneExceptSpecificUser
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
  props: PopoverRuleCardFilterContentProps;
  item: CardTriggerFilterItem;
  groupIndex: number;
  index: number;
}) => {
  // If there's no placeholder in the label, just return the text
  if (!item.label.includes("<") && !item.label.includes("[")) {
    return <Typography.Text>{item.label}</Typography.Text>;
  }

  const parts = item.label.split(/(<[^>]+>|\[[^\]]+\])/g);
  console.log("filter: %o", parts);

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
          }
        }

        if (trimmedPart.startsWith("[") && trimmedPart.endsWith("]")) {
          const placeholder = trimmedPart.slice(1, -1);
          // Get the current value from selectedRule.triggerItem, default to empty string
          const inputValue = (props.triggersData[groupIndex]?.items?.[index] as any)?.[placeholder] || "";

          return (
            <Input
              style={{ width: "fit-content" }}
              key={`input-${item.type}-${placeholder}-${index}`}
              placeholder={placeholder}
              value={inputValue}
              type={placeholder === EnumInputType.Number ? "number" : "text"}
              onChange={(e) => {
                let copyArr = [...props.triggersData];
                if (copyArr[groupIndex]?.items?.[index]) {
                  copyArr[groupIndex].items[index][placeholder] = e.target.value;
                }
                props.setTriggersData(copyArr);
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

const PopoverRuleCardFilterContent: React.FC<PopoverRuleCardFilterContentProps> = (props) => {
  const { triggersData, setTriggersData } = props;
  const [selectedGroupIndex, setSelectedGroupIndex] = useState<number>(0);

  // Callback for when a specific trigger item's '+' button is clicked
  const onSelectFilter = useCallback(
    (selectedItem: CardTriggerFilterItem, index: number) => {
      const placeholders = extractPlaceholders(selectedItem.label);

      // Initialize newTriggerItem based on the selectedItem's defaults
      // const newTriggerItem: SelectedTriggerItem = {
      //   type: selectedItem.type,
      //   label: selectedItem.label,
      // };


      // placeholders?.forEach((placeholder) => {
      //   // Handle GeneralOptions-based selections (e.g., <list>, <optionalList>)
      //   const items = triggersData[selectedGroupIndex]?.items;
        
      //   if (items && items[index] && items[index][placeholder]) {
      //     if (typeof items[index][placeholder] == "object") {
      //       newTriggerItem[placeholder] = (items[index][placeholder] as any)?.value;
      //       if ("data" in (items[index][placeholder] as any)) {
      //         (newTriggerItem[placeholder] as any)["data"] = (items[index][placeholder] as any).data;
      //       }
      //     } else {
      //       newTriggerItem[placeholder] = items[index][placeholder];
      //     }
      //   }
      // });

      // setSelectedRule((prev: AutomationRule) => ({
      //   ...prev,
      //   triggerItem: newTriggerItem,
      //   triggerType: triggersData[selectedGroupIndex]?.type,
      // }));

      // nextStep();
    },
    [selectedGroupIndex]
  );

  return (
    <div className="w-xl">
      <Typography.Title level={5}>Select Trigger</Typography.Title>
      <div className="flex gap-2 my-4">
        {cardFilters.map((item, groupIndex) => (
          <div
            key={item.type}
            onClick={() => {
              setSelectedGroupIndex(groupIndex);
            }}
            className={`flex flex-col justify-center items-center w-64 rounded p-2 cursor-pointer ${
              selectedGroupIndex === groupIndex ? "bg-blue-100" : "bg-gray-300"
            }`}
          >
            <div>{item.icon}</div>
            <Typography.Text>{item.label}</Typography.Text>
          </div>
        ))}
      </div>
      <div>
        {cardFilters[selectedGroupIndex]?.items?.map(
          (item: CardTriggerFilterItem, index: number) => (
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
                  onSelectFilter(item, index);
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
}

export default PopoverRuleCardFilterContent;