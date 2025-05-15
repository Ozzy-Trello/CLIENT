import { Button, Select, Typography } from "antd";
import { actions } from "../../../../../../../../constants/automation-rule/data";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { CustomSelectionArr } from "@/app/constants/automation-rule/automation-rule";
import { 
  ActionItems, 
  AutomationRule, 
  GeneralOptions, 
  SelectedAction, 
  SelectedActionItem, 
  TriggerItemSelection 
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

interface SelectActionProps {
  nextStep: () => void;
  prevStep: () => void;
  setSelectedRule: Dispatch<SetStateAction<AutomationRule>>;
  selectedRule: AutomationRule;
}

// Component for select dropdown in actions
const SelectOption = ({ 
  props, 
  index, 
  data, 
  placeholder,
  item
}: { 
  props: SelectActionProps, 
  index: number, 
  data: TriggerItemSelection, 
  placeholder: string,
  item: ActionItems
}) => {
  const { setSelectedRule, selectedRule } = props;
  
  const options = data?.options?.map((optionItem: GeneralOptions) => ({
    value: optionItem.value,
    label: optionItem.label,
    option: optionItem,
  }));
  
  // Get the current selected value for this placeholder if it exists
  const lastActionIndex = selectedRule.actions ? selectedRule.actions.length - 1 : 0;
  const currentValue = selectedRule.actions?.[lastActionIndex]?.selectedActionItem?.[placeholder] as GeneralOptions;
  
  return (
    <Select
      key={`${placeholder}-${index}`}
      defaultValue={currentValue?.value || data.value?.value}
      options={options}
      labelInValue={false}
      style={{ width: 120, margin: '0 5px' }}
      onChange={(value, option) => {
        const selectedOption = (option as { option: GeneralOptions }).option;
        
        setSelectedRule((prev: AutomationRule) => {
          // Make a copy of the actions array
          const updatedActions = [...(prev.actions || [])];
          
          // Get the current action or initialize it
          const currentAction = updatedActions[lastActionIndex] || { type: item.type };
          
          // Initialize selectedActionItem if it doesn't exist
          if (!currentAction.selectedActionItem) {
            currentAction.selectedActionItem = {
              type: item.type,
              label: item.label
            };
          }
          
          // Set the dynamic property 
          currentAction.selectedActionItem[placeholder] = selectedOption;
          
          // Update the action in the array
          updatedActions[lastActionIndex] = currentAction;
          
          return {
            ...prev,
            actions: updatedActions
          };
        });
      }}
    />
  );
};

const renderLabelWithSelects = (
  props: SelectActionProps, 
  item: ActionItems, 
  lastActionIndex: number
) => {
  const { setSelectedRule, selectedRule } = props;
  
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

          if (placeholder in item) {
            const data: TriggerItemSelection = item[placeholder] as TriggerItemSelection;
            
            // Use the SelectOption component for dynamic placeholders
            return (
              <SelectOption
                key={`action-select-${index}`}
                props={props}
                index={index}
                data={data}
                placeholder={placeholder}
                item={item}
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

const renderItems = (props: SelectActionProps, items: ActionItems[], lastActionIndex: number) => {
  const { nextStep, setSelectedRule, selectedRule } = props;

  const onSelectAction = (selectedItem: ActionItems) => {
    // Extract placeholders from the type string
    const placeholders = extractPlaceholders(selectedItem.type);
    
    // Create a new action item with the base properties
    const newActionItem: SelectedActionItem = {
      type: selectedItem.type,
      label: selectedItem.label
    };
    
    // Add values from the placeholders if they exist
    placeholders.forEach(placeholder => {
      if (placeholder in selectedItem) {
        const selection = selectedItem[placeholder] as TriggerItemSelection;
        if (selection?.value) {
          // Add the value for this placeholder
          newActionItem[placeholder] = selection.value;
        }
      }
    });
    
    // Create a copy of the current actions array
    const updatedActions = [...(selectedRule.actions || [])];
    
    // Update the action at the current index
    updatedActions[lastActionIndex] = {
      type: selectedItem.type,
      selectedActionItem: newActionItem
    };
    
    // Update the rule state
    setSelectedRule((prev: AutomationRule) => ({
      ...prev,
      actions: updatedActions
    }));
    
    nextStep();
  };

  return (
    <div>
      {items?.map((item: ActionItems, index: number) => (
        <div key={index} className="flex justify-between items-start rounded p-2 mb-2 bg-gray-200">
          <div>
            {renderLabelWithSelects(props, item, lastActionIndex)}
          </div>
          <Button shape="circle" onClick={() => {onSelectAction(item)}}>
            <Plus />
          </Button>
        </div>
      ))}
    </div>
  );
};

const SelectAction: React.FC<SelectActionProps> = (props) => {
  const { setSelectedRule, selectedRule } = props;
  const [actionItemsByActionType, setActionItemsByActionType] = useState<ActionItems[]>([]);
  const [lastActionIndex, setLastActionIndex] = useState<number>(0);

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
      // If we're adding another action or editing an existing one,
      // set the lastActionIndex accordingly
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

  return (
    <div>
      <Typography.Title level={5}>Select Action</Typography.Title>
      <div className="flex gap-2 my-4">
        {actions.map((item, index) => (
          <div 
            key={index}
            onClick={() => onActionTypeClick(item.type)}
            className={`flex flex-col justify-center items-center w-64 rounded p-2 cursor-pointer ${
              selectedRule?.actions?.[lastActionIndex]?.type === item.type ? 'bg-blue-100' : 'bg-gray-300'
            }`}
          >
            <div>{item.icon}</div>
            <Typography.Text>{item.label}</Typography.Text>
          </div>
        ))}
      </div>

      <div>
        {renderItems(props, actionItemsByActionType, lastActionIndex)}
      </div>
    </div>
  );
};

export default SelectAction;