export const convertOperatorToText = (operator: string) => {
  return operator
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};
