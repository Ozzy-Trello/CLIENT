import { Button, Input, Select, message } from "antd";
import { ChevronRight, GripVertical, Plus } from "lucide-react";
import { useParams } from "next/navigation";
import { DragDropContext, Draggable, Droppable, DropResult } from "@hello-pangea/dnd";
import { CustomField, Trigger, TriggerAction } from "@/app/dto/types";
import SkeletonInput from "antd/es/skeleton/Input";
import { useState, useEffect, useRef } from "react";
import { ListSelection, SelectionRef } from "../selection";
import { useCardCustomField } from "@/app/hooks/card_custom_field";
import { useCardDetailContext } from "@/app/provider/card-detail-context";

interface TriggerProps {
  popoverPage: string;
  setPopoverPage: any;
  selectedCustomField: CustomField | undefined;
  setSelectedCustomField: any;
}

const TriggerContent: React.FC<TriggerProps> = (props) => {
  const { workspaceId, boardId } = useParams();
  const { selectedCard } = useCardDetailContext();
  const {
    popoverPage,
    setPopoverPage,
    selectedCustomField,
    setSelectedCustomField,
  } = props;

  const [messageApi, contextHolder] = message.useMessage();
  const listSelectionRef = useRef<SelectionRef>(null);
  const [loading, setLoading] = useState(false);
  const { addCustomField } = useCardCustomField(selectedCard?.id || '');
  
  // Initialize with existing trigger data or defaults
  const [triggerState, setTriggerState] = useState<{
    name: string;
    conditionalValue: string;
    condition: string;
    action: {
      targetListId: string;
      message: string;
      labelCard: string;
    }
  }>({
    name: selectedCustomField?.trigger?.name || "move",
    conditionalValue: selectedCustomField?.trigger?.conditionalValue || "",
    condition: "equals", // Default condition
    action: {
      targetListId: selectedCustomField?.trigger?.action?.targetListId || "",
      message: selectedCustomField?.trigger?.action?.message || "",
      labelCard: selectedCustomField?.trigger?.action?.labelCard || ""
    }
  });

  // Initialize list selection if we have a saved value
  useEffect(() => {
    if (listSelectionRef.current && selectedCustomField?.trigger?.action?.targetListId) {
      listSelectionRef.current.setValue(selectedCustomField.trigger.action.targetListId);
    }
  }, [selectedCustomField, listSelectionRef.current]);

  const handleCancel = () => {
    setPopoverPage("home");
  };

  const handleSave = () => {
    if (!selectedCustomField) {
      messageApi.error("No custom field selected");
      return;
    }

    // Validate required fields
    const listId = listSelectionRef.current?.getValue();
    if (!listId) {
      messageApi.error("Please select a target list");
      return;
    }

    if (!triggerState?.conditionalValue) {
      messageApi.error("Please enter a condition value");
      return;
    }

    // Update the target list ID from the selection component
    const updatedTrigger: Trigger = {
      name: triggerState.name,
      conditionalValue: triggerState.conditionalValue,
      action: {
        targetListId: listId,
        message: triggerState.action.message,
        labelCard: listId
      }
    };

    console.log("updatedTrigger: %o", updatedTrigger);

    // Update the selected custom field with the new trigger
    setSelectedCustomField((prev: CustomField) => ({
      ...prev,
      trigger: updatedTrigger
    }));

    if (selectedCard) {
      addCustomField({value: triggerState, customFieldId: selectedCustomField.id, cardId: selectedCard?.id})
    }

    // // Show success message
    // messageApi.success("Trigger settings saved");

    // // Return to the previous screen
    // setPopoverPage("home");
  };

  const handleNameChange = (value: string) => {
    setTriggerState(prev => ({
      ...prev,
      name: value
    }));
  };

  const handleConditionChange = (value: string) => {
    setTriggerState(prev => ({
      ...prev,
      condition: value
    }));
  };

  const handleConditionValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTriggerState(prev => ({
      ...prev,
      conditionValue: e.target.value
    }));
  };

  const handleListChange = (value: string) => {
    setTriggerState(prev => ({
      ...prev,
      action: {
        ...prev.action,
        targetListId: value
      }
    }));
  };

  return (
    <>
      {contextHolder}
      <div className="h-fit">
        <div className="max-h-60 overflow-y-auto px-2">
          {/* Action Field */}
          <div className="mb-3 text-xs">
            <label htmlFor="trigger-action" className="block mb-1.5 font-medium text-gray-600">
              Action
            </label>
            <Select
              id="trigger-action"
              className="w-full"
              value={triggerState.name}
              onChange={handleNameChange}
              options={[
                {value: "move", label: "Move"},
                {value: "copy", label: "Copy"},
              ]}
              disabled={loading}
            />
          </div>
          
          {/* Target List Field */}
          <div className="mb-3 text-xs">
            <label htmlFor="target-list" className="block mb-1.5 font-medium text-gray-600">
              Target List
            </label>
            <ListSelection 
              ref={listSelectionRef} 
              onChange={handleListChange}
            />
          </div>
        
          <div className="mb-3 text-xs">
            <label htmlFor="target-list" className="block mb-1.5 font-medium text-gray-600">
              Trigger Condition
            </label>
            <div className="mt-2 flex items-center gap-2">
              <span>$field_value</span>
              <Select
                size="small"
                options={[
                  {value: "has_value", label: "Has value"},
                  {value: "contains", label: "Contains"},
                  {value: "equals", label: "="},
                ]}
                value={triggerState.condition}
                onChange={handleConditionChange}
                disabled={loading}
              />
              <Input
                size="small"
                className="min-w-2"
                value={triggerState.conditionalValue}
                onChange={handleConditionValueChange}
                placeholder="Enter value"
                disabled={loading}
              />
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-2 justify-end items-center mt-4 pt-3 border-t border-gray-100">
          <Button
            size="small"
            onClick={handleCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="primary"
            size="small"
            onClick={handleSave}
            loading={loading}
          >
            Save
          </Button>
        </div>
      </div>
    </>
  );
};

export default TriggerContent;