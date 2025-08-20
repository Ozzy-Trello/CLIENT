"use client";

import { useState, useEffect } from "react";
import { Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { actions } from "@constants/automation-rule/data";
import { AutomationRuleAction, SelectedAction, AutomationRule } from "@myTypes/type";
import SelectAction from "../../rules/new/select-action";
import ButtonActionsList from "./button-actions-list";
import { v4 as uuidv4 } from "uuid";

interface CardButtonSelectActionProps {
  selectedActions: SelectedAction[];
  onActionsChange: (actions: SelectedAction[]) => void;
}

export function CardButtonSelectAction({
  selectedActions,
  onActionsChange
}: CardButtonSelectActionProps) {
  const [selectedRule, setSelectedRule] = useState<AutomationRule>({
    triggerType: "",
    actions: selectedActions
  });
  
  const [actionsData, setActionsData] = useState<AutomationRuleAction[]>([]);
  const [isAddingAction, setIsAddingAction] = useState(false);
  const [editingActionIndex, setEditingActionIndex] = useState<number | null>(null);

  // Set all actions without filtering
  useEffect(() => {
    setActionsData(actions);
  }, []);

  // Update selectedRule when selectedActions prop changes
  useEffect(() => {
    setSelectedRule(prev => ({
      ...prev,
      actions: selectedActions
    }));
  }, [selectedActions]);

  // Update parent when selectedRule.actions changes
  useEffect(() => {
    if (selectedRule.actions && selectedRule.actions !== selectedActions) {
      onActionsChange(selectedRule.actions);
    }
  }, [selectedRule.actions]);

  // Handle adding a new action
  const handleAddAction = () => {
    setIsAddingAction(true);
    setEditingActionIndex(null);
    
    // Reset selectedRule for new action
    setSelectedRule({
      triggerType: "",
      actions: []
    });
  };

  // Handle editing an existing action
  const handleEditAction = (index: number) => {
    setEditingActionIndex(index);
    setIsAddingAction(true);
    
    // Set the selectedRule to have only the action being edited
    const actionToEdit = selectedActions[index];
    setSelectedRule({
      triggerType: "",
      actions: [actionToEdit]
    });
  };

  // Handle removing an action
  const handleRemoveAction = (index: number) => {
    const updatedActions = selectedActions.filter((_, i) => i !== index);
    onActionsChange(updatedActions);
  };

  // Handle canceling action configuration
  const handleCancelAction = () => {
    setIsAddingAction(false);
    setEditingActionIndex(null);
    
    // Reset selectedRule to show all actions
    setSelectedRule({
      triggerType: "",
      actions: selectedActions
    });
  };
  
  // Handle saving action (called when action is configured)
  const handleSaveAction = () => {
    if (selectedRule.actions && selectedRule.actions.length > 0) {
      const configuredAction = selectedRule.actions[0];
      
      // Ensure action has a unique ID for stable rendering
      if (configuredAction.selectedActionItem && !configuredAction.selectedActionItem.id) {
        configuredAction.selectedActionItem.id = uuidv4();
      }
      
      let updatedActions: SelectedAction[];
      
      if (editingActionIndex !== null) {
        // Update existing action
        updatedActions = [...selectedActions];
        updatedActions[editingActionIndex] = configuredAction;
      } else {
        // Add new action
        updatedActions = [...selectedActions, configuredAction];
      }
      
      // Update actions first
      onActionsChange(updatedActions);
      
      // Reset state
      setIsAddingAction(false);
      setEditingActionIndex(null);
      
      // Reset selectedRule to show updated actions
      setSelectedRule({
        triggerType: "",
        actions: updatedActions
      });
    }
  };

  const mockNumberFields: Array<{ id: string; name: string }> = [];

  return (
    <div className="card-button-select-action">
      {/* Display list of configured actions */}
      <ButtonActionsList
        selectedActions={selectedActions}
        onEditAction={handleEditAction}
        onRemoveAction={handleRemoveAction}
      />
      
      {/* Add Action button */}
      {!isAddingAction && (
        <div className="mb-4">
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={handleAddAction}
            block
            size="large"
          >
            Add Action
          </Button>
        </div>
      )}
      
      {/* Action configuration interface */}
      {isAddingAction && (
        <div className="mb-4 p-4 border border-gray-200 rounded">
          <div className="mb-3">
            <h4 className="text-lg font-medium">
              {editingActionIndex !== null ? 'Edit Action' : 'Add New Action'}
            </h4>
          </div>
          
          <SelectAction
             nextStep={handleSaveAction}
             prevStep={handleCancelAction}
             setSelectedRule={setSelectedRule}
             selectedRule={selectedRule}
             actionsData={actionsData}
             setActionsData={setActionsData}
             numberFields={mockNumberFields}
             isEditMode={editingActionIndex !== null}
           />
        </div>
      )}
    </div>
  );
}

export default CardButtonSelectAction;