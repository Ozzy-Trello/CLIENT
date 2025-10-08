import React, { useState, useEffect } from "react";
import { message } from "antd";
import { useSelector } from "react-redux";
import { selectTheme } from "@store/app_slice";
import { useQuery } from "@tanstack/react-query";
import { getHikmatItemList } from "@api/accurate";
import { useCategoriesWithSubcategories } from "@hooks/category";
import {
  usePOProductsByCardId,
  transformPOProductToProductItem,
  useCreatePOProduct,
  useCreatePOProductCategory,
} from "@hooks/usePOProducts";
import { useDebouncedCategoryUpdate } from "@hooks/useDebouncedCategoryUpdate";
import { useDebouncedPOProductUpdate } from "@hooks/useDebouncedPOProductUpdate";
import POSection from "./POSection";
import { BahanFieldsProps, POItem, ProductItem } from "./types";
import { usePOsByCardId } from "./hooks/usePOsByCardId";

const BahanFields: React.FC<BahanFieldsProps> = ({ cardId, workspaceId }) => {
  const theme = useSelector(selectTheme);
  const { colors } = theme;

  // Fetch PO data from API using cardId
  const {
    data: apiPOData = [],
    isLoading: isLoadingPOs,
    error: poError,
  } = usePOsByCardId(cardId);

  // Fetch PO Products data from API using cardId
  const {
    data: poProductsResponse,
    isLoading: isLoadingPOProducts,
    error: poProductsError,
  } = usePOProductsByCardId(cardId);

  // Add debugging logs
  // console.log("🔍 [BahanFields] Debug Info:", {
  //   cardId,
  //   apiPOData,
  //   poProductsResponse,
  //   isLoadingPOs,
  //   isLoadingPOProducts,
  //   poError,
  //   poProductsError,
  // });

  const [poData, setPOData] = useState<POItem[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<{
    [poId: string]: string;
  }>({});

  // Load products from Hikmat API
  const { data: hikmatItems, isLoading: isLoadingProducts } = useQuery({
    queryKey: ["hikmat-items"],
    queryFn: () => getHikmatItemList(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch categories with subcategories
  const {
    data: categories,
    isLoading: isLoadingCategories,
    error: categoriesError,
  } = useCategoriesWithSubcategories(workspaceId);

  // PO Product creation hook
  const createPOProductMutation = useCreatePOProduct();

  // PO Product Category creation hook
  const createPOProductCategoryMutation = useCreatePOProductCategory();

  // Debounced category update hook
  const {
    debouncedUpdate,
    isLoading: isCategoryLoading,
    getError: getCategoryError,
    clearError: clearCategoryError,
  } = useDebouncedCategoryUpdate({
    onSuccess: () => {
      // console.log("✅ Category value updated successfully");
    },
    onError: (error) => {
      console.error("❌ Failed to update category value:", error);
      message.error("Failed to save category changes");
    },
  });

  // Debounced POProduct update hook
  const {
    debouncedUpdate: debouncedPOProductUpdate,
    isLoading: isPOProductLoading,
    getError: getPOProductError,
    clearError: clearPOProductError,
  } = useDebouncedPOProductUpdate({
    onSuccess: () => {
      // console.log("✅ POProduct value updated successfully");
    },
    onError: (error) => {
      console.error("❌ Failed to update POProduct value:", error);
      message.error("Failed to save product changes");
    },
  });

  // Note: Removed complex mapping logic - now using direct POProduct access

  // Update local state when API data changes
  useEffect(() => {
    if (apiPOData.length > 0) {
      const updatedPOData = [...apiPOData];

      // Integrate PO Products data if available
      if (poProductsResponse?.data && poProductsResponse.data.length > 0) {
        // Add PO Products to existing POs or create new PO entries
        updatedPOData.forEach((po) => {
          const relatedPOProducts = (poProductsResponse.data || []).filter(
            (poProduct) => poProduct.poId === po.id
          );

          const relatedProducts = relatedPOProducts.map((poProduct) => {
            // First, check if this product already exists in our local state
            const existingProduct = po.products.find(
              (p) => p.poProductId === poProduct.id
            );

            if (existingProduct) {
              // Product exists, transform normally (no Total field preservation needed)
              return transformPOProductToProductItem(poProduct, categories);
            } else {
              // New product, transform normally
              const transformed = transformPOProductToProductItem(
                poProduct,
                categories
              );
              return transformed;
            }
          });

          // console.log(
          //   `🔍 PO ${po.name} - Current products before merge:`,
          //   po.products
          // );
          // console.log(
          //   `🔍 PO ${po.name} - New products to add:`,
          //   relatedProducts
          // );

          if (relatedProducts.length > 0) {
            // console.log(
            //   `✅ Adding ${relatedProducts.length} products to PO ${po.name}`
            // );
            // Merge with existing products, avoiding duplicates and preserving calculated values
            const existingProductPoIds = new Set(
              po.products.map((p) => p.poProductId)
            );
            // console.log(
            //   `🔍 Existing product PO IDs:`,
            //   Array.from(existingProductPoIds)
            // );

            // Separate new products from existing ones that need updates
            const newProducts = relatedProducts.filter(
              (p) => !existingProductPoIds.has(p.poProductId)
            );
            const updatedProducts = relatedProducts.filter((p) =>
              existingProductPoIds.has(p.poProductId)
            );

            // console.log(`🔍 New products after deduplication:`, newProducts);
            // console.log(`🔍 Updated existing products:`, updatedProducts);

            // Update existing products in place to preserve calculated values
            updatedProducts.forEach((updatedProduct) => {
              const existingIndex = po.products.findIndex(
                (p) => p.poProductId === updatedProduct.poProductId
              );
              if (existingIndex !== -1) {
                const existingProduct = po.products[existingIndex];

                // Preserve user-entered bahan tab values
                if (
                  existingProduct.bahanTabs &&
                  existingProduct.bahanTabs.length > 0 &&
                  updatedProduct.bahanTabs &&
                  updatedProduct.bahanTabs.length > 0
                ) {
                  const existingBahanTab = existingProduct.bahanTabs[0];
                  const updatedBahanTab = updatedProduct.bahanTabs[0];

                  // Preserve user-entered values
                  updatedBahanTab.terloading = existingBahanTab.terloading;
                  updatedBahanTab.bahanTerpakai =
                    existingBahanTab.bahanTerpakai;
                  updatedBahanTab.sisaBahan = existingBahanTab.sisaBahan;
                  updatedBahanTab.jmlProduksi = existingBahanTab.jmlProduksi;
                  updatedBahanTab.estBahan = existingBahanTab.estBahan;
                  updatedBahanTab.efisiensi = existingBahanTab.efisiensi;
                }

                po.products[existingIndex] = updatedProduct;
                // console.log(`🔄 Updated existing product ${updatedProduct.name} with preserved calculations`);
              }
            });

            // Add only truly new products
            po.products = [...po.products, ...newProducts];
            // console.log(`🔍 PO ${po.name} - Final products:`, po.products);

            // Calculate Est Bahan for each new product on load
            newProducts.forEach((product) => {
              if (
                product.bahanTabs &&
                product.bahanTabs.length > 0 &&
                categories
              ) {
                const calculatedEstBahan = calculateEstBahanFromCategories(
                  product,
                  categories
                );
                if (calculatedEstBahan > 0) {
                  product.bahanTabs[0].estBahan = calculatedEstBahan;
                  // console.log(`🧮 Calculated Est Bahan for product ${product.id}: ${calculatedEstBahan}`);
                }
              }

              // Note: Total field calculations are now handled purely in the frontend (CategorySection.tsx)
            });
          }
        });
      }

      setPOData(updatedPOData);
      setSelectedProductIds({}); // Reset selected products when PO data changes
    }
  }, [apiPOData, poProductsResponse]);

  // Calculate derived values
  const calculateSisaBahan = (
    terloading: number,
    bahanTerpakai: number
  ): number => {
    return terloading - bahanTerpakai;
  };

  const calculateEfisiensi = (
    estBahan: number,
    bahanTerpakai: number
  ): number => {
    if (estBahan === 0) return 0;
    return ((estBahan - bahanTerpakai) / estBahan) * 100;
  };

  // Calculate category values based on Est Bahan and junction weights
  const calculateCategoryValues = (estBahan: number, categories: any[]) => {
    const categoryValues: {
      [categoryId: string]: { [subcategoryId: string]: number };
    } = {};

    categories.forEach((category) => {
      categoryValues[category.id] = {};

      category.subcategories?.forEach((subcategory: any) => {
        if (subcategory.junction) {
          const { calculationWeight, operator } = subcategory.junction;
          let calculatedValue = 0;

          // Apply the formula: estBahan {operator} weight
          switch (operator) {
            case "add":
              calculatedValue = estBahan + calculationWeight;
              break;
            case "subtract":
              calculatedValue = estBahan - calculationWeight;
              break;
            case "multiply":
              calculatedValue = estBahan * calculationWeight;
              break;
            case "divide":
              calculatedValue =
                calculationWeight !== 0 ? estBahan / calculationWeight : 0;
              break;
            default:
              calculatedValue = estBahan + calculationWeight;
          }

          categoryValues[category.id][subcategory.id] = Math.max(
            0,
            calculatedValue
          ); // Ensure non-negative
        }
      });
    });

    return categoryValues;
  };

  // Calculate Est Bahan from category values (reverse calculation)
  const calculateEstBahanFromCategories = (
    productData: ProductItem,
    categories: any[]
  ) => {
    if (!productData.categoryData || productData.categoryData.length === 0) {
      return 0;
    }

    let totalEstBahan = 0;
    let calculationCount = 0;

    categories.forEach((category) => {
      const categoryData = productData.categoryData?.find(
        (cat) => cat.categoryId === category.id
      );
      if (!categoryData) {
        return;
      }

      category.subcategories?.forEach((subcategory: any) => {
        if (subcategory.junction && !subcategory.junction.isTotalField) {
          const subcategoryValue = categoryData.subcategoryValues.find(
            (sub) => sub.subcategoryId === subcategory.id
          );

          if (subcategoryValue) {
            const value = Number(subcategoryValue.value || 0);
            if (value > 0) {
              const { calculationWeight, operator } = subcategory.junction;
              let estBahanContribution = 0;

              // Reverse the formula to get estBahan from category value
              switch (operator) {
                case "add":
                  estBahanContribution = value - calculationWeight;
                  break;
                case "subtract":
                  estBahanContribution = value + calculationWeight;
                  break;
                case "multiply":
                  estBahanContribution =
                    calculationWeight !== 0 ? value / calculationWeight : 0;
                  break;
                case "divide":
                  estBahanContribution = value * calculationWeight;
                  break;
                default:
                  estBahanContribution = value - calculationWeight;
              }

              totalEstBahan += Math.max(0, estBahanContribution);
              calculationCount++;
            }
          }
        }
      });
    });

    // Return sum of all contributions (preserve decimal precision)
    return totalEstBahan;
  };

  const handleTerloadingChange = (
    poIndex: number,
    productIndex: number,
    bahanTabIndex: number,
    value: number
  ) => {
    setPOData((prevData) => {
      const newData = [...prevData];
      const po = newData[poIndex];
      const product = po.products[productIndex];
      const bahanTab = product.bahanTabs[bahanTabIndex];

      bahanTab.terloading = value;
      bahanTab.sisaBahan = calculateSisaBahan(value, bahanTab.bahanTerpakai);
      bahanTab.efisiensi = calculateEfisiensi(
        bahanTab.estBahan,
        bahanTab.bahanTerpakai
      );

      // Call API to persist the change
      if (product.poProductId) {
        debouncedPOProductUpdate(product.poProductId, { terloading: value });
      }

      return newData;
    });
  };

  const handleBahanTerpakaiChange = (
    poIndex: number,
    productIndex: number,
    bahanTabIndex: number,
    value: number
  ) => {
    setPOData((prevData) => {
      const newData = [...prevData];
      const po = newData[poIndex];
      const product = po.products[productIndex];
      const bahanTab = product.bahanTabs[bahanTabIndex];

      bahanTab.bahanTerpakai = value;
      bahanTab.sisaBahan = calculateSisaBahan(bahanTab.terloading, value);
      bahanTab.efisiensi = calculateEfisiensi(bahanTab.estBahan, value);

      // Call API to persist the change
      if (product.poProductId) {
        debouncedPOProductUpdate(product.poProductId, {
          bahan_terpakai: value,
        });
      }

      return newData;
    });
  };

  const handleEstBahanChange = (
    poIndex: number,
    productIndex: number,
    bahanTabIndex: number,
    value: number
  ) => {
    setPOData((prevData) => {
      const newData = [...prevData];
      const po = newData[poIndex];
      const product = po.products[productIndex];
      const bahanTab = product.bahanTabs[bahanTabIndex];

      // Update Est Bahan value
      bahanTab.estBahan = value;

      // Calculate new category values based on Est Bahan
      if (categories && categories.length > 0) {
        const calculatedValues = calculateCategoryValues(value, categories);

        // Update product's category data
        if (!product.categoryData) {
          product.categoryData = [];
        }

        // Apply calculated values to category data
        Object.keys(calculatedValues).forEach((categoryId) => {
          const category = categories.find((cat: any) => cat.id === categoryId);
          if (!category) return;

          // Find existing category data or create new one
          let categoryData = product.categoryData!.find(
            (cat) => cat.categoryId === categoryId
          );
          if (!categoryData) {
            categoryData = {
              categoryId: categoryId,
              categoryName: category.name,
              subcategoryValues: [],
            };
            product.categoryData!.push(categoryData);
          }

          // Update subcategory values
          Object.keys(calculatedValues[categoryId]).forEach((subcategoryId) => {
            const subcategory = category?.subcategories?.find(
              (sub) => sub.id === subcategoryId
            );
            if (!subcategory) return;

            // Find existing subcategory value or create new one
            let subcategoryValue = categoryData!.subcategoryValues.find(
              (sub) => sub.subcategoryId === subcategoryId
            );
            if (!subcategoryValue) {
              subcategoryValue = {
                subcategoryId: subcategoryId,
                subcategoryName: subcategory.name,
                value: calculatedValues[categoryId][subcategoryId],
                isTotalField: false,
                isEditableTotal: false,
                operator: "sum",
              };
              categoryData!.subcategoryValues.push(subcategoryValue);
            } else {
              subcategoryValue.value =
                calculatedValues[categoryId][subcategoryId];
            }
          });
        });
      }

      return newData;
    });
  };

  // Handle category value change
  const handleCategoryValueChange = (
    poIndex: number,
    productIndex: number,
    categoryId: string,
    subcategoryId: string,
    value: number
  ) => {
    // console.log("🎯 [BahanFields] handleCategoryValueChange called!", { poIndex, productIndex, categoryId, subcategoryId, value });

    setPOData((prev) => {
      const newItems = [...prev];
      const product = newItems[poIndex].products[productIndex];

      if (!product.categoryData) {
        product.categoryData = [];
      }

      // Find or create category data
      let categoryData = product.categoryData.find(
        (cat) => cat.categoryId === categoryId
      );
      if (!categoryData) {
        categoryData = {
          categoryId,
          categoryName: "",
          subcategoryValues: [],
        };
        product.categoryData.push(categoryData);
      }

      // Find or create subcategory value
      let subcategoryValue = categoryData.subcategoryValues.find(
        (sub) => sub.subcategoryId === subcategoryId
      );

      if (!subcategoryValue) {
        subcategoryValue = {
          subcategoryId,
          subcategoryName: "",
          value: 0,
        };
        categoryData.subcategoryValues.push(subcategoryValue);
      }

      // Update the value
      subcategoryValue.value = value;

      // Recalculate estBahan from updated category values
      if (categories && categories.length > 0) {
        const newEstBahan = calculateEstBahanFromCategories(
          product,
          categories
        );
        if (product.bahanTabs && product.bahanTabs.length > 0) {
          product.bahanTabs[0].estBahan = newEstBahan;

          // Recalculate efisiensi with the new estBahan
          const bahanTerpakai = product.bahanTabs[0].bahanTerpakai || 0;
          product.bahanTabs[0].efisiensi = calculateEfisiensi(
            newEstBahan,
            bahanTerpakai
          );
        }
      }

      // API update logic - Use the product's poProductId to find the correct POProduct
      const productPoProductId = product.poProductId;
      // console.log(`🔍 Product poProductId: ${productPoProductId}`);

      if (productPoProductId && poProductsResponse?.data) {
        // Find the POProduct using the product's poProductId
        const targetPOProduct = poProductsResponse.data.find(
          (poProduct: any) => poProduct.id === productPoProductId
        );

        if (targetPOProduct) {
          // console.log(`🎯 Found POProduct:`, targetPOProduct);

          // Find the junction_id from categories data first
          let junctionId: string | null = null;
          if (categories) {
            const category = categories.find((cat) => cat.id === categoryId);
            if (category) {
              const subcategory = category.subcategories?.find(
                (sub) => sub.id === subcategoryId
              );
              if (subcategory?.junction) {
                junctionId = subcategory.junction.id;
                // console.log(`🔗 Found junction_id: ${junctionId}`);
              }
            }
          }

          if (!junctionId) {
            console.error(
              `❌ Could not find junction_id for categoryId: ${categoryId}, subcategoryId: ${subcategoryId}`
            );
            message.error(
              "Failed to save category value: Missing junction data"
            );
            return newItems;
          }

          // Look for existing POProductCategory by junction_id (more reliable) or by categoryId/subcategoryId
          const existingCategory = targetPOProduct.categories?.find(
            (cat: any) =>
              cat.junction_id === junctionId ||
              (cat.categoryId === categoryId &&
                cat.subcategoryId === subcategoryId)
          );

          if (existingCategory) {
            // console.log(`🚀 Updating existing POProductCategory ID: ${existingCategory.id}, value: ${value}`);
            debouncedUpdate(existingCategory.id, value);
          } else {
            // console.log(`📝 Creating new POProductCategory for poProductId: ${targetPOProduct.id}, junction_id: ${junctionId}, value: ${value}`);

            // Create new POProductCategory with junction_id
            createPOProductCategoryMutation.mutate(
              {
                po_product_id: targetPOProduct.id,
                junction_id: junctionId,
                value: value,
              },
              {
                onSuccess: (response) => {
                  // console.log(`✅ Successfully created POProductCategory:`, response);
                  message.success("Category value saved successfully");
                },
                onError: (error) => {
                  console.error(
                    `❌ Failed to create POProductCategory:`,
                    error
                  );
                  message.error("Failed to save category value");
                },
              }
            );
          }
        } else {
          console.warn(
            `❌ Could not find POProduct with ID: ${productPoProductId}`
          );
        }
      } else {
        console.warn(
          `❌ Product missing poProductId or no POProducts data available`
        );
        console.warn(`Product:`, product);
        console.warn(
          `POProducts available:`,
          poProductsResponse?.data?.length || 0
        );
      }

      // Note: Total field calculations are now handled by the backend automatically
      // We'll refresh the data after the backend update completes to get the updated totals

      return newItems;
    });
  };

  const handleScanProduct = (poId: string) => {
    // Product scanning functionality to be implemented
  };

  const handleSelectProduct = async (poId: string, productId: string) => {
    // Find the selected product from hikmat items
    const selectedProduct = hikmatItems?.data?.find(
      (item: any) => item.id.toString() === productId
    );

    if (selectedProduct) {
      // Check if product already exists in this PO
      const currentPO = poData.find((po) => po.id === poId);
      const productExistsInCurrentPO = currentPO?.products.some(
        (p) => p.id === selectedProduct.id.toString()
      );

      if (productExistsInCurrentPO) {
        message.warning(
          `Product "${selectedProduct.name}" is already added to this PO!`
        );
        setSelectedProductIds((prev) => ({ ...prev, [poId]: "" }));
        return;
      }

      // Note: Removed validation for products existing in other POs
      // Different POs can have the same product - only prevent duplicates within the same PO

      try {
        // Create PO Product in the backend
        const poProductData = {
          po_id: poId,
          hikmat_product_id: selectedProduct.id.toString(),
          product_name: selectedProduct.name,
        };

        await createPOProductMutation.mutateAsync(poProductData);

        // Clear the dropdown selection
        setSelectedProductIds((prev) => ({ ...prev, [poId]: "" }));

        // Show success message
        message.success(
          `Product "${selectedProduct.name}" added successfully!`
        );

        // Note: No manual state update needed - the query invalidation will trigger a refetch
        // and the useEffect will update the local state with the fresh data from the backend
      } catch (error) {
        console.error("Failed to create PO Product:", error);
        message.error(
          `Failed to add product "${selectedProduct.name}". Please try again.`
        );
      }
    }
  };

  const handleOpenSummary = (poId: string) => {
    // Summary modal functionality to be implemented
  };

  // Show loading state
  if (isLoadingPOs || isLoadingPOProducts) {
    return (
      <div className="mt-6 max-w-[600px]">
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">
              {isLoadingPOs && isLoadingPOProducts
                ? "Loading Purchase Orders and Products..."
                : isLoadingPOs
                ? "Loading Purchase Orders..."
                : "Loading PO Products..."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (poError || poProductsError) {
    return (
      <div className="mt-6 max-w-[600px]">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-red-600 mr-3">⚠️</div>
            <div>
              <h3 className="text-red-800 font-medium">Failed to load data</h3>
              <p className="text-red-600 text-sm mt-1">
                {poError &&
                  (poError instanceof Error
                    ? poError.message
                    : "Failed to load Purchase Orders")}
                {poError && poProductsError && " | "}
                {poProductsError &&
                  (poProductsError instanceof Error
                    ? poProductsError.message
                    : "Failed to load PO Products")}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show empty state if no POs found
  if (poData.length === 0) {
    return (
      <div className="mt-6 max-w-[600px]">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <div className="text-gray-400 text-4xl mb-4">📦</div>
          <h3 className="text-gray-700 font-medium mb-2">
            No Purchase Orders Found
          </h3>
          <p className="text-gray-500 text-sm">
            No purchase orders are associated with this card yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 max-w-[600px]">
      {/* PO Sections */}
      <div className="space-y-8">
        {poData.map((po, index) => (
          <POSection
            key={po.id}
            po={po}
            index={index}
            colors={colors}
            selectedProductId={selectedProductIds[po.id] || ""}
            hikmatItems={hikmatItems?.data || []}
            isLoadingProducts={isLoadingProducts}
            categories={categories || []}
            isLoadingCategories={isLoadingCategories}
            onScanProduct={handleScanProduct}
            onSelectProduct={handleSelectProduct}
            onOpenSummary={handleOpenSummary}
            onTerloadingChange={handleTerloadingChange}
            onBahanTerpakaiChange={handleBahanTerpakaiChange}
            onEstBahanChange={handleEstBahanChange}
            onCategoryValueChange={handleCategoryValueChange}
            setPOData={setPOData}
            setSelectedProductIds={setSelectedProductIds}
            isCategoryLoading={isCategoryLoading}
            getCategoryError={getCategoryError}
            clearCategoryError={clearCategoryError}
          />
        ))}
      </div>
    </div>
  );
};

export default BahanFields;
