/**
 * Utility functions for device detection
 */

import React from 'react';

/**
 * Detects if the current device is a touch device
 * Uses multiple methods for better compatibility
 */
export const isTouchDevice = (): boolean => {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return false;
  }

  // Method 1: Check for touch events support
  const hasTouchEvents = 'ontouchstart' in window || 
                        (window.navigator && window.navigator.maxTouchPoints > 0);

  // Method 2: Check pointer media query (most reliable for modern browsers)
  const hasCoarsePointer = window.matchMedia && 
                          window.matchMedia('(pointer: coarse)').matches;

  // Method 3: Check hover capability (touch devices typically don't have hover)
  const hasNoHover = window.matchMedia && 
                    window.matchMedia('(hover: none)').matches;

  // Return true if any of the touch indicators are present
  return hasTouchEvents || hasCoarsePointer || hasNoHover;
};

/**
 * Detects if the current device is a tablet
 * Combines touch detection with screen size
 */
export const isTabletDevice = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  const isTouch = isTouchDevice();
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  const minDimension = Math.min(screenWidth, screenHeight);
  const maxDimension = Math.max(screenWidth, screenHeight);

  // Tablet size range: typically 768px to 1024px in width
  // and touch-enabled
  return isTouch && minDimension >= 768 && maxDimension <= 1366;
};

/**
 * Hook to detect touch device with reactive updates
 */
export const useIsTouchDevice = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  const [isTouch, setIsTouch] = React.useState(isTouchDevice);

  React.useEffect(() => {
    const checkTouchDevice = () => {
      setIsTouch(isTouchDevice());
    };

    // Listen for orientation changes and resize events
    window.addEventListener('resize', checkTouchDevice);
    window.addEventListener('orientationchange', checkTouchDevice);

    return () => {
      window.removeEventListener('resize', checkTouchDevice);
      window.removeEventListener('orientationchange', checkTouchDevice);
    };
  }, []);

  return isTouch;
};