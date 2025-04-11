import React from 'react';
import { TriggerType, TriggerTypeId } from '@/app/dto/rules';

interface TriggerTypeListProps {
  triggerTypes: TriggerType[];
  onSelectType: (typeId: TriggerTypeId) => void;
}

const TriggerTypeList: React.FC<TriggerTypeListProps> = ({ triggerTypes, onSelectType }) => {
  return (
    <div className="grid grid-cols-6 gap-4">
      {triggerTypes.map(type => (
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
  );
};

export default TriggerTypeList;