import { ListSelection, SelectionRef } from "@/app/components/selection";
import { Button, Select, Typography } from "antd";
import { ListFilter, Plus } from "lucide-react";
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { triggers } from "../../../../../../../../constants/automation-rule/data";
import { CustomFilter, CustomSelectionArr, CustomSelectionList } from "@/app/constants/automation-rule/automation-rule";
import PopoverRuleCardFilter from "@/app/components/popover-rule-card-filter";
import { AutomationRule, GeneralOptions, TriggerItems, TriggerItemSelection } from "@/app/types/type";

interface SelectTriggerProps {
  nextStep: () => void;
  prevStep: () => void;
  setSelectedRule: Dispatch<SetStateAction<AutomationRule>>;
  selectedRule: AutomationRule;
}

// Component for the filter button
const FilterButton = ({ index }: { index: number }) => {
  const [openFilter, setOpenFilter] = useState(false);
  
  return (
    <PopoverRuleCardFilter
      key={`filter-${index}`}
      open={openFilter}
      setOpen={setOpenFilter}
      triggerEl={
        <Button variant="outlined" type="text" size="small" className="mx-2">
          <ListFilter size={14} />
        </Button>
      }
    />
  );
};

// Component for select dropdown
const SelectOption = ({ 
  props, 
  index, 
  data, 
  placeholder 
}: { 
  props: SelectTriggerProps, 
  index: number, 
  data: TriggerItemSelection, 
  placeholder: string 
}) => {
  const { setSelectedRule } = props;
  const listSelectionRef = useRef<SelectionRef>(null);
  
  const options = data?.options?.map((actionOption: GeneralOptions) => ({
    value: actionOption.value,
    label: actionOption.label,
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

  const onListChange = (value: string, option: object) => {
    setSelectedRule((prev: AutomationRule) => ({
      ...prev,
      triggerItem: {
        ...prev.triggerItem,
        [CustomSelectionList as string]: option as GeneralOptions
      }
    } as AutomationRule));
  } 

  if (placeholder === CustomSelectionList) {
    return (
      <ListSelection
        width={"fit-content"}
        ref={listSelectionRef}
        value={data?.value?.value}
        onChange={onListChange}
        className="mx-2"
      />
    )
  }
  
  return (
    <Select
      key={`${placeholder}-${index}`}
      defaultValue={data.value}
      options={options}
      labelInValue={false}
      style={{ width: 120, margin: '0 5px' }}
      onChange={(value, option) => {
        onSelectionChange((option as { option: GeneralOptions }).option, placeholder);
      }}
    />
  );
};

// Component for label rendering
const LabelRenderer = ({ props, item }: { props: SelectTriggerProps, item: TriggerItems }) => {
  // If there's no placeholder in the label, just return the text
  if (!item.label.includes("<")) {
    return <Typography.Text>{item.label}</Typography.Text>;
  }

  // Split the label by the placeholders
  const parts = item.label.split(/(<[^>]+>)/);
  
  return (
    <div className="flex items-center flex-wrap">
      {parts.map((part: string, index: number) => {
        // Check if this part is a placeholder
        if (part.startsWith("<") && part.endsWith(">")) {
          const placeholder = part.slice(1, -1); // Remove < and >
          
          if (placeholder in item && CustomSelectionArr.includes(placeholder)) {
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

          if (placeholder === CustomFilter) {
            return <FilterButton key={`filter-${index}`} index={index} />;
          }
        }
        
        // Regular text part
        return <span key={index}>{part}</span>;
      })}
    </div>
  );
};

const renderItems = (props: SelectTriggerProps, items: TriggerItems[]) => {
  const { nextStep, setSelectedRule, selectedRule } = props;
  
  const onSelectTrigger = (selectedItem: TriggerItems) => {
    let currentSelectedRule = {...selectedRule.triggerItem};
    currentSelectedRule.type = selectedItem.type;
    currentSelectedRule.label = selectedItem.label;

    for (let key in selectedItem) {
      if (key as string in CustomSelectionArr) {
        const value = (selectedItem[key] as TriggerItemSelection).value;
        if (value !== null) {
          currentSelectedRule[key] = value;
        }
      }
    }

    setSelectedRule((prev: AutomationRule | null) => ({
      ...prev,
      triggerItem: currentSelectedRule
    } as AutomationRule));

    nextStep();
  };

  return (
    <div>
      {items?.map((item: TriggerItems, index: number) => (
        <div key={index} className="flex justify-between items-start rounded p-2 mb-2 bg-gray-200">
          <div>
            <LabelRenderer props={props} item={item} />
          </div>
          <Button shape="circle" onClick={() => {onSelectTrigger(item)}}>
            <Plus />
          </Button>
        </div>
      ))}
    </div>
  );
};

const SelectTrigger: React.FC<SelectTriggerProps> = (props) => {
  const { setSelectedRule, selectedRule } = props;
  const [itemsByTriggerType, setItemsByTriggerType] = useState<any>([]);

  const onTriggerTypeClick = (type: string) => {
    setSelectedRule((prev: AutomationRule | null) => ({
      ...prev,
      triggerType: type
    } as AutomationRule));
  };

  useEffect(() => {
    const filter = triggers.find((item) => item.type === selectedRule.triggerType);
    setItemsByTriggerType(filter?.items || []);
  }, [selectedRule.triggerType]);

  return (
    <div>
      <Typography.Title level={5}>Select Trigger</Typography.Title>
      <div className="flex gap-2 my-4">
        {triggers.map((item, index) => (
          <div 
            key={index}
            onClick={() => {onTriggerTypeClick(item.type)}} 
            className={`flex flex-col justify-center items-center w-64 rounded p-2 cursor-pointer ${selectedRule.triggerType === item.type ? 'bg-blue-100' : 'bg-gray-300'}`}
          >
            <div>{item.icon}</div>
            <Typography.Text>{item.label}</Typography.Text>
          </div>
        ))}
      </div>

      <div>
        {renderItems(props, itemsByTriggerType)}
      </div>
    </div>
  );
};

export default SelectTrigger;