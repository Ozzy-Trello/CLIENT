import { useCallback, useEffect, useRef } from "react";
import {
  MainCategoryWithSubcategories,
  SubcategoryWithJunctionData,
} from "@myTypes/category";
import { POItem } from "../types";
import { calculateCategoryTotal } from "../CategorySection";
import { CategoryType, getCategoryType } from "../categoryHelpers";

interface UseCategoryCustomFieldSyncProps {
  poData: POItem[];
  categories?: MainCategoryWithSubcategories[];
  cardCustomFields?: any[];
  setCustomFieldNumberValue: (fieldId: string, value: number) => void;
  getCustomFieldNumberValue?: (fieldId: string) => number | null | undefined;
  isManualOverrideActive: (fieldName: string) => boolean;
}

interface LastSyncedTotals {
  cutting: number;
  sewing: number;
}

const CATEGORY_SYNC_DEBUG = process.env.NODE_ENV !== "production";

const logCategorySync = (message: string, data?: any) => {
  if (!CATEGORY_SYNC_DEBUG) {
    return;
  }
  console.log("🔄 [CATEGORY SYNC]", message, data);
};

/**
 * Create a lookup map that ties each category ID to its metadata and calculated type.
 */
const buildCategoryMetadata = (
  categories?: MainCategoryWithSubcategories[]
): Map<string, { category: MainCategoryWithSubcategories; type: CategoryType }> => {
  const map = new Map<string, { category: MainCategoryWithSubcategories; type: CategoryType }>();
  (categories || []).forEach((category) => {
    const type = getCategoryType(category);
    map.set(category.id, { category, type });
  });
  return map;
};

/**
 * Sum up category values for the provided type (cutting or sewing) across all PO data.
 */
const calculateTotalByType = (
  data: POItem[],
  type: CategoryType,
  categories?: MainCategoryWithSubcategories[]
): number => {
  if (!data || data.length === 0) {
    return 0;
  }

  const metadata = buildCategoryMetadata(categories);
  if (metadata.size === 0) {
    return 0;
  }

  let total = 0;
  data.forEach((po) => {
    (po.products || []).forEach((product) => {
      (product.categoryData || []).forEach((categoryData) => {
        const entry = metadata.get(categoryData.categoryId);
        if (!entry || entry.type !== type) {
          return;
        }

        const resolveValue = (
          _categoryId: string,
          subcategory: SubcategoryWithJunctionData
        ): number => {
          const subcategoryEntry = (
            categoryData.subcategoryValues || []
          ).find((sub) => sub.subcategoryId === subcategory.id);
          const numeric = Number(subcategoryEntry?.value ?? 0);
          return Number.isFinite(numeric) ? numeric : 0;
        };

        total += calculateCategoryTotal(entry.category, resolveValue);
      });
    });
  });

  logCategorySync(`Calculated ${type} total`, { total, type });
  return total;
};

/**
 * Find the first custom field whose name contains the needle string (case-insensitive).
 */
const findFieldByName = (
  needle: string,
  fields?: any[]
): any | undefined => {
  if (!fields || fields.length === 0) {
    return undefined;
  }
  const normalizedNeedle = needle.toLowerCase().trim();
  return fields.find((field: any) =>
    (field?.name || "")
      .toString()
      .toLowerCase()
      .includes(normalizedNeedle)
  );
};

/**
 * Hook that synchronizes cutting and sewing totals with the corresponding custom fields.
 */
export const useCategoryCustomFieldSync = ({
  poData,
  categories,
  cardCustomFields,
  setCustomFieldNumberValue,
  getCustomFieldNumberValue,
  isManualOverrideActive,
}: UseCategoryCustomFieldSyncProps) => {
  const lastSyncedTotalsRef = useRef<LastSyncedTotals>({
    cutting: Number.NaN,
    sewing: Number.NaN,
  });

  const calculateTotalCutting = useCallback(
    (
      data: POItem[],
      categorySource?: MainCategoryWithSubcategories[]
    ): number => {
      return calculateTotalByType(data, "cutting", categorySource ?? categories);
    },
    [categories]
  );

  const calculateTotalSewing = useCallback(
    (
      data: POItem[],
      categorySource?: MainCategoryWithSubcategories[]
    ): number => {
      return calculateTotalByType(data, "sewing", categorySource ?? categories);
    },
    [categories]
  );

  /**
   * Synchronize the computed cutting total to the matching custom field unless overridden.
   */
  const syncCuttingToCustomField = useCallback(
    (
      data: POItem[],
      categorySource?: MainCategoryWithSubcategories[]
    ) => {
      if (isManualOverrideActive("jml cutting")) {
        logCategorySync("Skipping cutting sync because manual override active");
        return;
      }
      if (!cardCustomFields || cardCustomFields.length === 0) {
        return;
      }

      const totalCutting = calculateTotalCutting(data, categorySource);
      const cuttingField = findFieldByName("jml cutting", cardCustomFields);
      if (!cuttingField?.id) {
        return;
      }

      if (
        lastSyncedTotalsRef.current.cutting === totalCutting &&
        Number.isFinite(lastSyncedTotalsRef.current.cutting)
      ) {
        const existingRaw = getCustomFieldNumberValue?.(cuttingField.id);
        if (
          existingRaw !== null &&
          existingRaw !== undefined &&
          Number.isFinite(Number(existingRaw)) &&
          Number(existingRaw) === totalCutting
        ) {
          return;
        }
      }

      const existingRaw = getCustomFieldNumberValue?.(cuttingField.id);
      const hasExisting =
        existingRaw !== null && existingRaw !== undefined && Number.isFinite(Number(existingRaw));
      const existingNumber = hasExisting ? Number(existingRaw) : null;

      const valueMatches = hasExisting && existingNumber === totalCutting;

      if (valueMatches) {
        logCategorySync("Skipping cutting sync because value unchanged", {
          fieldId: cuttingField.id,
          totalCutting,
          existingValue: existingNumber,
        });
      } else {
        logCategorySync("Updating cutting custom field", {
          fieldId: cuttingField.id,
          totalCutting,
          existingValue: existingNumber,
        });
        setCustomFieldNumberValue(cuttingField.id, totalCutting);
      }

      lastSyncedTotalsRef.current.cutting = totalCutting;
    },
    [
      calculateTotalCutting,
      cardCustomFields,
      getCustomFieldNumberValue,
      isManualOverrideActive,
      setCustomFieldNumberValue,
    ]
  );

  /**
   * Synchronize the computed sewing total to the matching custom field unless overridden.
   */
  const syncSewingToCustomField = useCallback(
    (
      data: POItem[],
      categorySource?: MainCategoryWithSubcategories[]
    ) => {
      if (isManualOverrideActive("jml sewing")) {
        logCategorySync("Skipping sewing sync because manual override active");
        return;
      }
      if (!cardCustomFields || cardCustomFields.length === 0) {
        return;
      }

      const totalSewing = calculateTotalSewing(data, categorySource);
      const sewingField = findFieldByName("jml sewing", cardCustomFields);
      if (!sewingField?.id) {
        return;
      }

      if (
        lastSyncedTotalsRef.current.sewing === totalSewing &&
        Number.isFinite(lastSyncedTotalsRef.current.sewing)
      ) {
        const existingRaw = getCustomFieldNumberValue?.(sewingField.id);
        if (
          existingRaw !== null &&
          existingRaw !== undefined &&
          Number.isFinite(Number(existingRaw)) &&
          Number(existingRaw) === totalSewing
        ) {
          return;
        }
      }

      const existingRaw = getCustomFieldNumberValue?.(sewingField.id);
      const hasExisting =
        existingRaw !== null &&
        existingRaw !== undefined &&
        Number.isFinite(Number(existingRaw));
      const existingNumber = hasExisting ? Number(existingRaw) : null;

      const valueMatches = hasExisting && existingNumber === totalSewing;

      if (valueMatches) {
        logCategorySync("Skipping sewing sync because value unchanged", {
          fieldId: sewingField.id,
          totalSewing,
          existingValue: existingNumber,
        });
      } else {
        logCategorySync("Updating sewing custom field", {
          fieldId: sewingField.id,
          totalSewing,
          existingValue: existingNumber,
        });
        setCustomFieldNumberValue(sewingField.id, totalSewing);
      }

      lastSyncedTotalsRef.current.sewing = totalSewing;
    },
    [
      calculateTotalSewing,
      cardCustomFields,
      getCustomFieldNumberValue,
      isManualOverrideActive,
      setCustomFieldNumberValue,
    ]
  );

  /**
   * Run both cutting and sewing sync routines in sequence.
   */
  const syncAllCategoryTotalsToCustomFields = useCallback(() => {
    logCategorySync("Running combined category sync");
    syncCuttingToCustomField(poData, categories);
    syncSewingToCustomField(poData, categories);
  }, [categories, poData, syncCuttingToCustomField, syncSewingToCustomField]);

  useEffect(() => {
    syncAllCategoryTotalsToCustomFields();
  }, [cardCustomFields, categories, poData, syncAllCategoryTotalsToCustomFields]);

  return {
    calculateTotalCutting,
    calculateTotalSewing,
    syncCuttingToCustomField,
    syncSewingToCustomField,
    syncAllCategoryTotalsToCustomFields,
  };
};

export default useCategoryCustomFieldSync;
