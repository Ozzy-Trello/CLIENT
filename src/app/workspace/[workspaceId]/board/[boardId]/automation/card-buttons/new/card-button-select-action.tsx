"use client";

import { useState } from "react";
import { Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { actions } from "@constants/automation-rule/data";
import {
  AutomationRuleAction,
  SelectedAction,
  AutomationRule,
} from "@myTypes/type";
import SelectAction from "../../rules/new/select-action";
import ButtonActionsList from "../../custom-buttons/new/button-actions-list";

interface CardButtonSelectActionProps {
  selectedActions: SelectedAction[];
  onActionsChange: (actions: SelectedAction[]) => void;
}

export function CardButtonSelectAction({
  selectedActions,
  onActionsChange,
}: CardButtonSelectActionProps) {
  const [isAddingAction, setIsAddingAction] = useState(false);
  const [editingActionIndex, setEditingActionIndex] = useState<number | null>(
    null
  );
  const [currentRule, setCurrentRule] = useState<AutomationRule>({
    triggerType: "",
    actions: [],
  });

  // Handle adding a new action
  const handleAddAction = () => {
    console.log("[SEIZURE DEBUG] 🆕 Starting to add new action");
    setIsAddingAction(true);
    setEditingActionIndex(null);
    setCurrentRule({
      triggerType: "",
      actions: [],
    });
  };

  // Handle editing an existing action
  const handleEditAction = (index: number) => {
    console.log("[SEIZURE DEBUG] ✏️ Starting to edit action at index:", index);
    setEditingActionIndex(index);
    setIsAddingAction(true);

    const actionToEdit = selectedActions[index];
    setCurrentRule({
      triggerType: "",
      actions: [actionToEdit],
    });
  };

  // Handle removing an action
  const handleRemoveAction = (index: number) => {
    console.log("[SEIZURE DEBUG] 🗑️ Removing action at index:", index);
    const updatedActions = selectedActions.filter((_, i) => i !== index);
    onActionsChange(updatedActions);
  };

  // Handle canceling action configuration
  const handleCancelAction = () => {
    console.log("[SEIZURE DEBUG] ❌ Canceling action configuration");
    setIsAddingAction(false);
    setEditingActionIndex(null);
    setCurrentRule({
      triggerType: "",
      actions: [],
    });
  };

  // Handle saving action (called when action is configured)
  const handleSaveAction = () => {
    console.log("[SEIZURE DEBUG] 💾 Saving action configuration");

    if (currentRule.actions && currentRule.actions.length > 0) {
      const configuredAction = currentRule.actions[0];
      let updatedActions;

      if (editingActionIndex !== null) {
        // Update existing action
        console.log(
          "[SEIZURE DEBUG] 📝 Updating existing action at index:",
          editingActionIndex
        );
        updatedActions = [...selectedActions];
        updatedActions[editingActionIndex] = configuredAction;
      } else {
        // Add new action
        console.log("[SEIZURE DEBUG] ➕ Adding new action to list");
        updatedActions = [...selectedActions, configuredAction];
      }

      // Update parent with new actions
      onActionsChange(updatedActions);

      // Reset state
      setIsAddingAction(false);
      setEditingActionIndex(null);
      setCurrentRule({
        triggerType: "",
        actions: [],
      });
    }
  };

  // Simple callback to update the current rule being configured
  const handleRuleChange = (value: React.SetStateAction<AutomationRule>) => {
    console.log("[SEIZURE DEBUG] 🔄 Rule updated in SelectAction component");
    if (typeof value === "function") {
      setCurrentRule((prev) => value(prev));
    } else {
      setCurrentRule(value);
    }
  };

  if (isAddingAction) {
    return (
      <div className="card-button-select-action">
        <div className="mb-4">
          <Button onClick={handleCancelAction} className="mr-2">
            Cancel
          </Button>
          <Button
            type="primary"
            onClick={handleSaveAction}
            disabled={!currentRule.actions || currentRule.actions.length === 0}
          >
            {editingActionIndex !== null ? "Update Action" : "Add Action"}
          </Button>
        </div>

        <SelectAction
          nextStep={handleSaveAction}
          prevStep={handleCancelAction}
          setSelectedRule={handleRuleChange}
          selectedRule={currentRule}
          actionsData={actions}
          setActionsData={() => {}} // Not needed in this context
          numberFields={[]} // Pass appropriate fields if needed
          isEditMode={editingActionIndex !== null}
        />
      </div>
    );
  }

  return (
    <div className="card-button-select-action">
      <div className="mb-4">
        <Button
          type="dashed"
          onClick={handleAddAction}
          icon={<PlusOutlined />}
          className="w-full"
        >
          Add Action
        </Button>
      </div>

      {selectedActions.length > 0 && (
        <ButtonActionsList
          selectedActions={selectedActions}
          onEditAction={handleEditAction}
          onRemoveAction={handleRemoveAction}
        />
      )}
    </div>
  );
}

export default CardButtonSelectAction;
