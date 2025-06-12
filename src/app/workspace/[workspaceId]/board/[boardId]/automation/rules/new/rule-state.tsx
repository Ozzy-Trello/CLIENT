import { Button, Typography } from "antd";
import { Dispatch, SetStateAction } from "react";
import { AutomationRule } from "@myTypes/type";

interface RuleStateProps {
  selectedRule: AutomationRule;
  setSelectedRule: Dispatch<SetStateAction<AutomationRule>>;
  goToSpecificStep: (step: number) => void;
  activeStep: number;
}

const RuleState: React.FC<RuleStateProps> = (props) => {
  const { selectedRule, goToSpecificStep, activeStep } = props;
  console.log("selectedRule adalah: %o", selectedRule);
  
  const renderType = (type: string, condition: any): string => {
    
    // Replace the placeholders
    let result = type
      .replace(/-/g, ' ')
      .replace(/<action>/, condition?.action?.label || condition?.action || '')
      .replace(/<optional_action>/, condition?.optional_action?.label || condition?.optional_action || '')
      .replace(/<by>/, condition?.by?.label || condition?.by || '')
      .replace(/<optional_by>/, condition?.optional_by?.label || condition?.optional_by || '')
      .replace(/<board>/, condition?.board?.label || condition?.board || '')
      .replace(/<optional_board>/, condition?.optional_board?.label || condition?.optional_board || '')
      .replace(/<list>/, condition?.list?.label || condition?.list || '')
      .replace(/<optional_list>/, condition?.optional_list?.label || condition?.optional_list || '')
      .replace(/<position>/, condition?.position?.label || condition?.position || '')
      .replace(/<optional_position>/, condition?.optional_position?.label || condition?.optional_position || '')
      .replace(/<filter>/, '') // remove placeholder
      .replace(/<text_input>/, condition?.text_input?.value || condition?.text_input || '')
      .replace(/<channel>/, condition?.channel?.label || condition?.channel || '')
      .replace(/<user>/, condition?.user?.username || condition?.user || '')
      .replace(/\s+/g, ' ') // clean extra spaces (fixed regex)
      .trim();
    
    return result;
  }
 
  return (
    <div className="mb-6 p-4 bg-gray-50 rounded border border-gray-200">
      <Typography.Title level={5}>Current Rule Configuration</Typography.Title>
     
      <div className="flex flex-col gap-2">
        {/* Display Trigger */}
        <div className="flex items-center gap-2">
          <span className="font-medium">Trigger:</span>
          <span>
            {renderType(selectedRule?.triggerItem?.type ?? '', selectedRule?.triggerItem) || "No trigger selected"}
          </span>
          <Button size="small" onClick={() => goToSpecificStep(0)}>Edit</Button>
        </div>
       
        {/* Display Actions */}
        {activeStep > 1 && selectedRule.actions && selectedRule.actions.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="font-medium">Actions:</span>
            {selectedRule.actions.map((action: any, index: number) => (
              <>
                {action?.selectedActionItem?.type && (
                  <div key={index} className="ml-4 flex items-center gap-2">
                    <span>
                      <span>{`- ${renderType(action?.selectedActionItem?.type, action?.selectedActionItem)}`}</span>
                    </span>
                    <Button size="small" onClick={() => goToSpecificStep(1)}>Edit</Button>
                  </div>
                )}
              </>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RuleState;