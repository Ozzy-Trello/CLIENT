import React, { useState } from 'react';
import { Button, message } from 'antd';
import { InfoCircleOutlined, CloseOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { Rule, TriggerInstance, ActionInstance } from '@/app/dto/rules';
import TriggerSelector from './trigger_selector';
import ActionSelector from './action_selector';
import ReviewRule from './review_rule';

interface RuleBuilderProps {
  initialRule?: Rule;
  onSave?: (rule: Rule) => Promise<void>;  // Add this line
}

const RuleBuilder: React.FC<RuleBuilderProps> = ({ initialRule }) => {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1); // 1: Trigger, 2: Action, 3: Review
  const [messageApi, contextHolder] = message.useMessage();
  const [rule, setRule] = useState<Rule>(initialRule || {
    id: `rule-${Date.now()}`,
    triggers: [],
    actions: [],
    isActive: true
  });

  // Handle closing the page
  const handleClose = () => {
    router.back();
  };

  // Handle saving the rule
  const handleSave = () => {
    // Validate the rule
    if (rule.triggers.length === 0) {
      messageApi.error('You must select at least one trigger');
      return;
    }

    if (rule.actions.length === 0) {
      messageApi.error('You must select at least one action');
      return;
    }

    // Save the rule (in a real app, this would send to an API)
    console.log('Saving rule:', rule);
    messageApi.success('Rule saved successfully!');
    router.back();
  };

  // Handle next step
  const handleNextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  // Handle previous step
  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Add a trigger to the rule
  const handleAddTrigger = (trigger: TriggerInstance) => {
    setRule(prev => ({
      ...prev,
      triggers: [...prev.triggers, trigger]
    }));
  };

  // Remove a trigger from the rule
  const handleRemoveTrigger = (triggerId: string) => {
    setRule(prev => ({
      ...prev,
      triggers: prev.triggers.filter(t => t.id !== triggerId)
    }));
  };

  // Add an action to the rule
  const handleAddAction = (action: ActionInstance) => {
    setRule(prev => ({
      ...prev,
      actions: [...prev.actions, action]
    }));
  };

  // Remove an action from the rule
  const handleRemoveAction = (actionId: string) => {
    setRule(prev => ({
      ...prev,
      actions: prev.actions.filter(a => a.id !== actionId)
    }));
  };

  return (
    <>
      {contextHolder}
      <div className="flex flex-col h-full">
        {/* Page Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-gray-800">Create a Rule</h1>
            {/* <InfoCircleOutlined className="ml-2 text-gray-500" /> */}
          </div>
          <div className="flex space-x-4">
            {/* <Button onClick={() => window.open('https://example.com/video', '_blank')}>
              Watch video overview
            </Button> */}
            <Button onClick={currentStep === 3 ? handleSave : handleNextStep}>
              {currentStep === 3 ? 'Save' : 'Next'}
            </Button>
            <Button onClick={handleClose}>Cancel</Button>
          </div>
        </div>

        {/* Page Content */}
        <div className="p-6 flex-grow overflow-y-auto">
          {/* Progress Steps */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
              }`}>
                {currentStep > 1 ? '✓' : '1'}
              </div>
              <div className="mx-2 text-gray-700">Select trigger</div>
              <div className="mx-4 text-gray-400">
                <ArrowRightOutlined />
              </div>
            </div>

            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
              }`}>
                {currentStep > 2 ? '✓' : '2'}
              </div>
              <div className="mx-2 text-gray-700">Select action</div>
              <div className="mx-4 text-gray-400">
                <ArrowRightOutlined />
              </div>
            </div>

            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep === 3 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
              }`}>
                3
              </div>
              <div className="mx-2 text-gray-700">Review and save</div>
            </div>
          </div>

          {/* Step Content */}
          {currentStep === 1 && (
            <TriggerSelector 
              existingTriggers={rule.triggers}
              onAddTrigger={handleAddTrigger}
              onRemoveTrigger={handleRemoveTrigger}
              onNext={handleNextStep}
            />
          )}

          {currentStep === 2 && (
            <ActionSelector
              existingActions={rule.actions}
              existingTriggers={rule.triggers}
              onAddAction={handleAddAction}
              onRemoveAction={handleRemoveAction}
              onNext={handleNextStep}
              onBack={handlePrevStep}
            />
          )}

          {currentStep === 3 && (
            <ReviewRule
              rule={rule}
              onRemoveTrigger={handleRemoveTrigger}
              onRemoveAction={handleRemoveAction}
              onAddAction={() => setCurrentStep(2)}
              onSave={handleSave}
              onBack={handlePrevStep}
            />
          )}
        </div>
      </div>
    </>
  );
};

export default RuleBuilder;