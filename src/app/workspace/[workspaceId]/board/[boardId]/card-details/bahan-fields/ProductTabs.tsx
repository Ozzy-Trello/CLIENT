import React, { useState, useEffect } from "react";
import { Tabs } from "antd";
import BahanTabContent from "./BahanTabContent";
import { ProductTabsProps } from "./types";

const ProductTabs: React.FC<ProductTabsProps> = ({
  po,
  products,
  colors,
  categories,
  isLoadingCategories,
  onTerloadingChange,
  onBahanTerpakaiChange,
  onEstBahanChange,
  onCategoryValueChange,
  onOrderStatusChange,
  deletingProductIds = [],
  isCategoryLoading,
  getCategoryError,
  clearCategoryError,
  onRemoveProduct,
}) => {
  const [loadingStates, setLoadingStates] = useState<
    Record<
      string,
      {
        disableLoadingButton: boolean;
        isOrderAlreadyCreated: boolean;
        handleLoadingClick: () => void;
        isLoadingAction?: boolean;
      }
    >
  >({});

  const [activeProductTab, setActiveProductTab] = useState<string>(
    po.products.length > 0 ? po.products[0].id : ""
  );

  useEffect(() => {
    if (po.products.length > 0 && !activeProductTab) {
      setActiveProductTab(po.products[0].id);
    } else if (
      po.products.length > 0 &&
      !po.products.some((p) => p.id === activeProductTab)
    ) {
      setActiveProductTab(po.products[0].id);
    }
  }, [po.products, activeProductTab]);

  return (
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
        if (
          action === "remove" &&
          typeof targetKey === "string" &&
          !deletingProductIds.includes(targetKey)
        ) {
          onRemoveProduct(targetKey);
        }
      }}
      items={po.products.map((product) => ({
        key: product.id,
        label: (
          <div className="flex items-center gap-2">
            <span>{product.name}</span>
            {deletingProductIds.includes(product.id) && (
              <span
                className="animate-spin h-3 w-3 rounded-full border-2 border-gray-400 border-t-transparent"
                aria-label="Removing product"
              />
            )}
          </div>
        ),
        children: (
          <div className="mt-4">
            {deletingProductIds.includes(product.id) ? (
              <div
                className="rounded-lg p-6 text-center"
                style={{
                  border: `1px solid rgb(${colors.border})`,
                  backgroundColor: `rgb(${colors.surface})`,
                }}
              >
                <span
                  className="text-sm"
                  style={{ color: `rgb(${colors["text-muted"]})` }}
                >
                  Removing product...
                </span>
              </div>
            ) : product.bahanTabs.length > 0 ? (
              <BahanTabContent
                bahanTab={product.bahanTabs[0]}
                po={po}
                product={product}
                warehouseProducts={products}
                colors={colors}
                categories={categories}
                isLoadingCategories={isLoadingCategories}
                bahanTabIndex={0}
                onTerloadingChange={onTerloadingChange}
                onBahanTerpakaiChange={onBahanTerpakaiChange}
                onEstBahanChange={onEstBahanChange}
                onCategoryValueChange={onCategoryValueChange}
                onOrderStatusChange={onOrderStatusChange}
                isCategoryLoading={isCategoryLoading}
                getCategoryError={getCategoryError}
                clearCategoryError={clearCategoryError}
                onLoadingStateChange={({
                  productId,
                  disableLoadingButton,
                  isOrderAlreadyCreated,
                  handleLoadingClick,
                  isLoadingAction,
                }) => {
                  setLoadingStates((prev) => ({
                    ...prev,
                    [productId]: {
                      disableLoadingButton,
                      isOrderAlreadyCreated,
                      handleLoadingClick,
                      isLoadingAction,
                    },
                  }));
                }}
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
            {loadingStates[product.id] && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={loadingStates[product.id].handleLoadingClick}
                  disabled={
                    loadingStates[product.id].disableLoadingButton ||
                    loadingStates[product.id].isLoadingAction
                  }
                  className={`px-6 py-3 text-sm font-medium border rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 shadow-sm ${
                    loadingStates[product.id].isOrderAlreadyCreated
                      ? "bg-green-600 border-green-600 text-white cursor-not-allowed opacity-75"
                      : loadingStates[product.id].disableLoadingButton ||
                        loadingStates[product.id].isLoadingAction
                      ? "bg-gray-300 border-gray-300 text-gray-600 cursor-not-allowed opacity-75"
                      : "bg-blue-600 border-blue-600 hover:bg-blue-700 hover:border-blue-700 focus:ring-blue-500 text-white"
                  }`}
                >
                  {loadingStates[product.id].isOrderAlreadyCreated
                    ? "Terloading"
                    : loadingStates[product.id].isLoadingAction
                    ? "Processing..."
                    : "Loading"}
                </button>
              </div>
            )}
          </div>
        ),
      }))}
    />
  );
};

export default ProductTabs;
