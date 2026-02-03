import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Tabs } from "antd";
import { CategorySectionProps, CategoryData, SubcategoryValue } from "./types";
import {
  MainCategoryWithSubcategories,
  SubcategoryWithJunctionData,
} from "@myTypes/category";

export const calculateCategoryTotal = (
  category: MainCategoryWithSubcategories | undefined,
  resolveValue: (
    categoryId: string,
    subcategory: SubcategoryWithJunctionData
  ) => number
): number => {
  if (!category?.subcategories) return 0;

  return category.subcategories.reduce((sum, subcategory) => {
    if (subcategory?.junction?.isTotalField) {
      return sum;
    }

    const value = resolveValue(category.id, subcategory);
    return sum + value;
  }, 0);
};

const CategorySection: React.FC<CategorySectionProps> = ({
  product,
  po,
  colors,
  categories,
  isLoadingCategories = false,
  onCategoryValueChange,
  isCategoryLoading,
  getCategoryError,
  clearCategoryError,
}) => {
  const sortedCategories = useMemo(() => {
    if (!categories || categories.length === 0) return [];
    return [...categories].sort(
      (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)
    );
  }, [categories]);

  const [activeTab, setActiveTab] = useState<string>(
    () => sortedCategories[0]?.id || ""
  );
  const [pendingValues, setPendingValues] = useState<
    Record<string, { value: string; categoryKey: string }>
  >({});

  useEffect(() => {
    if (sortedCategories.length === 0) {
      setActiveTab("");
      return;
    }
    if (!sortedCategories.some((category) => category.id === activeTab)) {
      setActiveTab(sortedCategories[0].id);
    }
  }, [sortedCategories, activeTab]);

  // Clear pending values once the backend is done loading (or no error) to avoid flicker
  useEffect(() => {
    setPendingValues((prev) => {
      let changed = false;
      const next = { ...prev };

      Object.entries(prev).forEach(([pendingKey, entry]) => {
        const loading = isCategoryLoading?.(entry.categoryKey) || false;
        const error = getCategoryError?.(entry.categoryKey);
        if (!loading && !error) {
          delete next[pendingKey];
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [isCategoryLoading, getCategoryError]);

  // Helper function to get category data for a specific category
  const getCategoryData = (categoryId: string): CategoryData | undefined => {
    return product.categoryData?.find((cat) => cat.categoryId === categoryId);
  };

  // Helper function to get subcategory value
  const getSubcategoryValue = (
    categoryId: string,
    subcategoryId: string
  ): number => {
    const categoryData = getCategoryData(categoryId);
    const subcategoryValue = categoryData?.subcategoryValues?.find(
      (sub) => sub.subcategoryId === subcategoryId
    );
    return Number(subcategoryValue?.value ?? 0);
  };

  const parsePendingValue = (
    categoryId: string,
    subcategoryId: string
  ): number | null => {
    const pendingKey = `${po.id}-${product.id}-${categoryId}-${subcategoryId}`;
    const pending = pendingValues[pendingKey];
    if (pending === undefined) {
      return null;
    }
    if (pending.value === "") {
      return 0;
    }
    const parsed = Number(pending.value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const resolveValueForTotal = (
    categoryId: string,
    subcategory: any
  ): number => {
    const pendingValue = parsePendingValue(categoryId, subcategory.id);
    if (pendingValue !== null) {
      return pendingValue;
    }
    return getSubcategoryValue(categoryId, subcategory.id);
  };

  const calculateCategoryTotalForUI = useCallback(
    (categoryId: string): number => {
      const category = categories.find((cat) => cat.id === categoryId);
      return calculateCategoryTotal(category, resolveValueForTotal);
    },
    [categories, resolveValueForTotal]
  );

  // Render hardcoded Total field
  const renderTotalField = (category: any) => {
    const totalValue = calculateCategoryTotalForUI(category.id);

    return (
      <div className="flex flex-col flex-1 min-w-0">
        <label
          className="block text-xs font-medium mb-1"
          style={{
            color: `rgb(${colors["text-muted"]})`,
          }}
        >
          Total {category.name}
        </label>
        <div className="relative">
          <input
            key={`total-${category.id}-${totalValue}`}
            type="number"
            value={Math.round(totalValue)}
            readOnly
            className="w-full px-3 py-2 rounded-md text-sm cursor-not-allowed"
            style={{
              border: `1px solid rgb(${colors.border})`,
              backgroundColor: `rgb(${colors.muted})`,
              color: `rgb(${colors["text-muted"]})`,
            }}
          />
        </div>
      </div>
    );
  };

  // Render input field for dynamic subcategory (no Total fields)
  const renderSubcategoryInput = (category: any, subcategory: any) => {
    const value = getSubcategoryValue(category.id, subcategory.id);

    // Generate category ID for loading/error state tracking
    const categoryKey = `${product.poProductId}-${category.id}-${subcategory.id}`;
    const isLoading = isCategoryLoading?.(categoryKey) || false;
    const error = getCategoryError?.(categoryKey);
    const pendingKey = `${po.id}-${product.id}-${category.id}-${subcategory.id}`;
    const inputValue =
      pendingValues[pendingKey] !== undefined
        ? pendingValues[pendingKey].value
        : Number.isFinite(value)
        ? String(value)
        : "";

    return (
      <div key={subcategory.id} className="flex flex-col flex-1 min-w-0">
        <label
          className="block text-xs font-medium mb-1"
          style={{
            color: `rgb(${colors["text-muted"]})`,
          }}
        >
          {subcategory.name}
          {isLoading && (
            <span className="ml-2 text-xs text-blue-500">Saving...</span>
          )}
        </label>
        <div className="relative">
          <input
            type="number"
            value={inputValue}
            onFocus={() => {
              if (
                pendingValues[pendingKey] === undefined &&
                Number.isFinite(value) &&
                value === 0
              ) {
                setPendingValues((prev) => ({
                  ...prev,
                  [pendingKey]: { value: "", categoryKey },
                }));
              }
            }}
            onChange={(e) => {
              if (error && clearCategoryError) {
                clearCategoryError(categoryKey);
              }
              const val = e.target.value;
              setPendingValues((prev) => ({
                ...prev,
                [pendingKey]: { value: val, categoryKey },
              }));
            }}
            onBlur={() => {
              const pending = pendingValues[pendingKey];
              if (pending === undefined) {
                return;
              }

              const numericValue =
                pending.value === ""
                  ? 0
                  : Number.parseFloat(pending.value);

              const safeValue = Number.isFinite(numericValue)
                ? numericValue
                : 0;

              onCategoryValueChange(
                po.id,
                product.id,
                category.id,
                subcategory.id,
                safeValue
              );
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
              }
            }}
            className={`w-full px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              error ? "border-red-500" : ""
            } ${isLoading ? "opacity-75" : ""}`}
            style={{
              border: error
                ? "1px solid #ef4444"
                : `1px solid rgb(${colors.border})`,
              backgroundColor: `rgb(${colors.surface})`,
              color: `rgb(${colors.text})`,
            }}
            disabled={isLoading}
          />
          {isLoading && (
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            </div>
          )}
        </div>
          {error && (
            <div className="text-xs text-red-500 mt-1 flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={() => clearCategoryError?.(categoryKey)}
                className="text-xs text-red-400 hover:text-red-600 ml-2"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      );
    };

  const sortSubcategories = (
    subs?: CategorySectionProps["categories"][number]["subcategories"]
  ) => {
    if (!subs) return [];
    return [...subs].sort(
      (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)
    );
  };

  // Create tab items
  const tabItems = sortedCategories.map((category) => {
    const sortedSubcategories = sortSubcategories(category.subcategories);
    return {
      key: category.id,
      label: category.name,
      children: (
        <div className="mt-4">
          <div className="grid grid-cols-3 gap-x-6 gap-y-3 auto-rows-max">
            {/* Render dynamic fields */}
            {sortedSubcategories.map((subcategory: any) =>
              renderSubcategoryInput(category, subcategory)
            )}
            {/* Render hardcoded Total field */}
            {renderTotalField(category)}
          </div>
        </div>
      ),
    };
  });

  if (isLoadingCategories) {
    return (
      <div className="mt-6">
        <div
          className="text-sm p-4 rounded border"
          style={{
            color: `rgb(${colors["text-muted"]})`,
            borderColor: `rgb(${colors.border})`,
            backgroundColor: `rgb(${colors.surface})`,
          }}
        >
          Loading categories...
        </div>
      </div>
    );
  }

  if (!categories || categories.length === 0) {
    return (
      <div className="mt-6">
        <div
          className="text-sm p-4 rounded border"
          style={{
            color: `rgb(${colors["text-muted"]})`,
            borderColor: `rgb(${colors.border})`,
            backgroundColor: `rgb(${colors.surface})`,
          }}
        >
          No categories available for this workspace.
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        size="small"
        style={
          {
            "--ant-primary-color": `rgb(${colors.primary})`,
          } as React.CSSProperties
        }
      />
    </div>
  );
};

export default CategorySection;
