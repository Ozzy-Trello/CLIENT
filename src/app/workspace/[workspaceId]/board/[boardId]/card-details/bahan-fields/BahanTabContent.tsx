import React from "react";
import { message } from "antd";
import { BahanTabProps } from "./types";
import CategorySection from "./CategorySection";
import { createRequestWithPOConnection } from "@api/accurate";

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
  onOrderStatusChange,
  isCategoryLoading,
  getCategoryError,
  clearCategoryError,
}) => {
  // Handler for Create New Order button
  const handleCreateNewOrder = async (po: any, product: any) => {
    // Only create new orders, don't toggle existing ones
    if (product.orderCreated) {
      message.info(`Order already exists for ${product.name} in ${po.name}`);
      return;
    }

    // Creating new order for product
 

    // Validate required data
    if (!product.poProductId) {
      message.error("Cannot create order: Product ID not found");
      return;
    }

    if (!po.cardId) {
      message.error("Cannot create order: Card ID not found");
      return;
    }

    if (!bahanTab.terloading || bahanTab.terloading <= 0) {
      message.error(
        "Cannot create order: Terloading amount must be greater than 0"
      );
      return;
    }

    try {
      // Prepare request data
      const requestData = {
        card_id: po.cardId,
        type: "NEW_ORDER",
        item_name: product.name,
        requested_item_id: product.id,
        request_amount: bahanTab.terloading, // Use terloading amount
        request_sent: bahanTab.terloading, // Use terloading amount (same as request_amount)
        is_verified: true, // Default to verified
        po_product_ids: [parseInt(product.poProductId)], // Convert to number array
        // Add adjustment fields from product data
        satuan: product.satuan,
        adjustment_no: product.adjustment_no,
        adjustment_name: product.adjustment_name,
      };

      // Product content

      await createRequestWithPOConnection(requestData);

      // Update local state to reflect the order creation
      onOrderStatusChange(poIndex, productIndex, true);

      message.success(
        `Order created successfully for ${product.name} in ${po.name}`
      );
    } catch (error) {
      console.error("❌ [BahanTabContent] Failed to create order:", error);
      message.error(
        `Failed to create order for ${product.name}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

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
            Terloading ({product.satuan || "unit"})
          </label>
          <input
            type="number"
            value={bahanTab.terloading || ""}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "" || value === "0") {
                onTerloadingChange(poIndex, productIndex, bahanTabIndex, 0);
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
            Sisa Bahan ({product.satuan || "unit"})
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
                onBahanTerpakaiChange(poIndex, productIndex, bahanTabIndex, 0);
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
          // Category value change called
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

      {/* Create New Order Button */}
      <div className="mt-6 flex justify-center">
        <button
          onClick={() => handleCreateNewOrder(po, product)}
          disabled={product.orderCreated}
          className={`px-6 py-3 text-sm font-medium border rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 shadow-sm ${
            product.orderCreated
              ? "bg-green-600 border-green-600 text-white cursor-not-allowed opacity-75"
              : "bg-blue-600 border-blue-600 hover:bg-blue-700 hover:border-blue-700 focus:ring-blue-500 text-white"
          }`}
        >
          {product.orderCreated ? "Order Created ✓" : "Create New Order"}
        </button>
      </div>
    </div>
  );
};

export default BahanTabContent;
