import React from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { TriggerTemplate } from '@/app/dto/rules';

interface TriggerTemplateListProps {
  templates: TriggerTemplate[];
  onSelectTemplate: (template: TriggerTemplate) => void;
}

const TriggerTemplateList: React.FC<TriggerTemplateListProps> = ({ templates, onSelectTemplate }) => {
  return (
    <div>
      {templates.map(template => (
        <div 
          key={template.id}
          className="bg-gray-100 p-4 rounded-lg mb-4 cursor-pointer hover:bg-gray-200"
          onClick={() => onSelectTemplate(template)}
        >
          <div className="flex items-center justify-between">
            <div className="text-gray-700">{template.description}</div>
            <div>
              <PlusOutlined className="text-blue-500" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TriggerTemplateList;