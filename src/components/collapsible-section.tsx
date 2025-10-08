import React, { useState, ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Typography } from "antd";

interface CollapsibleSectionProps {
  title: string;
  children: ReactNode;
  defaultExpanded?: boolean;
  className?: string;
  titleClassName?: string;
  contentClassName?: string;
  icon?: ReactNode;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  children,
  defaultExpanded = true,
  className = "",
  titleClassName = "",
  contentClassName = "",
  icon,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // If no children, don't render anything
  if (!children) {
    return null;
  }

  return (
    <div className={`mb-4 ${className}`}>
      <div
        className={`flex items-center cursor-pointer py-2 px-1 rounded hover:bg-gray-50 transition-colors duration-200 ${titleClassName}`}
        onClick={toggleExpanded}
      >
        <div className="flex items-center flex-1">
          {icon && <span className="mr-2">{icon}</span>}
          <h1 className="text-lg font-bold mb-0 select-none">
            {title}
          </h1>
        </div>
        <div className="ml-2 text-gray-500">
          {isExpanded ? (
            <ChevronDown size={16} className="transition-transform duration-200" />
          ) : (
            <ChevronRight size={16} className="transition-transform duration-200" />
          )}
        </div>
      </div>
      
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isExpanded ? "max-h-none opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className={`pt-2 ${contentClassName}`}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default CollapsibleSection;