import React from 'react';
import { CloseOutlined, FilterOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { 
  TriggerInstance, TriggerTemplate, ComponentTypeId, 
  getTriggerTemplate, ComponentDefinition 
} from '@/app/dto/rules';
import UIComponentRenderer from './ui_component_renderer';

interface TriggerInstanceRendererProps {
  trigger?: TriggerInstance;
  template?: TriggerTemplate;
  values?: Record<string, any>;
  onRemove?: (() => void) | null;
  onUpdateValue?: (key: string, value: any) => void;
  isEditing?: boolean;
}

const TriggerInstanceRenderer: React.FC<TriggerInstanceRendererProps> = ({ 
  trigger, 
  template: propTemplate, 
  values: propValues, 
  onRemove,
  onUpdateValue,
  isEditing = false
}) => {
  // Use either the provided template or fetch it from the trigger
  const template = propTemplate || (trigger ? getTriggerTemplate(trigger.templateId) : null);
  
  // Use either the provided values or get them from the trigger
  const values = propValues || (trigger ? trigger.values : {});
  
  if (!template) return null;

  return (
    <div className="bg-gray-100 p-4 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap items-center">
          {template.components.map((component, index) => (
            <UIComponentRenderer
              key={`${component.id}-${index}`}
              component={component}
              value={values[component.valueKey || '']}
              onChange={onUpdateValue ? (value) => onUpdateValue(component.valueKey || '', value) : undefined}
              isEditing={isEditing}
            />
          ))}
        </div>
        {onRemove && (
          <Button 
            type="text" 
            icon={<CloseOutlined />} 
            onClick={onRemove}
          />
        )}
      </div>
      
      {!isEditing && template.explanationText && (
        <div className="mt-2 text-gray-600 text-sm">
          {template.explanationText}
        </div>
      )}
    </div>
  );
};

export default TriggerInstanceRenderer;