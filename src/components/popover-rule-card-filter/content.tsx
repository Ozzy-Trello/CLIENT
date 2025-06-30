import { cardFilters } from "@constants/automation-rule/data-card-filter";
import { Button, Input, Select, Typography } from "antd";
import { Plus } from "lucide-react";
import { Dispatch, SetStateAction, useCallback, useRef, useState } from "react";
import { CustomFieldSelection, FieldValueInput, ListSelection, SelectionRef, UserSelection } from "../selection";
import { AutomationRuleTrigger, CardTriggerFilterItem, CardTriggerFilterType, GeneralOptions, SelectedTriggerItem, TriggerItemSelection } from "@myTypes/type";
import { EnumInputType, EnumSelectionType } from "@myTypes/automation-rule";
import { EnumOptionBySubject } from "@myTypes/options";

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
  cardFiltersData,
  setCardFiltersData,
  placeholder,
  data,
  itemType,
  groupIndex,
  index,
}: {
  cardFiltersData: CardTriggerFilterType[];
  setCardFiltersData:  Dispatch<SetStateAction<CardTriggerFilterType[]>>;
  placeholder: string;
  data: TriggerItemSelection;
  itemType: string;
  groupIndex: number;
  index: number;
}) => {

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
    let copyArr = [...cardFiltersData];
    (
      copyArr[groupIndex]?.items?.[index]?.[
        placeholder as keyof CardTriggerFilterItem
      ] as any
    )["value"] = selectedAntOption.option;
    setCardFiltersData(copyArr);
  };

  // Callback for ListSelection's onChange
  const onListChange = (selectedOption: GeneralOptions) => {
    let copyArr = [...cardFiltersData];
    (
      copyArr[groupIndex]?.items?.[index]?.[
        placeholder as keyof CardTriggerFilterItem
      ] as any
    )["value"] = selectedOption;
    setCardFiltersData(copyArr);
  };

  const onUserChange = (selectedOption: GeneralOptions) => {
    let copyArr = [...cardFiltersData];
    (copyArr[groupIndex]?.items?.[index]?.[placeholder as keyof CardTriggerFilterItem] as any).data = [selectedOption.value];
    setCardFiltersData(copyArr);
  };

  const onCustomFieldChange = (selectedOption: GeneralOptions) => {
    let copyArr = [...cardFiltersData];
    (
      copyArr[groupIndex]?.items?.[index]?.[
        placeholder as keyof CardTriggerFilterItem
      ] as any
    )["value"] = selectedOption;

    setCardFiltersData(copyArr);
  };

  const onFieldValueChange = (value: string) => {
    let copyArr = [...cardFiltersData];
    (
      copyArr[groupIndex]?.items?.[index]?.[
        placeholder as keyof CardTriggerFilterItem
      ] as any
    )["value"] = value;
    setCardFiltersData(copyArr);
  };

  if (placeholder === EnumSelectionType.Fields) {
    const currentValue =
      (cardFiltersData[groupIndex]?.items?.[index] as any)?.[placeholder]?.value
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
    const field = cardFiltersData.find(
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
            (cardFiltersData[groupIndex]?.items?.[index] as any)?.[placeholder]
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
        className="fit-content"
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
        ].includes((cardFilters[groupIndex]?.items?.[index] as any)?.[placeholder]?.value?.value)
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
  cardFiltersData,
  setCardFiltersData,
  item,
  groupIndex,
  index,
}: {
  cardFiltersData: CardTriggerFilterType[];
  setCardFiltersData:  Dispatch<SetStateAction<CardTriggerFilterType[]>>;
  item: CardTriggerFilterItem;
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
                  cardFiltersData={cardFiltersData}
                  setCardFiltersData={setCardFiltersData}
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
          const inputValue = (cardFiltersData[groupIndex]?.items?.[index] as any)?.[placeholder] || "";

          return (
            <Input
              style={{ width: "fit-content" }}
              key={`input-${item.type}-${placeholder}-${index}`}
              placeholder={placeholder}
              value={inputValue}
              type={placeholder === EnumInputType.Number ? "number" : "text"}
              onChange={(e) => {
                let copyArr = [...cardFiltersData];
                if (copyArr[groupIndex]?.items?.[index]) {
                  copyArr[groupIndex].items[index][placeholder] = e.target.value;
                }
                setCardFiltersData(copyArr);
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
  const { triggersData, setTriggersData, selectedTriggersGroupIndex, selectedTriggerIndex, } = props;
  const [selectedGroupIndex, setSelectedGroupIndex] = useState<number>(0);
  const [ cardFiltersData, setCardFiltersData ] = useState<CardTriggerFilterType[]>(cardFilters);

  // Callback for when a specific trigger item's '+' button is clicked
  const onSelectFilter = useCallback(
    (selectedItem: CardTriggerFilterItem, index: number) => {
      let copyTrigger = [...triggersData];
      let items = copyTrigger[selectedTriggersGroupIndex].items;
      if (!items || !items[selectedTriggerIndex]) return;
      let filters = items[selectedTriggerIndex].filters;
      if (!Array.isArray(filters)) filters = [];
      filters.push(selectedItem);
      items[selectedTriggerIndex].filters = filters;
      setTriggersData(copyTrigger);
      console.log(triggersData);
    },
    [selectedGroupIndex]
  );

  return (
    <div className="w-lg h-fit-content">
      <Typography.Title level={5}>Select Filter</Typography.Title>
      <div className="flex gap-2 my-4">
        {cardFilters.map((item, groupIndex) => (
          <div
            key={item.type}
            onClick={() => {
              setSelectedGroupIndex(groupIndex);
            }}
            className={`flex flex-col justify-center items-center w-40 rounded p-2 cursor-pointer ${
              selectedGroupIndex === groupIndex ? "bg-blue-100" : "bg-gray-300"
            }`}
          >
            <div>{item.icon}</div>
            <Typography.Text>{item.label}</Typography.Text>
          </div>
        ))}
      </div>
      <div className="h-60 overflow-y-scroll p-2">
        {cardFiltersData[selectedGroupIndex]?.items?.map(
          (item: CardTriggerFilterItem, index: number) => (
            <div
              key={item.type}
              className="flex justify-between items-start rounded p-2 mb-2 bg-gray-200"
            >
              <div>
                <LabelRenderer
                  setCardFiltersData={setCardFiltersData}
                  cardFiltersData={cardFilters}
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