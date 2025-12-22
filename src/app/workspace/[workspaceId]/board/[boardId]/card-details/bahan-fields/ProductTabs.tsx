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
  isCategoryLoading,
  getCategoryError,
  clearCategoryError,
  onRemoveProduct,
}) => {
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
        if (action === "remove" && typeof targetKey === "string") {
          onRemoveProduct(targetKey);
        }
      }}
      items={po.products.map((product) => ({
        key: product.id,
        label: product.name,
        children: (
          <div className="mt-4">
            {product.bahanTabs.length > 0 ? (
              <BahanTabContent
                bahanTab={product.bahanTabs[0]}
                po={po}
                product={product}
                warehouseProducts={products}
                colors={colors}
                categories={categories}
                isLoadingCategories={isLoadingCategories}
                poIndex={po.products.indexOf(product)}
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
  );
};

export default ProductTabs;
