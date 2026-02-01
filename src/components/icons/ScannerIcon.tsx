import React from "react";

type ScannerIconProps = {
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
};

// Minimal scanner glyph: four corners + horizontal scan line
export const ScannerIcon: React.FC<ScannerIconProps> = ({
  size = 16,
  color = "currentColor",
  className,
  style,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={style}
  >
    <path d="M4 7V5a1 1 0 0 1 1-1h2" />
    <path d="M17 4h2a1 1 0 0 1 1 1v2" />
    <path d="M4 17v2a1 1 0 0 0 1 1h2" />
    <path d="M17 20h2a1 1 0 0 0 1-1v-2" />
    <path d="M4 12h16" />
  </svg>
);

export default ScannerIcon;
