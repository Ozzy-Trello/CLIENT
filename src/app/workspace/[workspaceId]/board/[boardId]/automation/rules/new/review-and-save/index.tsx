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
  
  return (
    <div className="w-full">
      <div className="w-full flex justify-center mt-4">
        <Button size="small" icon={<Plus size={14} />} onClick={addAnotherAction}>
          Add another action
        </Button>
      </div>
    </div>
  );
};

export default ReviewAndSave;