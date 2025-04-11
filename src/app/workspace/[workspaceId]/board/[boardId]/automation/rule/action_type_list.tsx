import React from 'react';
import { ActionType, ActionTypeId } from '@/app/dto/rules';

interface ActionTypeListProps {
  actionTypes: ActionType[];
  onSelectType: (typeId: ActionTypeId) => void;
}

const ActionTypeList: React.FC<ActionTypeListProps> = ({ actionTypes, onSelectType }) => {
  // Separate regular actions and integrations
  const regularActions = actionTypes.filter(type => !type.isIntegration);
  const integrations = actionTypes.filter(type => type.isIntegration);

  return (
    <div>
      <div className="grid grid-cols-6 gap-4 mb-6">
        {regularActions.map(type => (
          <div
            key={type.id}
            className="bg-gray-100 p-4 rounded text-center cursor-pointer hover:bg-gray-200"
            onClick={() => onSelectType(type.id)}
          >
            <div className="flex justify-center mb-2 text-xl">{type.icon}</div>
            <div className="text-sm text-gray-700">{type.name}</div>
          </div>
        ))}
      </div>

      {integrations.length > 0 && (
        <>
          <h3 className="text-lg font-medium mb-4">Integrations</h3>
          <div className="grid grid-cols-3 gap-4">
            {integrations.map(type => (
              <div
                key={type.id}
                className="bg-gray-100 p-4 rounded text-center cursor-pointer hover:bg-gray-200"
                onClick={() => onSelectType(type.id)}
              >
                <div className="flex justify-center mb-2 text-xl">{type.icon}</div>
                <div className="text-sm text-gray-700">{type.name}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ActionTypeList;