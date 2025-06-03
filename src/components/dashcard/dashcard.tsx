// src/components/dashcard/Dashcard.tsx

import React, { useState, useEffect } from "react";
import { Card, Typography, Tooltip } from "antd";
import { 
  Trello,
  ListTodo, 
  User, 
  Calendar, 
  Tag, 
  CheckCircle, 
  X, 
  Edit,
  Trash2, 
  MoreHorizontal 
} from "lucide-react";
import { DashcardConfig, EnumCardAttributeType, DashcardFilter } from "@myTypes/dashcard";

const { Title, Text } = Typography;

interface DashcardProps {
  config: DashcardConfig;
  count: number;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onClick?: (id: string) => void;
}

// Map card attribute types to their corresponding icons
const attributeIcons: Record<EnumCardAttributeType, React.ReactNode> = {
  [EnumCardAttributeType.BOARD]: <Trello size={16} />,
  [EnumCardAttributeType.LIST]: <ListTodo size={16} />,
  [EnumCardAttributeType.ASSIGNED]: <User size={16} />,
  [EnumCardAttributeType.DUE_DATE]: <Calendar size={16} />,
  [EnumCardAttributeType.LABELS]: <Tag size={16} />,
  [EnumCardAttributeType.IS_COMPLETED]: <CheckCircle size={16} />,
  [EnumCardAttributeType.CREATED_AT]: <Calendar size={16} />,
  [EnumCardAttributeType.LAST_MODIFIED]: <Calendar size={16} />,
  [EnumCardAttributeType.START_DATE]: <Calendar size={16} />,
  [EnumCardAttributeType.CUSTOM_FIELD]: <Edit size={16} />
};

const Dashcard: React.FC<DashcardProps> = ({ 
  config, 
  count, 
  onEdit, 
  onDelete,
  onClick 
}) => {
  const [showActions, setShowActions] = useState(false);
  const { id, name, backgroundColor, filters } = config;
  
  // Calculate text color based on background brightness
  const getTextColor = (bgColor: string) => {
    // Convert hex to RGB
    const hex = bgColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    // Calculate brightness (YIQ equation)
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    
    // Use white text for dark backgrounds and black text for light backgrounds
    return brightness > 128 ? '#000000' : '#FFFFFF';
  };
  
  const textColor = getTextColor(backgroundColor);
  
  // Format the filter value for display
  const formatFilterValue = (filter: DashcardFilter) => {
    if (filter.value === null || filter.value === undefined) {
      return 'Not set';
    }
    
    if (typeof filter.value === 'boolean') {
      return filter.value ? 'Yes' : 'No';
    }
    
    if (Array.isArray(filter.value)) {
      return filter.value.length > 0 
        ? `${filter.value.length} selected` 
        : 'None';
    }
    
    return filter.value;
  };

  return (
    <Card
      className="dashcard transition-all hover:shadow-md cursor-pointer"
      style={{ borderRadius: '8px', overflow: 'hidden', borderColor: 'transparent' }}
      bodyStyle={{ padding: 0 }}
      onClick={() => onClick?.(id)}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Header with count and card name */}
      <div 
        className="dashcard-header p-4 flex flex-col items-center justify-center h-[180px] relative"
        style={{ backgroundColor, color: textColor }}
      >
        <div className="text-6xl font-bold">{count}</div>
        <div className="text-xl mt-2">{name}</div>
        
        {/* Action buttons */}
        {showActions && (
          <div className="absolute top-2 right-2 flex gap-1">
            <Tooltip title="Edit">
              <button 
                className="p-1 rounded-full bg-black/20 hover:bg-black/30"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.(id);
                }}
              >
                <Edit size={14} color={textColor} />
              </button>
            </Tooltip>
            <Tooltip title="Delete">
              <button 
                className="p-1 rounded-full bg-black/20 hover:bg-black/30"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.(id);
                }}
              >
                <Trash2 size={14} color={textColor} />
              </button>
            </Tooltip>
          </div>
        )}
      </div>
      
      {/* Filter criteria */}
      <div className="dashcard-filters p-3">
        <Text strong className="text-sm text-gray-500 mb-2 block">
          Filter criteria
        </Text>
        
        <div className="space-y-2">
          {filters.map((filter) => (
            <div 
              key={filter.id} 
              className="flex items-center text-sm py-1 border-b border-gray-100 last:border-b-0"
            >
              <span className="mr-2 text-gray-500">
                {filter.icon || attributeIcons[filter.type] || null}
              </span>
              <span className="flex-1 truncate">
                <Text className="text-gray-700">{filter.label}</Text>
                <Text className="text-gray-400 ml-1">
                  {filter.operator && `(${filter.operator})`}
                </Text>
              </span>
              <span className="text-gray-500 font-medium">
                {formatFilterValue(filter)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

export default Dashcard;