import { Button, Input, Select, message } from "antd";
import { useParams } from "next/navigation";
import { CustomField, Trigger, TriggerAction } from "@/app/dto/types";
import { useState, useEffect, useRef } from "react";
import { ListSelection, SelectionRef, UserSelection } from "../selection";
import { useCardCustomField } from "@/app/hooks/card_custom_field";
import { useCardDetailContext } from "@/app/provider/card-detail-context";
import { useTriggers } from "@/app/hooks/trigger";

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
  const { createTrigger } = useTriggers();
  const userSelectionRefs = useRef<SelectionRef>(null);
  
  // Initialize with existing trigger data or defaults
  const [triggerState, setTriggerState] = useState<Trigger>({
    name: selectedCustomField?.trigger?.name || "move",
    conditionValue: selectedCustomField?.trigger?.conditionValue || "",
    action: {
      targetListId: selectedCustomField?.trigger?.action?.targetListId || "",
      messageTelegram: selectedCustomField?.trigger?.action?.messageTelegram || "",
      labelCardId: selectedCustomField?.trigger?.action?.labelCardId || ""
    } as TriggerAction
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

    console.log("triggerState: %o", triggerState);

    if (!triggerState?.conditionValue) {
      messageApi.error("Please enter a condition value");
      return;
    }

    // Update the target list ID from the selection component
    const updatedTrigger: Partial<Trigger> = {
      name: triggerState.name,
      workspaceId: Array.isArray(workspaceId) ? workspaceId[0] : workspaceId,
      conditionValue: listSelectionRef.current?.getValue(),
      action: {
        targetListId: listId,
        messageTelegram: triggerState.action?.messageTelegram || "",
      }
    };

    createTrigger({ trigger: updatedTrigger });

    // Update the selected custom field with the new trigger
    // setSelectedCustomField((prev: CustomField) => ({
    //   ...prev,
    //   trigger: updatedTrigger
    // }));

    // if (selectedCard) {
    //   addCustomField({value: triggerState, customFieldId: selectedCustomField.id, cardId: selectedCard?.id})
    // }

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
      conditionvalue: e.target.value
    }));
  };

  const handleListChange = (value: string) => {
    setTriggerState(prev => ({
      ...prev,
      action: {
        targetListId: value,
        messageTelegram: prev.action?.messageTelegram ?? "",
        labelCardId: prev.action?.labelCardId ?? ""
      }
    }));
  };

  const handleConditionValueUserChange = (value: any) => {
    setTriggerState(prev => ({
      ...prev,
      conditionValue: value
    }));
  }

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
              <span>Condition Value</span>
              <UserSelection 
                ref={userSelectionRefs}
                value={triggerState?.conditionValue || userSelectionRefs.current?.getValue()}
                onChange={(value) => handleConditionValueUserChange(value)}
                placeholder={`Select user`}
                size="middle"
                className="w-full"
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