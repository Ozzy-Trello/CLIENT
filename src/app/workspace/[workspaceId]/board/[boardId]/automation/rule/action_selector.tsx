import React, { useState } from 'react';
import { Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { 
  ActionType, ActionTypeId, ActionInstance, TriggerInstance, 
  ActionTemplate, getActionTemplatesForType, 
  actionTypes, integrationActionTypes, formatTriggerDescription 
} from '@/app/dto/rules';
import ActionTypeList from './action_type_list';
import ActionTemplateList from './action_template_list';
import ActionInstanceRenderer from './action_instance_renderer';
import TriggerInstanceRenderer from './trigger_instance_renderer';

interface ActionSelectorProps {
  existingActions: ActionInstance[];
  existingTriggers: TriggerInstance[];
  onAddAction: (action: ActionInstance) => void;
  onRemoveAction: (actionId: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const ActionSelector: React.FC<ActionSelectorProps> = ({ 
  existingActions,
  existingTriggers,
  onAddAction,
  onRemoveAction,
  onNext,
  onBack
}) => {
  const [selectedActionType, setSelectedActionType] = useState<ActionTypeId | null>(null);
  const [currentTemplate, setCurrentTemplate] = useState<ActionTemplate | null>(null);
  const [currentValues, setCurrentValues] = useState<Record<string, any>>({});

  // Handle selecting an action type
  const handleSelectActionType = (typeId: ActionTypeId) => {
    setSelectedActionType(typeId);
    setCurrentTemplate(null);
    setCurrentValues({});
  };

  // Handle selecting a template
  const handleSelectTemplate = (template: ActionTemplate) => {
    setCurrentTemplate(template);
    // Initialize values with defaults
    const initialValues: Record<string, any> = {};
    template.components.forEach(component => {
      if (component.defaultValue !== undefined) {
        initialValues[component.valueKey || ''] = component.defaultValue;
      }
    });
    setCurrentValues(initialValues);
  };

  // Handle updating component values
  const handleUpdateValue = (key: string, value: any) => {
    setCurrentValues(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Handle adding a new action
  const handleAddAction = () => {
    if (!currentTemplate) return;
    
    const newAction: ActionInstance = {
      id: `action-${Date.now()}`,
      templateId: currentTemplate.id,
      values: { ...currentValues }
    };
    
    onAddAction(newAction);
    // Reset for next action
    setCurrentTemplate(null);
    setCurrentValues({});
  };

  // If no action type is selected, show the action type list
  if (!selectedActionType) {
    return (
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-6">Select Action</h2>
        
        {/* Trigger Summary */}
        {existingTriggers.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-2">Trigger</h3>
            {existingTriggers.map(trigger => (
              <div key={trigger.id} className="mb-2">
                <TriggerInstanceRenderer
                  trigger={trigger}
                  onRemove={null} // Read-only in this view
                />
              </div>
            ))}
          </div>
        )}
        
        <ActionTypeList 
          actionTypes={[...actionTypes, ...integrationActionTypes]}
          onSelectType={handleSelectActionType}
        />
        
        {existingActions.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-4">Selected Actions</h3>
            {existingActions.map(action => (
              <div key={action.id} className="mb-4">
                <ActionInstanceRenderer
                  action={action}
                  onRemove={() => onRemoveAction(action.id)}
                />
              </div>
            ))}
          </div>
        )}
        
        <div className="flex justify-between mt-6">
          <Button onClick={onBack}>
            Back
          </Button>
          
          {existingActions.length > 0 && (
            <Button type="primary" onClick={onNext}>
              Next
            </Button>
          )}
        </div>
      </div>
    );
  }

  // If an action type is selected but no template, show the template list
  if (!currentTemplate) {
    const templates = getActionTemplatesForType(selectedActionType);
    
    return (
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-6">
          Select {actionTypes.find(a => a.id === selectedActionType)?.name} Action
        </h2>
        
        <Button 
          onClick={() => setSelectedActionType(null)} 
          className="mb-4"
        >
          Back to Action Types
        </Button>
        
        <ActionTemplateList
          templates={templates}
          onSelectTemplate={handleSelectTemplate}
        />
        
        {existingActions.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-4">Selected Actions</h3>
            {existingActions.map(action => (
              <div key={action.id} className="mb-4">
                <ActionInstanceRenderer
                  action={action}
                  onRemove={() => onRemoveAction(action.id)}
                />
              </div>
            ))}
          </div>
        )}
        
        <div className="flex justify-between mt-6">
          <Button onClick={() => setSelectedActionType(null)}>
            Back
          </Button>
          
          {existingActions.length > 0 && (
            <Button type="primary" onClick={onNext}>
              Next
            </Button>
          )}
        </div>
      </div>
    );
  }

  // If a template is selected, show the form to configure it
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-6">
        Configure Action
      </h2>
      
      <Button 
        onClick={() => setCurrentTemplate(null)} 
        className="mb-4"
      >
        Back to Templates
      </Button>
      
      <div className="bg-gray-100 p-4 rounded-lg mb-4">
        <div className="flex items-center">
          <div className="flex-grow">
            <ActionInstanceRenderer
              template={currentTemplate}
              values={currentValues}
              onUpdateValue={handleUpdateValue}
              isEditing={true}
            />
          </div>
          <div>
            <Button 
              type="primary" 
              shape="circle" 
              icon={<PlusOutlined />} 
              size="small"
              onClick={handleAddAction}
            />
          </div>
        </div>
        
        {currentTemplate.explanationText && (
          <div className="mt-2 text-gray-600">
            {currentTemplate.explanationText}
          </div>
        )}
      </div>
      
      {existingActions.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-4">Selected Actions</h3>
          {existingActions.map(action => (
            <div key={action.id} className="mb-4">
              <ActionInstanceRenderer
                action={action}
                onRemove={() => onRemoveAction(action.id)}
              />
            </div>
          ))}
        </div>
      )}
      
      <div className="flex justify-between mt-6">
        <Button onClick={() => setCurrentTemplate(null)}>
          Back
        </Button>
        
        {existingActions.length > 0 && (
          <Button type="primary" onClick={onNext}>
            Next
          </Button>
        )}
      </div>
    </div>
  );
};

export default ActionSelector;