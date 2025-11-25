"use client";

import React from "react";
import { Tooltip, TooltipProps } from "antd";
import { isTouchDevice } from "@utils/device";

/**
 * A touch-aware tooltip component that automatically disables tooltips on touch devices
 * This prevents the poor UX of tooltips showing when tapping on touch devices
 */
interface TouchAwareTooltipProps {
  children: React.ReactElement;
  forceShow?: boolean; // Override touch detection if needed
  title?: React.ReactNode;
  placement?: TooltipProps["placement"];
  trigger?: TooltipProps["trigger"];
  overlayClassName?: string;
  overlayStyle?: React.CSSProperties;
  mouseEnterDelay?: number;
  mouseLeaveDelay?: number;
  destroyOnHidden?: boolean;
  getPopupContainer?: TooltipProps["getPopupContainer"];
}

const TouchAwareTooltip: React.FC<TouchAwareTooltipProps> = ({
  children,
  forceShow = false,
  title,
  placement,
  trigger,
  overlayClassName,
  overlayStyle,
  mouseEnterDelay,
  mouseLeaveDelay,
  destroyOnHidden,
  getPopupContainer,
}) => {
  // State to track if component is mounted (client-side)
  const [isMounted, setIsMounted] = React.useState(false);

  // Check if this is a touch device, but only on client-side
  const isTouch = React.useMemo(() => {
    if (!isMounted) return false;
    try {
      return isTouchDevice();
    } catch (error) {
      console.warn("Error detecting touch device:", error);
      return false;
    }
  }, [isMounted]);

  // Set mounted state after component mounts
  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // If not mounted yet (SSR) or it's a touch device and forceShow is false, just return the children without tooltip
  if (!isMounted || (isTouch && !forceShow)) {
    return children;
  }

  // For non-touch devices or when forceShow is true, render the tooltip normally
  return (
    <Tooltip
      title={title}
      placement={placement}
      trigger={trigger}
      overlayClassName={overlayClassName}
      overlayStyle={overlayStyle}
      mouseEnterDelay={mouseEnterDelay}
      mouseLeaveDelay={mouseLeaveDelay}
      destroyOnHidden={destroyOnHidden}
      getPopupContainer={getPopupContainer}
    >
      {children}
    </Tooltip>
  );
};

export default TouchAwareTooltip;
