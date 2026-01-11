export type DashcardMetricType = "card_count" | "custom_field_sum";

export interface DashcardMetric {
  type: DashcardMetricType;
  value: number;
  customFieldId?: string;
  customFieldName?: string;
}

export type DashcardCounts = Record<string, DashcardMetric>;

export const normalizeDashcardMetric = (
  raw: unknown
): DashcardMetric | undefined => {
  if (raw === null || raw === undefined) return undefined;

  if (typeof raw === "number" || typeof raw === "string") {
    const num = Number(raw);
    return {
      type: "card_count",
      value: Number.isFinite(num) ? num : 0,
    };
  }

  if (typeof raw === "object") {
    const candidate = raw as any;
    const rawType = candidate.type ?? candidate.displayType;
    const numericValue =
      candidate.value ??
      candidate.data ??
      candidate.count ??
      candidate.total ??
      candidate.cardsCount ??
      candidate.sum ??
      candidate.totalCount;

    const parsed = Number(numericValue ?? 0);

    return {
      type: rawType === "custom_field_sum" ? "custom_field_sum" : "card_count",
      value: Number.isFinite(parsed) ? parsed : 0,
      customFieldId: candidate.customFieldId ?? candidate.custom_field_id,
      customFieldName:
        candidate.customFieldName ?? candidate.custom_field_name,
    };
  }

  return undefined;
};
