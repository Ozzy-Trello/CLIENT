import React from 'react';
import { Button } from 'antd';
import { PlusOutlined, CloseOutlined } from '@ant-design/icons';
import { Rule } from '@/app/dto/rules';
import TriggerInstanceRenderer from './trigger_instance_renderer';
import ActionInstanceRenderer from './action_instance_renderer';

interface ReviewRuleProps {
  rule: Rule;
  onRemoveTrigger: (triggerId: string) => void;
  onRemoveAction: (actionId: string) => void;
  onAddAction: () => void;
  onSave: () => void;
  onBack: () => void;
}

const ReviewRule: React.FC<ReviewRuleProps> = ({ 
  rule, 
  onRemoveTrigger, 
  onRemoveAction, 
  onAddAction, 
  onSave, 
  onBack 
}) => {
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-6">Review and Save</h2>
      
      {/* Trigger Summary */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-2">Trigger</h3>
        {rule.triggers.map(trigger => (
          <div key={trigger.id} className="mb-4">
            <TriggerInstanceRenderer
              trigger={trigger}
              onRemove={() => onRemoveTrigger(trigger.id)}
            />
          </div>
        ))}
      </div>
      
      {/* Action Summary */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-2">Action</h3>
        {rule.actions.map(action => (
          <div key={action.id} className="mb-4">
            <ActionInstanceRenderer
              action={action}
              onRemove={() => onRemoveAction(action.id)}
            />
          </div>
        ))}
      </div>
      
      <div className="mt-4">
        <Button 
          type="link"
          className="flex items-center"
          icon={<PlusOutlined />}
          onClick={onAddAction}
        >
          Add another action
        </Button>
      </div>
      
      <div className="flex justify-between mt-8">
        <Button onClick={onBack}>
          Back
        </Button>
        <Button 
          type="primary" 
          onClick={onSave}
        >
          Save Rule
        </Button>
      </div>
    </div>
  );
};

export default ReviewRule;