"use client";
import { Button, Steps, Typography } from "antd";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Se from "./select-trigger";
import SelectAction from "./select-action";
import { triggers } from "../../../../../../../constants/automation-rule/data";
import ReviewAndSave from "./review-and-save";
import RuleState from "./rule-state";
import { AutomationRule, PostAutomationRule, PostAutomationRuleAction, TriggerItemSelection } from "@/app/types/type";
import SelectTrigger from "./select-trigger";
import { extractPlaceholders } from "@/app/utils/general";
import { createRule } from "@/app/api/automation_rule";

const StepsItem = [
  {
    title: 'Select trigger',
  },
  {
    title: 'Select action',
  },
  {
    title: 'Review and save',
  },
];

const NewRulePage: React.FC = () => {
  const router = useRouter();
  const { workspaceId, boardId } = useParams();
  const [activeStep, setActiveStep] = useState<number>(0);
  const [selectedRule, setSelectedRule] = useState<AutomationRule>({
    triggerType: triggers[0].type,
    actions: []
  });
 
  const onCancel = () => {
    router.push(`/workspace/${workspaceId}/board/${boardId}/automation/rules`);
  };

  const saveRule = async () => {
    // Validate necessary data is present
    if (!selectedRule.triggerItem || !selectedRule.actions || selectedRule.actions.length === 0) {
      console.error("Cannot save rule: missing trigger or actions");
      return;
    }

    const { actions, triggerItem, triggerType } = selectedRule;
    
    // Extract placeholders from trigger type
    const triggerPlaceholders = extractPlaceholders(triggerItem.type || '');
    
    // Build condition object for the trigger
    const triggerCondition: Record<string, any> = {};
    
    // For each placeholder in the trigger, add to condition
    triggerPlaceholders.forEach((placeholder) => {
      if (placeholder === 'filter') {
        // Handle filter specially since it has a specific structure
        if (triggerItem.filter) {
          triggerCondition[placeholder] = triggerItem.filter;
        }
      } else if (placeholder in triggerItem) {
        // For dynamic properties that are GeneralOptions
        const value = triggerItem[placeholder];
        if (value && typeof value === 'object' && 'value' in value) {
          triggerCondition[placeholder] = value.value;
        } else {
          triggerCondition[placeholder] = value;
        }
      }
    });
    triggerCondition["board"] = boardId;

    // Build actions array
    const newActions: PostAutomationRuleAction[] = [];
    
    // Process each action
    actions.forEach((action) => {
      if (!action.selectedActionItem) return;
      
      // Extract placeholders from action type
      const actionPlaceholders = extractPlaceholders(action.selectedActionItem.type || '');
      
      // Build condition object for this action
      const actionCondition: Record<string, any> = {};
      
      // For each placeholder in the action, add to condition
      actionPlaceholders.forEach((placeholder) => {
        if (action.selectedActionItem && placeholder in action.selectedActionItem) {
          const value = action.selectedActionItem[placeholder];
          if (value && typeof value === 'object' && 'value' in value) {
            actionCondition[placeholder] = value.value;
          } else {
            actionCondition[placeholder] = value;
          }
        }
      });
      
      // Create action object in the expected format
      const formattedAction: PostAutomationRuleAction = {
        groupType: action.type || '',
        type: action.selectedActionItem.type,
        condition: actionCondition
      };
      
      newActions.push(formattedAction);
    });

    // Create final rule object
    const rule: PostAutomationRule = {
      workspaceId: Array.isArray(workspaceId) ? workspaceId[0] : workspaceId as string,
      groupType: triggerType,
      type: triggerItem.type || '',
      condition: triggerCondition,
      action: newActions
    };

    console.log("Edited rule:", JSON.stringify(rule));
    
    // post rule
    const result = await createRule(rule);
    console.log("RESULT: %o", result);
    
    // Navigate back to the rules list
    router.push(`/workspace/${workspaceId}/board/${boardId}/automation/rules`);
  };
  
  const nextStep = () => {
    setActiveStep(prevStep => Math.min(prevStep + 1, StepsItem.length - 1));
  };
  
  const prevStep = () => {
    setActiveStep(prevStep => Math.max(prevStep - 1, 0));
  };
  
  const goToSpecificStep = (step: number) => {
    if (step >= 0 && step < StepsItem.length) {
      setActiveStep(step);
    }
  };
 
  return (
    <div className="min-h-screen">
      <div className='flex justify-between items-center pb-4 border-b border-gray-200 mb-8'>
        <div className="flex items-center gap-2">
          <Typography.Title level={3} style={{ margin: 0 }}>Create a Rule</Typography.Title>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            type="primary"
            onClick={saveRule}
            disabled={
              !selectedRule.triggerItem || 
              !selectedRule.actions || 
              selectedRule.actions.length === 0 ||
              !selectedRule.actions.some(action => action.selectedActionItem)
            }
          >
            Save
          </Button>
          <Button onClick={onCancel}>Cancel</Button>
        </div>
      </div>
     
      <div className="pb-4 mb-4 border-b border-gray-200 flex justify-center">
        <Steps
          style={{maxWidth: "650px"}}
          size="small"
          current={activeStep}
          items={StepsItem}
        />
      </div>
      
      {activeStep !== 0 && (
        <RuleState 
          selectedRule={selectedRule} 
          setSelectedRule={setSelectedRule} 
          goToSpecificStep={goToSpecificStep} 
          activeStep={activeStep}
        />
      )}
      
      <div className="step-content">
        {activeStep === 0 ? (
          <SelectTrigger 
            nextStep={nextStep} 
            prevStep={prevStep} 
            selectedRule={selectedRule} 
            setSelectedRule={setSelectedRule}
          />
        ) : activeStep === 1 ? (
          <SelectAction 
            nextStep={nextStep} 
            prevStep={prevStep} 
            selectedRule={selectedRule} 
            setSelectedRule={setSelectedRule} 
          />
        ) : activeStep === 2 ? (
          <ReviewAndSave 
            nextStep={nextStep} 
            prevStep={prevStep} 
            selectedRule={selectedRule} 
            setSelectedRule={setSelectedRule} 
          />
        ) : null}
      </div>
    </div>
  );
};

export default NewRulePage;