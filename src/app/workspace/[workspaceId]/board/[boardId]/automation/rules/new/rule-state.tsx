import { Button, Typography } from "antd";
import { Dispatch, SetStateAction } from "react";
import { AutomationRule } from "@/app/types/type";

interface RuleStateProps {
  selectedRule: AutomationRule;
  setSelectedRule: Dispatch<SetStateAction<AutomationRule>>;
  goToSpecificStep: (step: number) => void;
  activeStep: number;
}

const RuleState: React.FC<RuleStateProps> = (props) => {
  const { selectedRule, goToSpecificStep, activeStep } = props;
  
  return (
    <div className="mb-6 p-4 bg-gray-50 rounded border border-gray-200">
      <Typography.Title level={5}>Current Rule Configuration</Typography.Title>
      
      <div className="flex flex-col gap-2">
        {/* Display Trigger */}
        <div className="flex items-center gap-2">
          <span className="font-medium">Trigger:</span>
          <span>
            {selectedRule.triggerItem?.label || "No trigger selected"}
          </span>
          <Button size="small" onClick={() => goToSpecificStep(0)}>Edit</Button>
        </div>
        
        {/* Display Actions */}
        {activeStep > 1 && selectedRule.actions && selectedRule.actions.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="font-medium">Actions:</span>
            {selectedRule.actions.map((action, index) => (
              <div key={index} className="ml-4 flex items-center gap-2">
                <span>{index + 1}. {action.selectedActionItem?.label || "Action not fully configured"}</span>
                <Button size="small" onClick={() => goToSpecificStep(1)}>Edit</Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RuleState;