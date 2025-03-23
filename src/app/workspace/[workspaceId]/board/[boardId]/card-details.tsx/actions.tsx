import React, { useRef, useState } from 'react';
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
  Plus,
  Copy,
  Archive,
  Share2,
  RectangleEllipsis
} from 'lucide-react';
import PopoverCustomField from '@/app/components/popover-custom-field';
import PopoverUser from '@/app/components/popover-user';

const Actions: React.FC = ({ }) => {

  const [openCustomField, setOpenCustomField] = useState(false);
  const [openMembers, setOpenMembers] = useState(false);

  const menuItems = [
    { icon: <Users size={14} />, label: 'Join' },
    { icon: <Tag size={14} />, label: 'Labels' },
    { icon: <CheckSquare size={14} />, label: 'Checklist' },
    { icon: <Clock size={14} />, label: 'Dates' },
    { icon: <Paperclip size={14} />, label: 'Attachment' },
    { icon: <MapPin size={14} />, label: 'Location' },
  ];

  return (
    <div className="w-full rounded-lg">
      {/* Menu Items */}
      {menuItems.map((item, index) => (
        <button
          key={index}
          className="text-xs flex items-center gap-3 w-full text-left py-2 px-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors mb-1 text-gray-700"
        >
          <span className="text-gray-600 text-xs">{item.icon}</span>
          <span className="text-xs">{item.label}</span>
        </button>
      ))}

      <PopoverUser 
        open={openMembers} 
        setOpen={setOpenMembers}
        triggerEl={
          <button
            className="text-xs flex items-center gap-3 w-full text-left py-2 px-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors mb-1 text-gray-700"
          >
            <span className="text-gray-600 text-xs"><Users size={14} /></span>
            <span className="text-xs">Members</span>
          </button>
        }
      />

      <PopoverCustomField 
        open={openCustomField} 
        setOpen={setOpenCustomField}
        triggerEl={
          <button
            className="text-xs flex items-center gap-3 w-full text-left py-2 px-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors mb-1 text-gray-700"
          >
            <span className="text-gray-600 text-xs"><RectangleEllipsis size={14} /></span>
            <span className="text-xs">Custom fields</span>
          </button>
        }
      />

      {/* Power-Ups Section */}
      <div className="mt-4 mb-2">
        <h3 className="text-sm font-medium text-gray-600 px-4 mb-2">Power-Ups</h3>
        <button
          className="text-xs flex items-center gap-3 w-full text-left py-2 px-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors mb-1 text-gray-700"
          >
          <Plus size={14} />
          <span className="text-xs">Add Power-Ups</span>
        </button>
      </div>

      {/* Automation Section */}
      <div className="mt-4 mb-2 flex items-center justify-between px-4">
        <h3 className="text-sm font-medium text-gray-600">Automation</h3>
        <InfoCircle size={14} className="text-gray-500" />
      </div>
      <button
        className="text-xs flex items-center gap-3 w-full text-left py-2 px-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors mb-1 text-gray-700"
      >
        <Plus size={14} />
        <span className="text-xs">Add button</span>
      </button>

      {/* Actions Section */}
      <div className="mt-4 mb-2">
        <h3 className="text-sm font-medium text-gray-600 px-4 mb-2">Actions</h3>
        <button
          className="text-xs flex items-center gap-3 w-full text-left py-2 px-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors mb-1 text-gray-700"
        >
          <MoveRight size={14} />
          <span className="text-xs">Move</span>
        </button>

        <button
          className="text-xs flex items-center gap-3 w-full text-left py-2 px-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors mb-1 text-gray-700"
        >
          <Copy size={14} />
          <span className="text-xs">Copy</span>
        </button>

        <button
          className="text-xs flex items-center gap-3 w-full text-left py-2 px-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors mb-1 text-gray-700"
        >
          <Archive size={14} />
          <span className="text-xs">Archive</span>
        </button>

        <button
          className="text-xs flex items-center gap-3 w-full text-left py-2 px-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors mb-1 text-gray-700"
        >
          <Share2 size={14} />
          <span className="text-xs">Share</span>
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

export default Actions;