import { Button, Select, Typography } from "antd";
import { actions } from "../../../../../../../../constants/automation-rule/data";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import RuleState from "../rule-state";
import { CustomSelectionArr } from "@/app/constants/automation-rule/automation-rule";
import { ActionItems, AutomationRule, GeneralOptions, SelectedAction, SelectedActionItem, TriggerItemSelection } from "@/app/types/type";

interface SelectActionProps {
  nextStep: () => void;
  prevStep: () => void;
  setSelectedRule: Dispatch<SetStateAction<AutomationRule>>;
  selectedRule: AutomationRule;
}

const renderItems = (props: SelectActionProps, items: ActionItems[], lastActionIndex: number) => {
  
  const { nextStep, setSelectedRule, selectedRule } = props;

  const onSelectAction = (selectedItem: ActionItems) => {
    let currentActions = selectedRule.actions || [];
    let currentSelectedActionItem = {...currentActions?.[lastActionIndex]};

    if (currentSelectedActionItem.selectedActionItem) {
      currentSelectedActionItem.selectedActionItem.type = selectedItem.type;
      currentSelectedActionItem.selectedActionItem.label = selectedItem.label;
    } else {
      let selectedActionItem: SelectedActionItem = {
        type: selectedItem.type,
        label: selectedItem.label,
      };

      currentSelectedActionItem.selectedActionItem = selectedActionItem;
    }
    
    if (currentSelectedActionItem && currentSelectedActionItem.selectedActionItem) {

      for(const key in selectedItem) {
        if (CustomSelectionArr.includes(key)) {
          currentSelectedActionItem.selectedActionItem[key] = (selectedItem?.[key] as TriggerItemSelection)?.value ?? undefined;
        }
      }
      currentActions[lastActionIndex] = currentSelectedActionItem;
    }

    setSelectedRule((prev: AutomationRule | null) => ({
      ...prev,
      actions: currentActions
    } as AutomationRule));
    
    nextStep();
  }

  return (
    <div>
      {items?.map((item: ActionItems, index: number) => (
        <div key={index} className="flex justify-between items-start rounded p-2 mb-2 bg-gray-200">
          <div>
            {renderLabelWithSelects(props, item, lastActionIndex)}
          </div>
          <Button shape="circle" onClick={() => {onSelectAction(item)}}><Plus /></Button>
        </div>
      ))}
    </div>
  );
}

const renderLabelWithSelects = (props: SelectActionProps, item: ActionItems, lastActionIndex: number) => {
  const { setSelectedRule } = props;
  
  // If there's no placeholder in the label, just return the text
  if (!item.label.includes("<")) {
    return <Typography.Text>{item.label}</Typography.Text>;
  }

  // Split the label by the placeholders
  const parts = item.label.split(/(<[^>]+>)/);

  const onSelectionChange = (selectedOption: GeneralOptions, selectionName: string) => {
    setSelectedRule((prev: AutomationRule | null) => ({
      ...prev,
      actions: {
        ...prev?.actions,
        [lastActionIndex]: {
          ...prev?.actions?.[lastActionIndex],
          [selectionName]: selectedOption
        }
      }
    } as AutomationRule));
  }
  
  return (
    <div className="flex items-center flex-wrap">
      {parts.map((part: string, index: number) => {
        // Check if this part is a placeholder
        if (part.startsWith("<") && part.endsWith(">")) {
          const placeholder = part.slice(1, -1); // Remove < and >

          if (placeholder in item) {

            const data: TriggerItemSelection = item[placeholder] as TriggerItemSelection;

            const options = data?.options?.map((actionOption: GeneralOptions) => ({
              value: actionOption.value,
              label: actionOption.label,
              option: actionOption,
            }));
            
            return <Select
              key={`${placeholder}-${index}`}
              defaultValue={data.value}
              options={options}
              labelInValue={false}
              style={{ width: 120, margin: '0 5px' }}
              onChange={(value, option) => {onSelectionChange((option as { option: GeneralOptions }).option, placeholder)}}
            />;
          }
          
        }
        
        // Regular text part
        return <span key={index}>{part}</span>;
      })}
    </div>
  );
}

const SelectAction: React.FC<SelectActionProps> = (props) => {

  const { setSelectedRule, selectedRule } = props;
  const [ actionItemsByActionType, setActionItemsByActionType ] = useState<any>([]);
  const [ lastActionIndex, setLastActionIndex ] = useState<number>(0);

  useEffect(() => {
    const newAction: SelectedAction = {
      type: actions[0].type,
    }

    let currentActions = selectedRule?.actions || [];
    currentActions.push(newAction);

    setSelectedRule((prev: AutomationRule | null) => ({
      ...prev,
      actions: currentActions
    } as AutomationRule));

    let index = 0;
    
    if (currentActions?.length && currentActions?.length > 0) {
      index = currentActions.length - 1;
    }

    setLastActionIndex(index);
  }, []);

  useEffect(() => {

    if (selectedRule?.actions && lastActionIndex >= 0) {
      if (selectedRule?.actions?.[lastActionIndex]) {
        const filter = actions.find((item) => item.type === selectedRule?.actions?.[lastActionIndex].type);
        setActionItemsByActionType(filter?.items || []);
      }  
    }

  }, [selectedRule.actions])

  return (
    <div>
      <Typography.Title level={5}>Select Action</Typography.Title>
      <div className="flex gap-2 my-4">
        {actions.map((item, index) => (
          <div 
            key={index}
            className={`flex flex-col justify-center items-center w-64 rounded p-2 cursor-pointer ${selectedRule?.actions?.[0]?.type === item.type ? 'bg-blue-100' : 'bg-gray-300'}`}
          >
            <div>{item.icon}</div>
            <Typography.Text>{item.label}</Typography.Text>
          </div>
        ))}
      </div>

      <div>
        { renderItems(props, actionItemsByActionType, lastActionIndex) }
      </div>
    </div>
  );
}

export default SelectAction;