"use client";
import { Button, Steps, Typography } from "antd";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import SelecTrigger from "./select-trigger";
import SelectAction from "./select-action";
import { triggers } from "../../../../../../../constants/automation-rule/data";
import ReviewAndSave from "./review-and-save";
import RuleState from "./rule-state";
import { AutomationRule } from "@/app/types/type";


const StepsItem = [
  {
    title: 'Select trigger',
  },
  {
    title: 'Select action',
  },
  {
    title: 'Review and save',
  },
];

const NewRulePage: React.FC = () => {
  const router = useRouter();
  const { workspaceId, boardId } = useParams();
  const [ activeStep, setActiveStep ] = useState<number>(0);
  const [ selectedRule, setSelectedRule ] = useState<AutomationRule>({
    triggerType: triggers[0].type,
    actions: []
  });
  
  const onCancel = () => {
    router.push(`/workspace/${workspaceId}/board/${boardId}/automation/rules`);
  }

  const nextStep = () => {
    setActiveStep(activeStep + 1);
  }

  const prevStep = () => {
    setActiveStep(activeStep - 1);
  }

  const goToSpecificStep = (step: number) => {
    setActiveStep(step);
  }
  
  return (
    <div className="min-h-screen">
      <div className='flex justify-between items-center pb-4 border-b border-gray-200 mb-8'>
        <div className="flex items-center gap-2">
          <Typography.Title level={3} style={{ margin: 0 }}>Create a Rule</Typography.Title>
        </div>
        <div className="flex items-center gap-3">
          <Button type="default">Save</Button>
          <Button type="primary" onClick={onCancel}>Cancel</Button>
        </div>
      </div>
      
      <div className="pb-4 mb-4 border-b border-gray-200 flex justify-center">
        <Steps
          style={{maxWidth: "650px"}}
          size="small"
          current={activeStep}
          items={StepsItem}
        />
      </div>

      { activeStep !== 0 && (
        <RuleState selectedRule={selectedRule} setSelectedRule={setSelectedRule} goToSpecificStep={goToSpecificStep} activeStep={activeStep}/>
      )}

      <div className="step-content">
        {activeStep === 0 ? (
          <SelecTrigger nextStep={nextStep} prevStep={prevStep} selectedRule={selectedRule} setSelectedRule={setSelectedRule}/>
        ) : activeStep === 1 ? ( 
          <SelectAction nextStep={nextStep} prevStep={prevStep} selectedRule={selectedRule} setSelectedRule={setSelectedRule} />
        ) : activeStep === 2 ? (
          <ReviewAndSave nextStep={nextStep} prevStep={prevStep} selectedRule={selectedRule} setSelectedRule={setSelectedRule} />
        ) : null}
      </div>
    </div>
  )
}

export default NewRulePage;