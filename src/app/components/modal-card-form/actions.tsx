import React from 'react';
import { 
  Users, 
  Tag, 
  CheckSquare, 
  Clock, 
  Paperclip, 
  MapPin, 
  Database,
  PlusCircle,
  MoveRight,
  Plus
} from 'lucide-react';

const ActionSections: React.FC = ({ }) => {
  const menuItems = [
    { icon: <Users size={14} />, label: 'Join' },
    { icon: <Users size={14} />, label: 'Members' },
    { icon: <Tag size={14} />, label: 'Labels' },
    { icon: <CheckSquare size={14} />, label: 'Checklist' },
    { icon: <Clock size={14} />, label: 'Dates' },
    { icon: <Paperclip size={14} />, label: 'Attachment' },
    { icon: <MapPin size={14} />, label: 'Location' },
    { icon: <Database size={1} />, label: 'Custom Fields' },
  ];

  return (
    <div className="w-64  p-1 rounded-lg">
      {/* Menu Items */}
      {menuItems.map((item, index) => (
        <button
          key={index}
          className="flex items-center gap-3 w-full text-left py-3 px-4 bg-gray-150 hover:bg-gray-200 rounded-md transition-colors mb-1 text-gray-700"
        >
          <span className="text-gray-600">{item.icon}</span>
          <span className="font-medium">{item.label}</span>
        </button>
      ))}

      {/* Power-Ups Section */}
      <div className="mt-4 mb-2">
        <h3 className="text-sm font-medium text-gray-600 px-4 mb-2">Power-Ups</h3>
        <button
          className="flex items-center gap-3 w-full text-left py-2 px-4 hover:bg-gray-200 rounded-md transition-colors text-gray-700"
        >
          <Plus size={18} />
          <span className="font-medium">Add Power-Ups</span>
        </button>
      </div>

      {/* Automation Section */}
      <div className="mt-4 mb-2 flex items-center justify-between px-4">
        <h3 className="text-sm font-medium text-gray-600">Automation</h3>
        <InfoCircle size={16} className="text-gray-500" />
      </div>
      <button
        className="flex items-center gap-3 w-full text-left py-2 px-4 hover:bg-gray-200 rounded-md transition-colors text-gray-700"
      >
        <Plus size={18} />
        <span className="font-medium">Add button</span>
      </button>

      {/* Actions Section */}
      <div className="mt-4 mb-2">
        <h3 className="text-sm font-medium text-gray-600 px-4 mb-2">Actions</h3>
        <button
          className="flex items-center gap-3 w-full text-left py-3 px-4 hover:bg-gray-200 rounded-md transition-colors text-gray-700"
        >
          <MoveRight size={18} />
          <span className="font-medium">Move</span>
        </button>
      </div>
    </div>
  );
};

const InfoCircle = ({ size = 24, className = "" }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="16" x2="12" y2="12"></line>
      <line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>
  );
};

export default ActionSections;