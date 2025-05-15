import { ListSelection, SelectionRef } from "@/app/components/selection";
import { Button, Select, Typography } from "antd";
import { ListFilter, Plus } from "lucide-react";
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { triggers } from "../../../../../../../../constants/automation-rule/data";
import { CustomFilter, CustomSelectionArr, CustomSelectionList } from "@/app/constants/automation-rule/automation-rule";
import PopoverRuleCardFilter from "@/app/components/popover-rule-card-filter";
import { 
  AutomationRule, 
  GeneralOptions, 
  SelectedCardFilter,
  SelectedCardFilterItem,
  TriggerItems, 
  TriggerItemSelection,
  SelectedTriggerItem
} from "@/app/types/type";

// Helper function to extract placeholders from a pattern
function extractPlaceholders(pattern: string): string[] {
  const regex = /<([^>]+)>/g;
  const placeholders: string[] = [];
  
  let match;
  while ((match = regex.exec(pattern)) !== null) {
    placeholders.push(match[1]);
  }
  
  return placeholders;
}

interface SelectTriggerProps {
  nextStep: () => void;
  prevStep: () => void;
  setSelectedRule: Dispatch<SetStateAction<AutomationRule>>;
  selectedRule: AutomationRule;
}

// Component for the filter button
const FilterButton = ({ 
  index, 
  props 
}: { 
  index: number, 
  props: SelectTriggerProps 
}) => {
  const [openFilter, setOpenFilter] = useState(false);
  const { selectedRule, setSelectedRule } = props;
  
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
  placeholder,
  item
}: { 
  props: SelectTriggerProps, 
  index: number, 
  data: TriggerItemSelection, 
  placeholder: string,
  item: TriggerItems
}) => {
  const { setSelectedRule } = props;
  const listSelectionRef = useRef<SelectionRef>(null);
  
  const options = data?.options?.map((optionItem: GeneralOptions) => ({
    value: optionItem.value,
    label: optionItem.label,
    option: optionItem,
  }));
  
  const onSelectionChange = (selectedOption: GeneralOptions, selectionName: string) => {
    setSelectedRule((prev: AutomationRule) => {
      // Create a copy of the current trigger item or initialize it
      const updatedTriggerItem: SelectedTriggerItem = {
        ...(prev.triggerItem || {})
      };
      
      // Handle special keys differently to satisfy TypeScript
      if (selectionName === 'filter') {
        // For filter property which has a specific type
        const filterObj: SelectedCardFilter = {
          type: selectedOption.value,
          selectedItem: {
            type: selectedOption.value,
            label: selectedOption.label as string
          }
        };
        updatedTriggerItem.filter = filterObj;
      } else {
        // For dynamic keys that match the index signature
        updatedTriggerItem[selectionName] = selectedOption;
      }
      
      return {
        ...prev,
        triggerItem: updatedTriggerItem
      };
    });
  };

  const onListChange = (value: string, option: object) => {
    setSelectedRule((prev: AutomationRule) => {
      const updatedTriggerItem: SelectedTriggerItem = {
        ...(prev.triggerItem || {})
      };
      
      // Handle the CustomSelectionList property
      updatedTriggerItem[CustomSelectionList] = option as GeneralOptions;
      
      return {
        ...prev,
        triggerItem: updatedTriggerItem
      };
    });
  };

  if (placeholder === CustomSelectionList) {
    return (
      <ListSelection
        width={"fit-content"}
        ref={listSelectionRef}
        value={data?.value?.value}
        onChange={onListChange}
        className="mx-2"
      />
    );
  }
  
  return (
    <Select
      key={`${placeholder}-${index}`}
      defaultValue={data.value?.value}
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
                item={item}
              />
            );
          }

          if (placeholder === CustomFilter) {
            return <FilterButton key={`filter-${index}`} index={index} props={props} />;
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
    // Extract placeholders from the type string to know what dynamic keys to look for
    const placeholders = extractPlaceholders(selectedItem.type);
    
    // Create a new trigger item object with the base properties
    const newTriggerItem: SelectedTriggerItem = {
      type: selectedItem.type,
      label: selectedItem.label
    };

    // Add the dynamic keys from the placeholders
    placeholders.forEach(placeholder => {
      if (placeholder in selectedItem) {
        const selection = selectedItem[placeholder] as TriggerItemSelection;
        
        if (selection?.value) {
          // Handle special keys differently
          if (placeholder === 'filter') {
            // Here we maintain the existing filter if it exists
            // PopoverRuleCardFilterContent will handle setting the actual filter
            newTriggerItem.filter = selectedRule.triggerItem?.filter || {
              type: selection.value.value,
              selectedItem: {
                type: selection.value.value,
                label: selection.value.label as string
              }
            };
          } else {
            // Standard keys that match the index signature
            newTriggerItem[placeholder] = selection.value;
          }
        }
      }
    });

    // Update the rule state
    setSelectedRule((prev: AutomationRule) => ({
      ...prev,
      triggerItem: newTriggerItem
    }));

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
  const [itemsByTriggerType, setItemsByTriggerType] = useState<TriggerItems[]>([]);

  const onTriggerTypeClick = (type: string) => {
    setSelectedRule((prev: AutomationRule) => ({
      ...prev,
      triggerType: type
    }));
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