import { Button, Typography } from "antd";
import { Dispatch, SetStateAction, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { AutomationRule } from "@myTypes/type";
import { renderRuleStateHuman } from "@utils/rule-render";
import { useLabels } from "@hooks/label";
import { useCustomFields } from "@hooks/custom_field";
import { useRuleLookups } from "@hooks/useRuleLookups";
import { LookupCache } from "@utils/lookup-cache";

interface RuleStateProps {
  selectedRule: AutomationRule;
  setSelectedRule: Dispatch<SetStateAction<AutomationRule>>;
  goToSpecificStep: (step: number) => void;
  activeStep: number;
}

const RuleState: React.FC<RuleStateProps> = (props) => {
  const { selectedRule, goToSpecificStep, activeStep } = props;
  const { workspaceId } = useParams();

  // Fetch and cache all necessary data for rule rendering
  const { allLabels } = useLabels(workspaceId as string);
  const { customFields } = useCustomFields(workspaceId as string);

  // Memoize the rule-like structure to prevent infinite loops
  const ruleLikeStructure = useMemo(() => {
    if (!selectedRule.triggerItem) return [];

    return [
      {
        condition: selectedRule.triggerItem,
        action:
          selectedRule.actions?.map((action) => ({
            condition: action.selectedActionItem || {},
          })) || [],
      },
    ];
  }, [selectedRule.triggerItem, selectedRule.actions]);

  // Use the rule lookups hook to fetch any missing data
  const { loading: lookupLoading, version } = useRuleLookups(ruleLikeStructure);

  // Cache all the necessary data for rule rendering
  useEffect(() => {
    if (allLabels && allLabels.length > 0) {
      LookupCache.rememberMany(
        "label",
        allLabels.map((l: { id: string; name: string }) => ({
          id: l.id,
          name: l.name,
        }))
      );
    }

    if (customFields && customFields.length > 0) {
      LookupCache.rememberMany(
        "field",
        customFields.map((f: { id: string; name: string }) => ({
          id: f.id,
          name: f.name,
        }))
      );
    }
  }, [allLabels, customFields]);

  console.log("selectedRule adalah: %o", selectedRule);

  // Function to render trigger in human readable format
  const renderTriggerHuman = () => {
    if (!selectedRule?.triggerItem?.type) {
      return "No trigger selected";
    }

    return renderRuleStateHuman(
      selectedRule.triggerItem.type,
      selectedRule.triggerItem
    );
  };

  // Function to render action in human readable format
  const renderActionHuman = (action: any) => {
    if (!action?.selectedActionItem?.type) {
      return "No action configured";
    }

    return renderRuleStateHuman(
      action.selectedActionItem.type,
      action.selectedActionItem
    );
  };

  return (
    <div className="mb-6 p-4 bg-gray-50 rounded border border-gray-200">
      <Typography.Title level={5}>Current Rule Configuration</Typography.Title>

      <div className="flex flex-col gap-3">
        {/* Display Trigger */}
        <div className="flex items-start gap-2">
          <span className="font-medium text-gray-700 min-w-fit">Trigger:</span>
          <div className="flex-1 flex items-center gap-2">
            <span className="text-gray-900 leading-relaxed">
              {renderTriggerHuman()}
            </span>
            <Button
              size="small"
              type="link"
              onClick={() => goToSpecificStep(0)}
            >
              Edit
            </Button>
          </div>
        </div>

        {/* Display Actions */}
        {activeStep > 1 &&
          selectedRule.actions &&
          selectedRule.actions.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="font-medium text-gray-700">Actions:</span>
              {selectedRule.actions.map((action: any, index: number) => (
                <div key={index}>
                  {action?.selectedActionItem?.type && (
                    <div className="ml-4 flex items-start gap-2">
                      <span className="text-gray-600 mt-1">•</span>
                      <div className="flex-1 flex items-center gap-2">
                        <span className="text-gray-900 leading-relaxed">
                          {renderActionHuman(action)}
                        </span>
                        <Button
                          size="small"
                          type="link"
                          onClick={() => goToSpecificStep(1)}
                        >
                          Edit
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

        {/* Show completion message when rule is fully configured */}
        {activeStep > 1 &&
          selectedRule.triggerItem &&
          selectedRule.actions &&
          selectedRule.actions.length > 0 && (
            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
              ✓ Rule is ready to be saved
            </div>
          )}

        {/* Show loading state when lookups are being fetched */}
        {lookupLoading && (
          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
            ⏳ Loading rule details...
          </div>
        )}
      </div>
    </div>
  );
};

export default RuleState;
