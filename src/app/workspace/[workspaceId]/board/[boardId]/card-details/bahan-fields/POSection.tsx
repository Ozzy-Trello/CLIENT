import React, { useState } from "react";
import { message } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { POSectionProps } from "./types";
import { useDeletePOProduct } from "@hooks/usePOProducts";
import { buildProductSelectionKey, resolveProductSource } from "./productHelpers";
import ProductSelector from "./ProductSelector";
import ProductTabs from "./ProductTabs";

const POSection: React.FC<POSectionProps> = ({
  po,
  index,
  colors,
  selectedProductId,
  products,
  isLoadingProducts,
  categories,
  isLoadingCategories,
  onSelectProduct,
  onProductInputFocus,
  onScanValue,
  onOpenCameraScan,
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
  isCabangFilled,
}) => {
  const [activeProductTab, setActiveProductTab] = useState<string>(
    po.products.length > 0 ? po.products[0].id : ""
  );
  const [deletingProductIds, setDeletingProductIds] = useState<Set<string>>(
    () => new Set()
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

  const handleRemoveProduct = async (productId: string) => {
    if (deletingProductIds.has(productId)) {
      return;
    }
    setDeletingProductIds((prev) => {
      const next = new Set(prev);
      next.add(productId);
      return next;
    });

    try {
      // Find the product to get the correct poProductId for API call
      const productToDelete = po.products.find((prod) => prod.id === productId);
      
      if (!productToDelete || !productToDelete.poProductId) {
        message.error("Cannot delete product: Product ID not found");
        setDeletingProductIds((prev) => {
          const next = new Set(prev);
          next.delete(productId);
          return next;
        });
        return;
      }

      // Call backend API to delete the product using poProductId (UUID)
      await deletePOProductMutation.mutateAsync(productToDelete.poProductId);
      
      // Manually invalidate and refetch specific queries to trigger immediate update
      
      // Use refetchQueries for immediate refetch
      await queryClient.refetchQueries({
        queryKey: ["po-products", "card", po.cardId]
      });
      
      await queryClient.refetchQueries({
        queryKey: ["pos", po.cardId]
      });
      
      // Update local state after successful deletion using latest state
      setPOData((prevData) => {
        let nextActive = activeProductTab;
        const updated = prevData.map((p) => {
          const newProducts = p.products.filter(
            (prod) =>
              prod.id !== productId &&
              prod.poProductId !== productToDelete.poProductId
          );
          if (p.id === po.id && activeProductTab === productId) {
            nextActive = newProducts[0]?.id || "";
          }
          return p.id === po.id ? { ...p, products: newProducts } : p;
        });
        if (activeProductTab === productId) {
          setActiveProductTab(nextActive);
        }
        return updated;
      });

      message.success("Product deleted successfully");
    } catch (error) {
      console.error("Error deleting product:", error);
      message.error("Failed to delete product. Please try again.");
    } finally {
      setDeletingProductIds((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
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
        <ProductSelector
          poId={po.id}
          colors={colors}
          selectedProductId={selectedProductId}
          products={products}
          isLoadingProducts={isLoadingProducts}
          onSelectProduct={onSelectProduct}
          onProductInputFocus={onProductInputFocus}
          onScanValue={onScanValue}
          onOpenCameraScan={onOpenCameraScan}
          setSelectedProductIds={setSelectedProductIds}
        />
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
          <ProductTabs
            po={po}
            products={products}
            colors={colors}
            categories={categories}
            isLoadingCategories={isLoadingCategories}
            deletingProductIds={Array.from(deletingProductIds)}
            onTerloadingChange={onTerloadingChange}
            onBahanTerpakaiChange={onBahanTerpakaiChange}
            onEstBahanChange={onEstBahanChange}
            onCategoryValueChange={onCategoryValueChange}
            onOrderStatusChange={onOrderStatusChange}
            isCategoryLoading={isCategoryLoading}
            getCategoryError={getCategoryError}
            clearCategoryError={clearCategoryError}
            isCabangFilled={isCabangFilled}
            onRemoveProduct={handleRemoveProduct}
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
