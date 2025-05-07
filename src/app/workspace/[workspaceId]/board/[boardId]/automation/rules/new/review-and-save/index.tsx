import { Button } from "antd";
import { Dispatch, SetStateAction } from "react";
import { Plus } from "lucide-react";
import { AutomationRule } from "@/app/types/type";

interface ReviewAndSaveProps {
  nextStep: () => void;
  prevStep: () => void;
  setSelectedRule: Dispatch<SetStateAction<AutomationRule>>;
  selectedRule: AutomationRule;
}

const ReviewAndSave: React.FC<ReviewAndSaveProps> = (props) => {

  const { selectedRule, prevStep } = props;
  console.log("ReviewAndSave: selectedRule: %o", selectedRule);
  return (
    <div className="w-full">
      <div className="w-full flex justify-center mt-4">
        <Button size="small" icon={<Plus size={14} />} onClick={prevStep}>Add another action</Button>
      </div>
    </div>
  )
}

export default ReviewAndSave;