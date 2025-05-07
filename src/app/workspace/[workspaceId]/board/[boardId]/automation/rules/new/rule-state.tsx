import { CustomSelectionArr } from "@/app/constants/automation-rule/automation-rule";
import { AutomationRule, GeneralOptions, SelectedAction, SelectedActionItem, SelectedTriggerItem } from "@/app/types/type";
import { Button, Typography } from "antd";
import { Trash } from "lucide-react";
import { Dispatch, SetStateAction } from "react";

interface RuleStateProps {
  selectedRule: AutomationRule;
  setSelectedRule: Dispatch<SetStateAction<AutomationRule>>;
  goToSpecificStep: (step: number) => void;
  activeStep: number;
}

const LabelRenderer = ({item}: {item: SelectedTriggerItem | SelectedActionItem | undefined}) => {
   // If there's no placeholder in the label, just return the text
   if (!item?.label?.includes("<")) {
    return <Typography.Text>{item?.label}</Typography.Text>;
  }

  // Split the label by the placeholders
  const parts = item?.label?.split(/(<[^>]+>)/);

  return (
    <Typography.Text>
      {parts.map((part: string, index: number) => {
        
        if (part.startsWith("<") && part.endsWith(">")) {
          const placeholder = part.slice(1, -1);
          if (placeholder in item && CustomSelectionArr.includes(placeholder)) {
            return <span className="font-bold">{(item[placeholder] as GeneralOptions).label}</span>;
          }

          return placeholder
        }

        return part;
      })}
    </Typography.Text>
  )
}

const RuleState: React.FC<RuleStateProps> = (props) => {
  const {selectedRule, setSelectedRule, goToSpecificStep, activeStep} = props;
  
  const removeTrigger = () => {
    setSelectedRule((prev: AutomationRule | null) => ({
      ...prev,
      triggerItem: undefined,
      actions: []
    } as AutomationRule));
    goToSpecificStep(0);
  }

  const removeAction = (item: SelectedActionItem, indexToRemove: number) => {
    if (selectedRule?.actions?.length) {
      if (selectedRule?.actions?.length > 1) {
        setSelectedRule((prev: AutomationRule | null) => ({
          ...prev,
          actions: prev?.actions?.filter((_, index) => index !== indexToRemove)
        } as AutomationRule));
      } else {
        setSelectedRule((prev: AutomationRule | null) => ({
          ...prev,
          actions: []
        } as AutomationRule));
        goToSpecificStep(1);
      }
    }
  }

  return (
    <div>
      <Typography.Title level={5}>Trigger</Typography.Title>
      <div className="flex justify-between items-center gap-2 my-4 w-full">
        <div className="p-2 rounded-md bg-gray-200 border-2 border-gray-300 w-full">
          <LabelRenderer item={selectedRule?.triggerItem} />
        </div>
        <Button variant="text" onClick={removeTrigger}><Trash size={16} /></Button>
      </div>

      { selectedRule.actions && selectedRule.actions.length > 0 && (
        <>
          <Typography.Title level={5}>Action</Typography.Title>
          {selectedRule?.actions?.map((item: SelectedAction, index: number) => {
            if (item.selectedActionItem) {
              return (
                <div className="flex justify-between items-center gap-2 my-4 w-full">
                  <div className="p-2 rounded-md bg-gray-200 border-2 border-gray-300 w-full">
                    <LabelRenderer item={item.selectedActionItem} />
                  </div>
                  <Button variant="text" onClick={() => removeAction(item.selectedActionItem!, index)}><Trash size={16} /></Button>
                </div>
              )
            }
          })}
        </>
      ) }
    </div>
  );
}

export default RuleState;