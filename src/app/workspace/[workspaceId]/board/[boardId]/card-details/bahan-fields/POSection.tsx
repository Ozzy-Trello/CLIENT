import React, { useState, useEffect } from "react";
import { Tabs, message, AutoComplete } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import BahanTabContent from "./BahanTabContent";
import { POSectionProps } from "./types";
import { useDeletePOProduct } from "@hooks/usePOProducts";

const POSection: React.FC<POSectionProps> = ({
  po,
  index,
  colors,
  selectedProductId,
  hikmatItems,
  isLoadingProducts,
  categories,
  isLoadingCategories,
  onScanProduct,
  onSelectProduct,
  onOpenSummary,
  onTerloadingChange,
  onBahanTerpakaiChange,
  onEstBahanChange,
  onCategoryValueChange,
  onOrderStatusChange,
  setPOData,
  setSelectedProductIds,
  isCategoryLoading,
  getCategoryError,
  clearCategoryError,
}) => {
  const [activeProductTab, setActiveProductTab] = useState<string>(
    po.products.length > 0 ? po.products[0].id : ""
  );

  const queryClient = useQueryClient();
  // Delete mutation hook
  const deletePOProductMutation = useDeletePOProduct();

  // Update active tab when products change
  React.useEffect(() => {
    if (po.products.length > 0 && !activeProductTab) {
      setActiveProductTab(po.products[0].id);
    } else if (
      po.products.length > 0 &&
      !po.products.some((p) => p.id === activeProductTab)
    ) {
      setActiveProductTab(po.products[0].id);
    }
  }, [po.products, activeProductTab]);

  // Note: handleRemoveBahanTab removed since we're no longer using nested bahan tabs

  const handleRemoveProduct = async (productId: string) => {
    try {
      // Find the product to get the correct poProductId for API call
      const productToDelete = po.products.find((prod) => prod.id === productId);
      
      if (!productToDelete || !productToDelete.poProductId) {
        message.error("Cannot delete product: Product ID not found");
        return;
      }

      // Call backend API to delete the product using poProductId (UUID)
      console.log("🗑️ [POSection] Deleting POProduct with ID:", productToDelete.poProductId);
      await deletePOProductMutation.mutateAsync(productToDelete.poProductId);
      console.log("✅ [POSection] POProduct deleted successfully");
      
      // Manually invalidate and refetch specific queries to trigger immediate update
      console.log("🔄 [POSection] Invalidating and refetching cache for cardId:", po.cardId);
      
      // Use refetchQueries for immediate refetch
      await queryClient.refetchQueries({
        queryKey: ["po-products", "card", po.cardId]
      });
      console.log("✅ [POSection] Refetched po-products cache");
      
      await queryClient.refetchQueries({
        queryKey: ["pos", po.cardId]
      });
      console.log("✅ [POSection] Refetched pos cache");
      
      // Update local state after successful deletion
      setPOData((prevData) =>
        prevData.map((p) =>
          p.id === po.id
            ? {
                ...p,
                products: p.products.filter((prod) => prod.id !== productId),
              }
            : p
        )
      );

      // If we removed the active tab, switch to the first remaining product
      if (activeProductTab === productId && po.products.length > 1) {
        const remainingProducts = po.products.filter(
          (prod) => prod.id !== productId
        );
        if (remainingProducts.length > 0) {
          setActiveProductTab(remainingProducts[0].id);
        } else {
          setActiveProductTab("");
        }
      }

      message.success("Product deleted successfully");
    } catch (error) {
      console.error("Error deleting product:", error);
      message.error("Failed to delete product. Please try again.");
    }
  };

  return (
    <div
      className="rounded-lg p-6"
      style={{
        border: `1px solid rgb(${colors.border})`,
        backgroundColor: `rgb(${colors.surface})`,
      }}
    >
      {/* PO Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h3
            className="text-base font-semibold"
            style={{ color: `rgb(${colors.text})` }}
          >
            {po.name}
          </h3>

          {/* Summary Button */}
          {/* <button
            onClick={() => onOpenSummary(po.id)}
            className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 hover:border-blue-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
          >
            Summary
          </button> */}
        </div>

        {/* Product Selection */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onScanProduct(po.id)}
            className="px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 hover:border-green-300 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1"
          >
            Scan Product
          </button>

          {/* Product Selection AutoComplete */}
          <AutoComplete
            value={selectedProductId}
            onChange={(value) => {
              setSelectedProductIds((prev) => ({ ...prev, [po.id]: value }));
            }}
            onSelect={(value) => {
              if (value) {
                onSelectProduct(po.id, value);
              }
            }}
            options={hikmatItems.map((product: any) => ({
              value: product.id.toString(),
              label: `${product.name} (${product.no})`,
            }))}
            placeholder={isLoadingProducts ? "Loading products..." : "Type or select a product"}
            filterOption={(inputValue, option) =>
              option!.label.toLowerCase().indexOf(inputValue.toLowerCase()) !== -1
            }
            style={{
              minWidth: "200px",
            }}
            disabled={isLoadingProducts}
            showSearch
          />
        </div>
      </div>

      {/* Products Tabs Section */}
      {po.products.length > 0 ? (
        <div
          className="rounded-lg p-4"
          style={{
            border: `1px solid rgb(${colors.border})`,
            backgroundColor: `rgb(${colors.muted})`,
          }}
        >
          <Tabs
            activeKey={activeProductTab}
            onChange={setActiveProductTab}
            type="editable-card"
            hideAdd={true}
            tabPosition="top"
            tabBarGutter={10}
            className="overflow-x-auto"
            style={{
              overflowX: "auto",
            }}
            onEdit={(targetKey, action) => {
              if (action === "remove" && typeof targetKey === "string") {
                handleRemoveProduct(targetKey);
              }
            }}
            items={po.products.map((product) => ({
              key: product.id,
              label: product.name,
              children: (
                <div className="mt-4">
                  {/* Directly show bahan content - use first bahan tab if available */}
                  {product.bahanTabs.length > 0 ? (
                    <BahanTabContent
                      bahanTab={product.bahanTabs[0]} // Use first bahan tab
                      po={po}
                      product={product}
                      colors={colors}
                      categories={categories}
                      isLoadingCategories={isLoadingCategories}
                      poIndex={index}
                      productIndex={po.products.indexOf(product)}
                      bahanTabIndex={0}
                      onTerloadingChange={onTerloadingChange}
                      onBahanTerpakaiChange={onBahanTerpakaiChange}
                      onEstBahanChange={onEstBahanChange}
                      onCategoryValueChange={onCategoryValueChange}
                      onOrderStatusChange={onOrderStatusChange}
                      isCategoryLoading={isCategoryLoading}
                      getCategoryError={getCategoryError}
                      clearCategoryError={clearCategoryError}
                    />
                  ) : (
                    <div
                      className="rounded-lg p-4 text-center"
                      style={{
                        border: `1px solid rgb(${colors.border})`,
                        backgroundColor: `rgb(${colors.surface})`,
                      }}
                    >
                      <span
                        className="text-sm"
                        style={{ color: `rgb(${colors["text-muted"]})` }}
                      >
                        No data available for this product yet.
                      </span>
                    </div>
                  )}
                </div>
              ),
            }))}
          />
        </div>
      ) : (
        /* Empty State */
        <div
          className="rounded-lg p-6 text-center"
          style={{
            border: `1px solid rgb(${colors.border})`,
            backgroundColor: `rgb(${colors.muted})`,
          }}
        >
          <span
            className="text-sm"
            style={{ color: `rgb(${colors["text-muted"]})` }}
          >
            No products added yet. Use "Scan Product" or "Select a product" to
            add products.
          </span>
        </div>
      )}
    </div>
  );
};

export default POSection;
