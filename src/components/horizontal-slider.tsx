"use client";

import React, { useState, useRef, useEffect } from "react";

interface HorizontalSliderProps {
  containerRef: React.RefObject<HTMLDivElement>;
  className?: string;
}

const HorizontalSlider: React.FC<HorizontalSliderProps> = ({
  containerRef,
  className = "",
}) => {
  const [scrollPosition, setScrollPosition] = useState(0);
  const [maxScroll, setMaxScroll] = useState(0);
  const [showSlider, setShowSlider] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateScrollInfo = () => {
      const scrollWidth = container.scrollWidth;
      const clientWidth = container.clientWidth;
      const maxScrollValue = scrollWidth - clientWidth;

      setMaxScroll(maxScrollValue);
      setShowSlider(maxScrollValue > 0);
      setScrollPosition(container.scrollLeft);
    };

    const handleScroll = () => {
      setScrollPosition(container.scrollLeft);
    };

    // Initial update
    updateScrollInfo();

    // Listen for scroll events
    container.addEventListener("scroll", handleScroll);

    // Listen for resize events
    const resizeObserver = new ResizeObserver(updateScrollInfo);
    resizeObserver.observe(container);

    // Listen for content changes
    const mutationObserver = new MutationObserver(updateScrollInfo);
    mutationObserver.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "class"],
    });

    return () => {
      container.removeEventListener("scroll", handleScroll);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [containerRef]);

  const sliderPercentage =
    maxScroll > 0 ? (scrollPosition / maxScroll) * 100 : 0;
  const thumbWidth =
    maxScroll > 0
      ? Math.max(
          100,
          ((containerRef.current?.clientWidth || 0) /
            (containerRef.current?.scrollWidth || 1)) *
            100
        )
      : 20;

  if (!showSlider) return null;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (containerRef.current) {
      containerRef.current.scrollLeft = value;
    }
  };

  return (
    <div
      className={`absolute bottom-0 left-0 right-0 h-2 bg-transparent z-10 transition-opacity duration-300 hover:opacity-100 ${className}`}
      style={{
        opacity: 0.2,
        width: "100%",
        marginBottom: "0.3rem",
      }}
    >
      <input
        type="range"
        min="0"
        max={maxScroll}
        value={scrollPosition}
        onChange={handleSliderChange}
        className="w-full h-full appearance-none bg-transparent cursor-pointer native-scrollbar-slider"
        style={{
          background: "transparent",
        }}
      />

      <style jsx>{`
        .native-scrollbar-slider::-webkit-slider-thumb {
          appearance: none;
          height: 6px;
          width: ${Math.max(20, thumbWidth)}px;
          background: #374151;
          cursor: pointer;
          border-radius: 0;
          border: none;
        }

        .native-scrollbar-slider::-webkit-slider-thumb:hover {
          background: #1f2937;
        }

        .native-scrollbar-slider::-moz-range-thumb {
          height: 8px;
          width: ${Math.max(20, thumbWidth)}px;
          background: #374151;
          cursor: pointer;
          border-radius: 0;
          border: none;
        }

        .native-scrollbar-slider::-moz-range-thumb:hover {
          background: #1f2937;
        }
      `}</style>
    </div>
  );
};

export default HorizontalSlider;
