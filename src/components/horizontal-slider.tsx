"use client";

import React, { useState, useEffect } from "react";

interface HorizontalSliderProps {
  containerRef: React.RefObject<HTMLDivElement>;
  className?: string;
  widthPercent?: number;
}

const HorizontalSlider: React.FC<HorizontalSliderProps> = ({
  containerRef,
  className = "",
  widthPercent = 100,
}) => {
  const [scrollPosition, setScrollPosition] = useState(0);
  const [maxScroll, setMaxScroll] = useState(0);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [visibleRatio, setVisibleRatio] = useState(1);
  const [sliderInsets, setSliderInsets] = useState<{
    left: number;
    right: number;
  } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateScrollInfo = () => {
      const scrollWidth = container.scrollWidth;
      const clientWidth = container.clientWidth;
      const maxScrollValue = Math.max(scrollWidth - clientWidth, 0);

      setMaxScroll(maxScrollValue);
      setIsOverflowing(maxScrollValue > 0);
      setScrollPosition(container.scrollLeft);
      setVisibleRatio(
        scrollWidth > 0 ? Math.min(clientWidth / scrollWidth, 1) : 1
      );

      const rect = container.getBoundingClientRect();
      setSliderInsets({
        left: rect.left,
        right: Math.max(window.innerWidth - rect.right, 0),
      });
    };

    const handleScroll = () => {
      setScrollPosition(container.scrollLeft);
    };

    // Initial update
    updateScrollInfo();

    // Listen for scroll events
    container.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", updateScrollInfo);

    // Listen for resize events
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(updateScrollInfo);
      resizeObserver.observe(container);
    }

    // Listen for content changes
    let mutationObserver: MutationObserver | null = null;
    if (typeof MutationObserver !== "undefined") {
      mutationObserver = new MutationObserver(updateScrollInfo);
      mutationObserver.observe(container, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["style", "class"],
      });
    }

    return () => {
      container.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", updateScrollInfo);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
    };
  }, [containerRef]);

  const sliderPercentage =
    maxScroll > 0 ? (scrollPosition / maxScroll) * 100 : 0;

  const sliderWidthPercent = Math.min(Math.max(widthPercent ?? 100, 10), 100);

  if (!isOverflowing || maxScroll === 0) {
    return null;
  }

  const thumbWidthPercent = Math.min(Math.max(visibleRatio * 100, 8), 100);
  const travelRange = Math.max(0, 100 - thumbWidthPercent);
  const thumbLeftPercent = (sliderPercentage / 100) * travelRange;

  const sliderPositionStyle = sliderInsets
    ? {
        left: sliderInsets.left,
        right: sliderInsets.right,
        width: "auto",
        transform: "none",
      }
    : {
        left: "50%",
        width: `${sliderWidthPercent}%`,
        maxWidth: "640px",
        minWidth: sliderWidthPercent < 50 ? "220px" : undefined,
        transform: "translateX(-50%)",
      };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (containerRef.current && maxScroll > 0) {
      containerRef.current.scrollLeft = value;
    }
  };

  return (
    <div
      className={`fixed z-30 pointer-events-auto select-none transition-opacity duration-200 hover:opacity-100 ${className}`}
      style={{
        opacity: 0.95,
        bottom: 4,
        ...sliderPositionStyle,
      }}
    >
      <div className="horizontal-slider__track">
        <div
          className="horizontal-slider__thumb"
          style={{
            width: `${thumbWidthPercent}%`,
            left: `${thumbLeftPercent}%`,
          }}
        />
      </div>

      <input
        type="range"
        min="0"
        max={maxScroll}
        value={scrollPosition}
        onChange={handleSliderChange}
        aria-label="Board horizontal scroll"
        className="horizontal-slider__input"
      />

      <style jsx>{`
        .horizontal-slider__track {
          position: relative;
          width: 100%;
          height: 12px;
          border-radius: 999px;
          background: rgba(226, 232, 240, 0.9);
          border: 1px solid rgba(203, 213, 225, 0.8);
          overflow: hidden;
        }

        .horizontal-slider__thumb {
          position: absolute;
          top: 1px;
          bottom: 1px;
          border-radius: 999px;
          background: #4b5563;
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.3);
          transition: left 0.12s ease-out, width 0.12s ease-out;
        }

        .horizontal-slider__input {
          -webkit-appearance: none;
          appearance: none;
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          cursor: grab;
          background: transparent;
          outline: none;
          opacity: 0;
        }

        .horizontal-slider__input:active {
          cursor: grabbing;
        }

        .horizontal-slider__input::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 0;
          height: 0;
        }

        .horizontal-slider__input::-moz-range-thumb {
          width: 0;
          height: 0;
          border: none;
        }
      `}</style>
    </div>
  );
};

export default HorizontalSlider;
