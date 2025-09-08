"use client";

import { Button, Typography } from "antd";
import { SelectedAction } from "@myTypes/type";
import { renderRuleStateHuman } from "@utils/rule-render";
import { v4 as uuidv4 } from "uuid";

interface ButtonActionsListProps {
  selectedActions: SelectedAction[];
  onEditAction: (index: number) => void;
  onRemoveAction: (index: number) => void;
}

const ButtonActionsList: React.FC<ButtonActionsListProps> = ({
  selectedActions,
  onEditAction,
  onRemoveAction,
}) => {
  // Function to render action in human readable format
  const renderActionHuman = (action: SelectedAction) => {
    const actionType = action?.selectedActionItem?.type || action?.type;
    if (!actionType) {
      return "No action configured";
    }

    return renderRuleStateHuman(
      actionType,
      action.selectedActionItem || {}
    );
  };

  if (!selectedActions || selectedActions.length === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded border border-gray-200 text-center text-gray-500">
        No actions configured yet. Add an action to get started.
      </div>
    );
  }

  return (
    <div className="mb-6 p-4 bg-gray-50 rounded border border-gray-200">
      <Typography.Title level={5}>Configured Actions</Typography.Title>

      <div className="flex flex-col gap-2">
        {selectedActions.map((action: SelectedAction, index: number) => {
          // Generate stable key for each action to prevent glitching
          const actionId = action.selectedActionItem?.id;
          const actionType = action.selectedActionItem?.type || action.type || "unknown";
          const actionKey =
            typeof actionId === "string"
              ? actionId
              : `action-${index}-${actionType}`;

          // Check if action has a valid type (either in selectedActionItem or action itself)
          const hasValidAction = action?.selectedActionItem?.type || action?.type;

          return (
            <div key={actionKey}>
              {hasValidAction && (
                <div className="flex items-start gap-2 p-3 bg-white rounded border border-gray-100">
                  <span className="text-gray-600 mt-1">•</span>
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-gray-900 leading-relaxed flex-1">
                      {renderActionHuman(action)}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        size="small"
                        type="link"
                        danger
                        onClick={() => onRemoveAction(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {(() => {
        const validActionsCount = selectedActions.filter(action => 
          action?.selectedActionItem?.type || action?.type
        ).length;
        
        return validActionsCount > 0 && (
          <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
            ✓ {validActionsCount} action
            {validActionsCount > 1 ? "s" : ""} configured
          </div>
        );
      })()}
    </div>
  );
};

export default ButtonActionsList;
