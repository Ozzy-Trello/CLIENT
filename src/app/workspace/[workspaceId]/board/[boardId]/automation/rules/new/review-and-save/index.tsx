import { Button, Typography } from "antd";
import { Dispatch, SetStateAction } from "react";
import { Plus } from "lucide-react";
import { AutomationRule, GeneralOptions } from "@myTypes/type";

interface ReviewAndSaveProps {
  nextStep: () => void;
  prevStep: () => void;
  setSelectedRule: Dispatch<SetStateAction<AutomationRule>>;
  selectedRule: AutomationRule;
}

const ReviewAndSave: React.FC<ReviewAndSaveProps> = (props) => {
  const { selectedRule, prevStep, setSelectedRule } = props;
  
  const addAnotherAction = () => {
    // Create a new action with the default type
    const newAction = {
      type: "card_move" // Default action type
    };
    
    // Add the new action to the actions array
    setSelectedRule((prev: AutomationRule) => ({
      ...prev,
      actions: [...(prev.actions || []), newAction]
    }));
    
    // Go back to the action selection step
    prevStep();
  };
  
  // Function to render trigger details
  const renderTriggerDetails = () => {
    if (!selectedRule.triggerItem) {
      return <div>No trigger selected</div>;
    }
    
    return (
      <div className="mt-2 p-3 rounded bg-blue-50 border border-blue-200">
        <Typography.Text>{selectedRule.triggerItem.label}</Typography.Text>
        
        {/* Render dynamic properties */}
        {Object.entries(selectedRule.triggerItem)
          .filter(([key]) => key !== 'type' && key !== 'label' && key !== 'filter')
          .map(([key, value]) => {
            if (typeof value === 'object' && value !== null && 'label' in value) {
              return (
                <div key={key} className="ml-4 mt-1">
                  <Typography.Text type="secondary">
                    {key}: {(value as GeneralOptions).label}
                  </Typography.Text>
                </div>
              );
            }
            return null;
          })}
          
        {/* Render the filter property if it exists */}
        {selectedRule.triggerItem.filter && (
          <div className="ml-4 mt-1">
            <Typography.Text type="secondary">
              Filter: {selectedRule.triggerItem.filter.selectedItem?.label || selectedRule.triggerItem.filter.type}
            </Typography.Text>
          </div>
        )}
      </div>
    );
  };

  // Function to render action details
  const renderActionDetails = () => {
    if (!selectedRule.actions || selectedRule.actions.length === 0) {
      return <div>No actions selected</div>;
    }
    
    return selectedRule.actions.map((action, index) => {
      if (!action.selectedActionItem) {
        return (
          <div key={index} className="mt-2 p-3 mb-2 rounded bg-gray-100">
            Action not fully configured
          </div>
        );
      }
      
      return (
        <div key={index} className="mt-2 p-3 mb-2 rounded bg-green-50 border border-green-200">
          <Typography.Text>{action.selectedActionItem.label}</Typography.Text>
          
          {/* Render dynamic properties */}
          {Object.entries(action.selectedActionItem)
            .filter(([key]) => key !== 'type' && key !== 'label')
            .map(([key, value]) => {
              if (typeof value === 'object' && value !== null && 'label' in value) {
                return (
                  <div key={key} className="ml-4 mt-1">
                    <Typography.Text type="secondary">
                      {key}: {(value as GeneralOptions).label}
                    </Typography.Text>
                  </div>
                );
              }
              return null;
            })}
        </div>
      );
    });
  };
  
  return (
    <div className="w-full">
      <Typography.Title level={4}>Review Your Rule</Typography.Title>
      
      {/* Display the selected trigger */}
      <div className="mb-4">
        <Typography.Title level={5}>Trigger</Typography.Title>
        {renderTriggerDetails()}
      </div>
      
      {/* Display all selected actions */}
      <div className="mb-4">
        <Typography.Title level={5} className="mb-2">Actions</Typography.Title>
        {renderActionDetails()}
      </div>
      
      <div className="w-full flex justify-center mt-4">
        <Button size="small" icon={<Plus size={14} />} onClick={addAnotherAction}>
          Add another action
        </Button>
      </div>
    </div>
  );
};

export default ReviewAndSave;