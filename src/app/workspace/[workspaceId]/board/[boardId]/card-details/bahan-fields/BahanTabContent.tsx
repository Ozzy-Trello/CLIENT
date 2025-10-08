import React from "react";
import { BahanTabProps } from "./types";
import CategorySection from "./CategorySection";

const BahanTabContent: React.FC<BahanTabProps> = ({
  bahanTab,
  po,
  product,
  colors,
  categories,
  isLoadingCategories = false,
  poIndex,
  productIndex,
  bahanTabIndex,
  onTerloadingChange,
  onBahanTerpakaiChange,
  onEstBahanChange,
  onCategoryValueChange,
  isCategoryLoading,
  getCategoryError,
  clearCategoryError,
}) => {
  return (
    <div>
      {/* Input Fields Grid */}
      <div className="grid grid-cols-3 gap-x-6 gap-y-3 mb-3">
        {/* Terloading (Enabled) */}
        <div>
          <label
            className="block text-xs font-medium mb-1"
            style={{
              color: `rgb(${colors["text-muted"]})`,
            }}
          >
            Terloading (kg/m)
          </label>
          <input
            type="number"
            value={bahanTab.terloading || ""}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "" || value === "0") {
                onTerloadingChange(
                  poIndex,
                  productIndex,
                  bahanTabIndex,
                  0
                );
              } else {
                onTerloadingChange(
                  poIndex,
                  productIndex,
                  bahanTabIndex,
                  parseFloat(value) || 0
                );
              }
            }}
            className="w-full px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            style={{
              border: `1px solid rgb(${colors.border})`,
              backgroundColor: `rgb(${colors.surface})`,
              color: `rgb(${colors.text})`,
            }}
          />
        </div>

        {/* Sisa Bahan (Calculated, Disabled) */}
        <div>
          <label
            className="block text-xs font-medium mb-1"
            style={{
              color: `rgb(${colors["text-muted"]})`,
            }}
          >
            Sisa Bahan (kg/m)
          </label>
          <input
            className="w-full px-3 py-2 rounded-md text-sm cursor-not-allowed"
            style={{
              border: `1px solid rgb(${colors.border})`,
              backgroundColor: `rgb(${colors.muted})`,
              color: `rgb(${colors["text-muted"]})`,
            }}
            value={bahanTab.sisaBahan.toFixed(2)}
            readOnly
          />
        </div>

        {/* Jml Produksi (Disabled, for later calculation) */}
        <div>
          <label
            className="block text-xs font-medium mb-1"
            style={{
              color: `rgb(${colors["text-muted"]})`,
            }}
          >
            Jml. Produksi (+/-)
          </label>
          <input
            className="w-full px-3 py-2 rounded-md text-sm cursor-not-allowed"
            style={{
              border: `1px solid rgb(${colors.border})`,
              backgroundColor: `rgb(${colors.muted})`,
              color: `rgb(${colors["text-muted"]})`,
            }}
            value={bahanTab.jmlProduksi}
            readOnly
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-x-6 gap-y-3 mb-6">
        {/* Est Bahan (Calculated, Disabled) */}
        <div>
          <label
            className="block text-xs font-medium mb-1"
            style={{
              color: `rgb(${colors["text-muted"]})`,
            }}
          >
            Est Bahan
          </label>
          <input
            className="w-full px-3 py-2 rounded-md text-sm cursor-not-allowed"
            style={{
              border: `1px solid rgb(${colors.border})`,
              backgroundColor: `rgb(${colors.muted})`,
              color: `rgb(${colors["text-muted"]})`,
            }}
            value={bahanTab.estBahan.toFixed(1)}
            readOnly
          />
        </div>

        {/* Bahan Terpakai (Enabled) */}
        <div>
          <label
            className="block text-xs font-medium mb-1"
            style={{
              color: `rgb(${colors["text-muted"]})`,
            }}
          >
            Bahan Terpakai
          </label>
          <input
            type="number"
            value={bahanTab.bahanTerpakai || ""}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "" || value === "0") {
                onBahanTerpakaiChange(
                  poIndex,
                  productIndex,
                  bahanTabIndex,
                  0
                );
              } else {
                onBahanTerpakaiChange(
                  poIndex,
                  productIndex,
                  bahanTabIndex,
                  parseFloat(value) || 0
                );
              }
            }}
            className="w-full px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            style={{
              border: `1px solid rgb(${colors.border})`,
              backgroundColor: `rgb(${colors.surface})`,
              color: `rgb(${colors.text})`,
            }}
          />
        </div>

        {/* Efisiensi (Calculated, Disabled) */}
        <div>
          <label
            className="block text-xs font-medium mb-1"
            style={{
              color: `rgb(${colors["text-muted"]})`,
            }}
          >
            Efisiensi (%)
          </label>
          <input
            className="w-full px-3 py-2 rounded-md text-sm cursor-not-allowed"
            style={{
              border: `1px solid rgb(${colors.border})`,
              backgroundColor: `rgb(${colors.muted})`,
              color: `rgb(${colors["text-muted"]})`,
            }}
            value={bahanTab.efisiensi.toFixed(2)}
            readOnly
          />
        </div>
      </div>

      {/* Category Section */}
      <CategorySection
        product={product}
        po={po}
        colors={colors}
        categories={categories || []}
        isLoadingCategories={isLoadingCategories}
        onCategoryValueChange={(
          poId,
          productId,
          categoryId,
          subcategoryId,
          value
        ) => {
          console.log(
            `🎯 [BahanTabContent] onCategoryValueChange called with:`,
            {
              poId,
              productId,
              categoryId,
              subcategoryId,
              value,
              convertedToIndices: { poIndex, productIndex },
            }
          );
          onCategoryValueChange(
            poIndex,
            productIndex,
            categoryId,
            subcategoryId,
            value
          );
        }}
        isCategoryLoading={isCategoryLoading}
        getCategoryError={getCategoryError}
        clearCategoryError={clearCategoryError}
      />
    </div>
  );
};

export default BahanTabContent;
