import { CustomSelectionList } from "@constants/automation-rule/automation-rule";
import { cardFilters } from "@constants/automation-rule/data-card-filter";
import { Button, Select, Typography } from "antd";
import { Plus } from "lucide-react";
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { ListSelection, SelectionRef } from "../selection";
import { AutomationRule, CardTriggerFilterItem, GeneralOptions, TriggerItemSelection } from "@myTypes/type";

interface PopoverRuleCardFilterContentProps {
  setSelectedRule: Dispatch<SetStateAction<AutomationRule>>;
  selectedRule: AutomationRule
}

// Component for select dropdown
const SelectOption = ({ 
  props, 
  index, 
  data, 
  placeholder 
}: { 
  props: PopoverRuleCardFilterContentProps, 
  index: number, 
  data: TriggerItemSelection, 
  placeholder: string 
}) => {
  const { setSelectedRule } = props;
  const listSelectionRef = useRef<SelectionRef>(null);
  
  const options = data?.options?.map((actionOption: GeneralOptions) => ({
    value: actionOption?.value,
    label: actionOption?.label,
    option: actionOption,
  }));
  
  const onSelectionChange = (selectedOption: GeneralOptions, selectionName: string) => {
    setSelectedRule((prev: AutomationRule) => ({
      ...prev,
      triggerItem: {
        ...prev.triggerItem,
        [selectionName]: selectedOption
      }
    } as AutomationRule));
  };

  if (placeholder === CustomSelectionList) {
    return (
      <ListSelection 
        ref={listSelectionRef}
        value="null"
        width={"fit-content"}
        className="mx-2"
      />
    )
  }
  
  return (
    <Select
      size="small"
      key={`${placeholder}-${index}`}
      defaultValue={data?.value}
      options={options}
      labelInValue={false}
      style={{ width: 120, margin: '0 5px' }}
      onChange={(value, option) => {
        onSelectionChange((option as { option: GeneralOptions }).option, placeholder);
      }}
    />
  );
};


const LabelRenderer = ({ props, item }: { props: PopoverRuleCardFilterContentProps, item: CardTriggerFilterItem }) => {
  // If there's no placeholder in the label, just return the text
  if (!item.label.includes("<")) {
    return <Typography.Text>{item.label}</Typography.Text>;
  }

  // Split the label by the placeholders
  const parts = item.label.split(/(<[^>]+>)/);
  
  return (
    <div className="flex items-center flex-wrap">
      { parts.map((part: string, index: number) => {
        if (part.startsWith("<") && part.endsWith(">")) {
          const placeholder = part.slice(1, -1);
          const data = item[placeholder] as TriggerItemSelection;
          return (
            <SelectOption
              key={`select-${index}`}
              props={props} 
              index={index} 
              data={data} 
              placeholder={placeholder} 
            />
          );
        }

        // Regular text part
        return <span key={index}>{part}</span>;
      }) }
    </div>
  )
}

const renderItems = (props: PopoverRuleCardFilterContentProps, items: CardTriggerFilterItem[]) => {
  
  const onAddFilter = (item: CardTriggerFilterItem) => {
  }
  
  return (
    <div>
      {items?.map((item: CardTriggerFilterItem, index: number) => (
        <div key={index} className="flex justify-between items-start rounded p-1 mb-1 bg-gray-200">
        <div>
          <LabelRenderer props={props} item={item} />
        </div>
        <Button onClick={() => {onAddFilter(item)}}>
          <Plus size={12} />
        </Button>
      </div>
      ))}
    </div>
  )
}

const PopoverRuleCardFilterContent: React.FC<PopoverRuleCardFilterContentProps> = (props) => {
  const {selectedRule, setSelectedRule} = props;
  const [ activeFilterType, setActiveFilterType ] = useState<string>(cardFilters[0].type);
  const [ itemsByFilterType, setItemsByTriggerType ] = useState<any>([]);

  const onFilterTypeClick = (type: string) => {
    setActiveFilterType(type);
  };

  useEffect(() => {
    const filter = cardFilters.find((item) => item.type === activeFilterType);
    setItemsByTriggerType(filter?.items || [])
  }, [activeFilterType])

  return (
    <div className="w-lg">
       <div className="flex gap-2 my-4">
        {cardFilters.map((item, index) => (
          <div 
            key={index}
            onClick={() => {onFilterTypeClick(item.type)}} 
            className={`flex flex-col justify-center items-center w-64 rounded p-2 cursor-pointer ${activeFilterType === item.type ? 'bg-blue-100' : 'bg-gray-300'}`}
          >
            <div>{item.icon}</div>
            <Typography.Text>{item.label}</Typography.Text>
          </div>
        ))}
      </div>

      <div>
        {renderItems(props, itemsByFilterType)}
      </div>
    </div>
  )
}

export default PopoverRuleCardFilterContent;