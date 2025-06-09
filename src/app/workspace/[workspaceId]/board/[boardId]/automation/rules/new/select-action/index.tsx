import { Button, Select, Typography } from "antd";
import { actions } from "@constants/automation-rule/data";
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { 
  ActionItems, 
  AutomationRule, 
  AutomationRuleAction, 
  AutomationRuleTrigger, 
  GeneralOptions, 
  SelectedAction, 
  SelectedActionItem, 
  TriggerItemSelection 
} from "@myTypes/type";
import { ListSelection, SelectionRef } from "@components/selection";
import { EnumSelectionType } from "@myTypes/automation-rule";

// Helper function to extract placeholders from a pattern
function extractPlaceholders(pattern: string): string[] {
  const regex = /<([^>]+)>|\[([^\]]+)\]/g; // Matches both <...> and [...]
  const placeholders: string[] = [];

  let match;
  while ((match = regex.exec(pattern)) !== null) {
    placeholders.push(match[1] || match[2]);
  }
  return placeholders.filter(Boolean); 
}

interface SelectActionProps {
  nextStep: () => void;
  prevStep: () => void;
  setSelectedRule: Dispatch<SetStateAction<AutomationRule>>;
  selectedRule: AutomationRule;
  actionsData: AutomationRuleAction[];
  setActionsData: Dispatch<SetStateAction<AutomationRuleAction[]>>;
}

// Component for select dropdown in actions
const SelectOption = ({ 
  props, 
  data, 
  placeholder,
  item,
  groupIndex,
  index
}: { 
  props: SelectActionProps, 
  data: TriggerItemSelection, 
  placeholder: string,
  item: ActionItems,
  groupIndex: number,
  index: number
}) => {
  const { setActionsData, actionsData } = props;
  const listSelectionRef = useRef<SelectionRef>(null);
  
  const options = data?.options?.map((optionItem: GeneralOptions) => ({
    value: optionItem.value,
    label: optionItem.label,
    option: optionItem,
  }));
  
  // // Get the current selected value for this placeholder if it exists
  // const lastActionIndex = selectedRule.actions ? selectedRule.actions.length - 1 : 0;
  // const currentValue = selectedRule.actions?.[lastActionIndex]?.selectedActionItem?.[placeholder] as GeneralOptions;
  
  // Handle ListSelection change - use the actual placeholder as key
  const onListChange = (selectedOption: any, selectionName: string) => {
    console.log('ListSelection onChange called:', selectedOption);
    
    let copyArr = [...actionsData];
    (copyArr[groupIndex]?.items?.[index]?.[placeholder as keyof ActionItems] as any)["value"] = selectedOption;
    setActionsData(copyArr);
  };

  // Handle regular Select change
  const onSelectChange = (selectedOption: GeneralOptions, selectionName: string) => {
    console.log("onSelectChange: value: %o", selectedOption);
    
   let copyArr = [...actionsData];
    (copyArr[groupIndex]?.items?.[index]?.[placeholder as keyof ActionItems] as any)["value"] = selectedOption;
    setActionsData(copyArr);
  };

  // Check if this should render as ListSelection
  if (placeholder === EnumSelectionType.List || placeholder === EnumSelectionType.OptionalList) {
    return (
      <ListSelection
        width={"fit-content"}
        ref={listSelectionRef}
        value={(actionsData[groupIndex]?.items?.[index] as any)?.[placeholder]?.value?.value || ''}
        onChange={(value, option) => {
          console.log("di select nya: %o", option);
          onListChange(option, placeholder);
        }}
        className="mx-2"
        key={`list-selection-${index}`}
      />
    );
  }
  
  // Render regular Select
  return (
    <Select
      key={`${placeholder}-${index}`}
        value={(actionsData[groupIndex]?.items?.[index] as any)?.[placeholder]?.value?.value || ''}
      options={options}
      labelInValue={false}
      style={{ width: 120, margin: '0 5px' }}
      onChange={(value, option) => {
        onSelectChange((option as { option: GeneralOptions }).option, placeholder);
      }}
    />
  );
};

const renderLabelWithSelects = (
  props: SelectActionProps, 
  item: ActionItems, 
  lastActionIndex: number,
  groupIndex: number,
  number: number
) => {
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
          const placeholder = part.trim().slice(1, -1); // Remove < and >

          if (placeholder in item || placeholder === EnumSelectionType.List || placeholder === EnumSelectionType.OptionalList) {
            const data: TriggerItemSelection = item[placeholder] as TriggerItemSelection;
            
            return (
              <SelectOption
                key={`action-select-${index}`}
                props={props}
                data={data}
                placeholder={placeholder}
                item={item}
                groupIndex={groupIndex}
                index={index}
              />
            );
          }
        }
        
        // Regular text part
        return <span key={index}>{part}</span>;
      })}
    </div>
  );
};

const SelectAction: React.FC<SelectActionProps> = (props) => {
  const { setSelectedRule, selectedRule, actionsData, nextStep } = props;
  const [actionItemsByActionType, setActionItemsByActionType] = useState<ActionItems[]>([]);
  const [lastActionIndex, setLastActionIndex] = useState<number>(0);
  const [ groupIndex, setGroupIndex ] = useState<number>(0);

  useEffect(() => {
    // Initialize with first action type if no actions exist yet
    if (!selectedRule.actions || selectedRule.actions.length === 0) {
      const newAction: SelectedAction = {
        type: actions[0].type
      };

      setSelectedRule((prev: AutomationRule) => ({
        ...prev,
        actions: [newAction]
      }));
      
      setLastActionIndex(0);
    } else {

      setLastActionIndex(selectedRule.actions.length - 1);
    }
  }, []);

  useEffect(() => {
    // Update the action items based on the selected action type
    if (selectedRule?.actions && lastActionIndex >= 0) {
      const currentAction = selectedRule.actions[lastActionIndex];
      if (currentAction) {
        const filter = actions.find((item) => item.type === currentAction.type);
        setActionItemsByActionType(filter?.items || []);
      }
    }
  }, [selectedRule.actions, lastActionIndex]);

  // Function to handle action type selection
  const onActionTypeClick = (type: string) => {
    setSelectedRule((prev: AutomationRule) => {
      const updatedActions = [...(prev.actions || [])];
      
      // Create or update the action at lastActionIndex
      if (updatedActions[lastActionIndex]) {
        updatedActions[lastActionIndex] = {
          ...updatedActions[lastActionIndex],
          type
        };
      } else {
        updatedActions[lastActionIndex] = { type };
      }
      
      return {
        ...prev,
        actions: updatedActions
      };
    });
  };

  const onAddAction = (index: number) => {
    const newActionItem: SelectedAction = {
      groupType: actionsData[groupIndex].type,
      type: actionsData[groupIndex]?.items?.[index]?.type || '',
    };

    const placeholders = extractPlaceholders(actionsData[groupIndex]?.items?.[index]?.type || '');
    placeholders?.forEach((placeholder) => {
      const items = actionsData[groupIndex]?.items;
      if (items && items[index][placeholder]) {
        if (!newActionItem.selectedActionItem) {
          newActionItem.selectedActionItem = { type: '', label: '' };
        }
        newActionItem.selectedActionItem.type = items?.[index]?.type || '';
        newActionItem.selectedActionItem.label = items?.[index]?.label;
        newActionItem.selectedActionItem[placeholder] = (items?.[index]?.[placeholder] as TriggerItemSelection).value || '';
      }
    });

    let copy = {...selectedRule};
    copy.actions?.push(newActionItem);
    setSelectedRule(copy);
    nextStep();
  }

  return (
    <div>
      <Typography.Title level={5}>Select Action</Typography.Title>
      <div className="flex gap-2 my-4">
        {actionsData?.map((item: AutomationRuleAction, index: number) => (
          <div 
            key={index}
            onClick={() => onActionTypeClick(item.type)}
            className={`flex flex-col justify-center items-center w-64 rounded p-2 cursor-pointer ${
              selectedRule?.actions?.[lastActionIndex]?.type === item.type ? 'bg-blue-100' : 'bg-gray-300'
            }`}
          >
            <div>{item?.icon}</div>
            <Typography.Text>{item.label}</Typography.Text>
          </div>
        ))}
      </div>

      <div>
        {actionsData[groupIndex]?.items?.map((item: ActionItems, index: number) => (
          <div key={index} className="flex justify-between items-start rounded p-2 mb-2 bg-gray-200">
            <div>
              {renderLabelWithSelects(props, item, lastActionIndex, groupIndex, index)}
            </div>
            <Button shape="circle" onClick={() => {onAddAction(index)}}>
              <Plus />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SelectAction;