// Helper utilities to display request quantities without trailing .000 values.
export const formatRequestQuantity = (
  value?: number | string | null
): string => {
  if (value === undefined || value === null || value === "") {
    return "0";
  }

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return String(value);
  }

  if (Math.abs(numericValue % 1) < Number.EPSILON) {
    return numericValue.toString();
  }

  // Limit to two decimal places for readability, trimming trailing zeros.
  const normalized = numericValue.toFixed(2).replace(/\.?0+$/, "");
  return normalized;
};
