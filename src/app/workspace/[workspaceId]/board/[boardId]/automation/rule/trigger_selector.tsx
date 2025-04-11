import React, { useState } from 'react';
import { Button } from 'antd';
import { PlusOutlined, FilterOutlined } from '@ant-design/icons';
import { TriggerType, TriggerTypeId, TriggerInstance, TriggerTemplate, getTriggerTemplatesForType, triggerTypes } from '@/app/dto/rules';
import TriggerTypeList from './trigger_type_list';
import TriggerTemplateList from './trigger_template';
import TriggerInstanceRenderer from './trigger_instance_renderer';

interface TriggerSelectorProps {
  existingTriggers: TriggerInstance[];
  onAddTrigger: (trigger: TriggerInstance) => void;
  onRemoveTrigger: (triggerId: string) => void;
  onNext: () => void;
}

const TriggerSelector: React.FC<TriggerSelectorProps> = ({ 
  existingTriggers, 
  onAddTrigger, 
  onRemoveTrigger, 
  onNext 
}) => {
  const [selectedTriggerType, setSelectedTriggerType] = useState<TriggerTypeId | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<TriggerTemplate | null>(null);
  const [currentValues, setCurrentValues] = useState<Record<string, any>>({});

  // Handle selecting a trigger type
  const handleSelectTriggerType = (typeId: TriggerTypeId) => {
    setSelectedTriggerType(typeId);
    setCurrentTemplate(null);
    setCurrentValues({});
  };

  // Handle selecting a template
  const handleSelectTemplate = (template: TriggerTemplate) => {
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

  // Handle adding a new trigger
  const handleAddTrigger = () => {
    if (!currentTemplate) return;
    
    const newTrigger: TriggerInstance = {
      id: `trigger-${Date.now()}`,
      templateId: currentTemplate.id,
      values: { ...currentValues }
    };
    
    onAddTrigger(newTrigger);
    // Reset for next trigger
    setCurrentTemplate(null);
    setCurrentValues({});
  };

  // If no trigger type is selected, show the trigger type list
  if (!selectedTriggerType) {
    return (
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-6">Select Trigger</h2>
        
        <div className="flex justify-end mb-4">
          {/* <Button
            type={showAdvanced ? "primary" : "default"}
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            Advanced
          </Button> */}
        </div>
        
        <TriggerTypeList 
          triggerTypes={triggerTypes}
          onSelectType={handleSelectTriggerType}
        />
        
        {existingTriggers.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-4">Selected Triggers</h3>
            {existingTriggers.map(trigger => (
              <div key={trigger.id} className="mb-4">
                <TriggerInstanceRenderer
                  trigger={trigger}
                  onRemove={() => onRemoveTrigger(trigger.id)}
                />
              </div>
            ))}
            
            <div className="flex justify-end mt-4">
              <Button type="primary" onClick={onNext}>
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // If a trigger type is selected but no template, show the template list
  if (!currentTemplate) {
    const templates = getTriggerTemplatesForType(selectedTriggerType);
    
    return (
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-6">
          Select {triggerTypes.find(t => t.id === selectedTriggerType)?.name} Trigger
        </h2>
        
        <Button 
          onClick={() => setSelectedTriggerType(null)} 
          className="mb-4"
        >
          Back to Trigger Types
        </Button>
        
        <TriggerTemplateList
          templates={templates}
          onSelectTemplate={handleSelectTemplate}
        />
        
        {existingTriggers.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-4">Selected Triggers</h3>
            {existingTriggers.map(trigger => (
              <div key={trigger.id} className="mb-4">
                <TriggerInstanceRenderer
                  trigger={trigger}
                  onRemove={() => onRemoveTrigger(trigger.id)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // If a template is selected, show the form to configure it
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-6">
        Configure Trigger
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
            <TriggerInstanceRenderer
              template={currentTemplate}
              values={currentValues}
              onUpdateValue={handleUpdateValue}
              isEditing={true}
            />
          </div>
          <div className="flex items-center">
            <Button type="text" icon={<FilterOutlined />} />
            <Button 
              type="primary" 
              shape="circle" 
              icon={<PlusOutlined />} 
              size="small"
              className="ml-2" 
              onClick={handleAddTrigger}
            />
          </div>
        </div>
        
        {currentTemplate.explanationText && (
          <div className="mt-2 text-gray-600">
            {currentTemplate.explanationText}
          </div>
        )}
        
        {currentTemplate.noteText && (
          <div className="mt-2 text-gray-600">
            <strong>Note:</strong> {currentTemplate.noteText}
          </div>
        )}
      </div>
      
      {existingTriggers.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-4">Selected Triggers</h3>
          {existingTriggers.map(trigger => (
            <div key={trigger.id} className="mb-4">
              <TriggerInstanceRenderer
                trigger={trigger}
                onRemove={() => onRemoveTrigger(trigger.id)}
              />
            </div>
          ))}
          
          <div className="flex justify-end mt-4">
            <Button type="primary" onClick={onNext}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TriggerSelector;