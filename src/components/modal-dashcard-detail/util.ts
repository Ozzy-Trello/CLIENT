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
    if (typeof value.number === "number" && value.unit) {
      const unit = String(value.unit).replace(/s$/, "");
      const reference = String(value.reference || "from now").replace(/_/g, " ");
      return `${value.number} ${unit}${value.number === 1 ? "" : "s"} ${reference}`;
    }
    
    // For other objects, try to display key-value pairs
    return Object.entries(value)
      .map(([key, val]) => `${key}: ${val}`)
      .join(", ");
  }
  
  return String(value);
};
