export type PageSizeOption = 10 | 20 | 50 | 100 | "all";

export const PAGE_SIZE_SELECT_OPTIONS: Array<{
  label: string;
  value: PageSizeOption;
}> = [
  { label: "10", value: 10 },
  { label: "20", value: 20 },
  { label: "50", value: 50 },
  { label: "100", value: 100 },
  { label: "All", value: "all" },
];
