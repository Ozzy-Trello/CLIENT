export const STICKY_BASE_OFFSET = 12;
export const SUBCARD_INDENT_STEP = 24;
export const defaultCardBackground = "#ffffff";

export const hexToRgba = (hexColor: string | undefined, alpha = 1) => {
  if (!hexColor) return `rgba(255, 255, 255, ${alpha})`;
  if (!hexColor.startsWith("#")) {
    return alpha === 1 ? hexColor : `rgba(255, 255, 255, ${alpha})`;
  }
  let normalized = hexColor.replace("#", "");
  if (normalized.length === 3) {
    normalized = normalized
      .split("")
      .map((char) => char + char)
      .join("");
  }
  if (normalized.length !== 6) {
    return `rgba(255, 255, 255, ${alpha})`;
  }
  const num = parseInt(normalized, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const createStickyGradient = (color?: string) => {
  const solid = hexToRgba(color, 1);
  const transparent = hexToRgba(color, 0);
  return `linear-gradient(90deg, ${solid} 80%, ${transparent})`;
};
