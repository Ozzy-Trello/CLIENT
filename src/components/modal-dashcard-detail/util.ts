export const convertOperatorToText = (operator: string) => {
  return operator
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export const convertValueToText = (value: any): string => {
  if (value === null || value === undefined) {
    return "";
  }
  
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  
  if (typeof value === "object") {
    // Handle complex date filter objects like {type, unit, number, reference}
    if (value.type && value.unit && value.number) {
      return `${value.number} ${value.unit}${value.number > 1 ? 's' : ''} ${value.reference || 'from now'}`;
    }
    
    // For other objects, try to display key-value pairs
    return Object.entries(value)
      .map(([key, val]) => `${key}: ${val}`)
      .join(", ");
  }
  
  return String(value);
};
