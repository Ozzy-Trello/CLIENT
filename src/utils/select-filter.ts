export const filterOptionByLabel = (input: string, option?: {
  label?: string | number;
  value?: string | number;
}) => {
  if (!option) return false;
  const target =
    typeof option.label === "string" || typeof option.label === "number"
      ? option.label
      : option.value ?? "";
  return String(target).toLowerCase().includes(input.toLowerCase());
};
