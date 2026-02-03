const CUTTING_KEYWORDS = ["cutting", "potong"];
const SEWING_KEYWORDS = ["sewing", "jahit"];

export type CategoryType = "cutting" | "sewing" | "neither";

export const getCategoryType = (category: { name?: string } | null | undefined): CategoryType => {
  if (!category?.name) {
    return "neither";
  }

  const normalized = category.name.toString().toLowerCase().trim();
  if (normalized.length === 0) {
    return "neither";
  }

  if (CUTTING_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return "cutting";
  }

  if (SEWING_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return "sewing";
  }

  return "neither";
};
