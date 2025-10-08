import React, { ReactNode } from "react";
import CollapsibleSection from "./collapsible-section";

interface ConditionalCollapsibleSectionProps {
  title: string;
  icon?: ReactNode;
  defaultExpanded?: boolean;
  className?: string;
  titleClassName?: string;
  contentClassName?: string;
  children: ReactNode;
  condition?: boolean; // Additional condition to check
}

const ConditionalCollapsibleSection: React.FC<ConditionalCollapsibleSectionProps> = ({
  title,
  icon,
  defaultExpanded = true,
  className = "",
  titleClassName = "",
  contentClassName = "",
  children,
  condition = true,
}) => {
  // Don't render if condition is false
  if (!condition) {
    return null;
  }

  // Don't render if children is null, undefined, or empty
  if (!children) {
    return null;
  }

  // If children is a React element that renders null, don't show the section
  if (React.isValidElement(children) && children.type === React.Fragment && !children.props.children) {
    return null;
  }

  return (
    <CollapsibleSection
      title={title}
      icon={icon}
      defaultExpanded={defaultExpanded}
      className={className}
      titleClassName={titleClassName}
      contentClassName={contentClassName}
    >
      {children}
    </CollapsibleSection>
  );
};

export default ConditionalCollapsibleSection;