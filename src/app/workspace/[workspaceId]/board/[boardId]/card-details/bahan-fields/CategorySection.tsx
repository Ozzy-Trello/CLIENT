import React, { useState } from "react";
import { Tabs } from "antd";
import { CategorySectionProps, CategoryData, SubcategoryValue } from "./types";

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
  const [activeTab, setActiveTab] = useState<string>(categories[0]?.id || "");

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

  // Helper function to calculate total for a category
  const calculateCategoryTotal = (categoryId: string): number => {
    const category = categories.find((cat) => cat.id === categoryId);
    if (!category?.subcategories) return 0;

    let total = 0;
    category.subcategories.forEach((subcategory: any) => {
      const value = getSubcategoryValue(categoryId, subcategory.id);
      total += value;
    });

    return total;
  };

  // Render hardcoded Total field
  const renderTotalField = (category: any) => {
    const totalValue = calculateCategoryTotal(category.id);

    return (
      <div className="flex flex-col flex-1 min-w-[200px]">
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

    return (
      <div key={subcategory.id} className="flex flex-col flex-1 min-w-[200px]">
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
            value={value || ""}
            onChange={(e) => {
              // Clear any existing error when user starts typing
              if (error && clearCategoryError) {
                clearCategoryError(categoryKey);
              }
              const inputValue = e.target.value;
              if (inputValue === "" || inputValue === "0") {
                onCategoryValueChange(
                  po.id,
                  product.id,
                  category.id,
                  subcategory.id,
                  0
                );
              } else {
                onCategoryValueChange(
                  po.id,
                  product.id,
                  category.id,
                  subcategory.id,
                  parseFloat(inputValue) || 0
                );
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

  // Create tab items
  const tabItems = categories.map((category) => ({
    key: category.id,
    label: category.name,
    children: (
      <div className="mt-4">
        <div className="flex flex-wrap gap-4">
          {/* Render dynamic fields */}
          {category.subcategories?.map((subcategory: any) =>
            renderSubcategoryInput(category, subcategory)
          )}
          {/* Render hardcoded Total field */}
          {renderTotalField(category)}
        </div>
      </div>
    ),
  }));

  if (isLoadingCategories) {
    return (
      <div className="mt-6">
        <h4
          className="text-sm font-medium mb-3"
          style={{ color: `rgb(${colors.text})` }}
        >
          Category Details
        </h4>
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
        <h4
          className="text-sm font-medium mb-3"
          style={{ color: `rgb(${colors.text})` }}
        >
          Category Details
        </h4>
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
      <h4
        className="text-sm font-medium mb-3"
        style={{ color: `rgb(${colors.text})` }}
      >
        Category Details
      </h4>
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
