"use client";
import { Button, message, Steps, Typography } from "antd";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import SelectAction from "./select-action";
import { actions, triggers } from "@constants/automation-rule/data";
import ReviewAndSave from "./review-and-save";
import RuleState from "./rule-state";
import {
  AutomationRule,
  AutomationRuleApiData,
  AutomationRuleActionApiData,
  TriggerItemSelection,
  AutomationRuleTrigger,
  AutomationRuleAction,
} from "@myTypes/type";
import SelectTrigger from "./select-trigger";
import { extractPlaceholders } from "@utils/general";
import { createRule } from "@api/automation_rule";
import { EnumSelectionType } from "@myTypes/automation-rule";

const StepsItem = [
  {
    title: "Select trigger",
  },
  {
    title: "Select action",
  },
  {
    title: "Review and save",
  },
];

const NewRulePage: React.FC = () => {
  const router = useRouter();
  const { workspaceId, boardId } = useParams();
  const [activeStep, setActiveStep] = useState<number>(0);
  const [selectedRule, setSelectedRule] = useState<AutomationRule>({
    triggerType: triggers[0].type,
    actions: [],
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [triggersData, setTriggersData] =
    useState<AutomationRuleTrigger[]>(triggers); // data to construct the triggers UI
  const [actionsData, setActionsData] =
    useState<AutomationRuleAction[]>(actions); //data to construct the actions UI

  const onCancel = () => {
    router.push(`/workspace/${workspaceId}/board/${boardId}/automation/rules`);
  };

  const saveRule = async () => {
    // Validate necessary data is present
    if (
      !selectedRule.triggerItem ||
      !selectedRule.actions ||
      selectedRule.actions.length === 0
    ) {
      console.error("Cannot save rule: missing trigger or actions");
      return;
    }

    console.log("selectedRule: %o", selectedRule);

    const { actions, triggerItem, triggerType } = selectedRule;

    // Extract placeholders from trigger type
    const triggerPlaceholders = extractPlaceholders(triggerItem.type || "");

    // Build condition object for the trigger
    const triggerCondition: Record<string, any> = {};

    // For each placeholder in the trigger, add to condition
    triggerPlaceholders.forEach((placeholder) => {
      if (placeholder === "filter") {
        // Handle filter specially since it has a specific structure
        if (triggerItem.filter) {
          triggerCondition[placeholder] = triggerItem.filter;
        }
      } else if (placeholder in triggerItem) {
        // For dynamic properties that are GeneralOptions
        const value = triggerItem[placeholder];
        if (value) {
          if (typeof value === "object" && "value" in value) {
            if ("data" in value) {
              triggerCondition[placeholder] = {
                operator: (value as any).value,
                data: (value as any).data,
              };
            } else {
              triggerCondition[placeholder] = (value as any).value;
            }
          } else {
            triggerCondition[placeholder] = value;
          }
        }
      }
    });
    triggerCondition["board"] = boardId;

    // ensure constant action is included even if not in placeholders
    const actVal: any = (triggerItem as any)[EnumSelectionType.Action];
    if (actVal && !triggerCondition[EnumSelectionType.Action]) {
      if (typeof actVal === "object" && "value" in actVal) {
        triggerCondition[EnumSelectionType.Action] = actVal.value;
      } else {
        triggerCondition[EnumSelectionType.Action] = actVal;
      }
    }

    // === NEW: include checklist_name filter when provided ===
    if ((triggerItem as any).checklist_name !== undefined) {
      triggerCondition["checklist_name"] = (triggerItem as any).checklist_name;
    }

    // Build actions array
    const newActions: AutomationRuleActionApiData[] = [];

    // Process each action
    actions.forEach((action) => {
      if (!action.selectedActionItem) return;

      // Extract placeholders from action type
      const actionPlaceholders = extractPlaceholders(
        action.selectedActionItem.type || ""
      );

      // Build condition object for this action
      const actionCondition: Record<string, any> = {};

      // For each placeholder in the action, add to condition
      actionPlaceholders.forEach((placeholder) => {
        if (
          action.selectedActionItem &&
          action.selectedActionItem[placeholder]
        ) {
          const value = action.selectedActionItem[placeholder];
          if (value && typeof value === "object" && "value" in value) {
            actionCondition[placeholder] = value.value;
          } else {
            actionCondition[placeholder] = value;
          }
        }
      });

      // Create action object in the expected format
      const formattedAction: AutomationRuleActionApiData = {
        groupType: action?.groupType || "",
        type: action.selectedActionItem.type,
        condition: actionCondition,
      };

      newActions.push(formattedAction);
    });

    // Create final rule object
    const rule: AutomationRuleApiData = {
      workspaceId: Array.isArray(workspaceId)
        ? workspaceId[0]
        : (workspaceId as string),
      groupType: triggerType,
      type: triggerItem.type || "",
      condition: triggerCondition,
      action: newActions,
    };

    // post rule
    try {
      setIsLoading(true);
      const result = await createRule(rule);
      router.push(
        `/workspace/${workspaceId}/board/${boardId}/automation/rules`
      );
    } catch (e: any) {
      message.error(e?.response?.data?.message || "something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = () => {
    setActiveStep((prevStep) => Math.min(prevStep + 1, StepsItem.length - 1));
  };

  const prevStep = () => {
    setActiveStep((prevStep) => Math.max(prevStep - 1, 0));
  };

  const goToSpecificStep = (step: number) => {
    if (step >= 0 && step < StepsItem.length) {
      setActiveStep(step);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="flex justify-between items-center pb-4 border-b border-gray-200 mb-8">
        <div className="flex items-center gap-2">
          <Typography.Title level={3} style={{ margin: 0 }}>
            Create a Rule
          </Typography.Title>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="primary"
            onClick={saveRule}
            loading={isLoading}
            disabled={
              !selectedRule.triggerItem ||
              !selectedRule.actions ||
              selectedRule.actions.length === 0 ||
              !selectedRule.actions.some((action) => action.selectedActionItem)
            }
          >
            Save
          </Button>
          <Button onClick={onCancel}>Cancel</Button>
        </div>
      </div>

      <div className="pb-4 mb-4 border-b border-gray-200 flex justify-center">
        <Steps
          style={{ maxWidth: "650px" }}
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
            triggersData={triggersData}
            setTriggersData={setTriggersData}
          />
        ) : activeStep === 1 ? (
          <SelectAction
            nextStep={nextStep}
            prevStep={prevStep}
            selectedRule={selectedRule}
            setSelectedRule={setSelectedRule}
            actionsData={actionsData}
            setActionsData={setActionsData}
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
