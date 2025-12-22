import React, { useState, useEffect, useRef, useCallback } from "react";
import { message, Modal, Input, Button } from "antd";
import { useSelector } from "react-redux";
import { selectTheme } from "@store/app_slice";
import { useQuery } from "@tanstack/react-query";
import { getAllAdjustmentItems, updateRequest } from "@api/accurate";
import {
  getCombinedOzzyProducts,
  getOzzyBarcodeProduct,
} from "@api/ozzy-warehouse";
import { useCategoriesWithSubcategories } from "@hooks/category";
import {
  usePOProductsByCardId,
  transformPOProductToProductItem,
  useCreatePOProduct,
  useCreatePOProductCategory,
  useUpdatePOProduct,
} from "@hooks/usePOProducts";
import { Scanner } from "@yudiel/react-qr-scanner";
import { useDebouncedCategoryUpdate } from "@hooks/useDebouncedCategoryUpdate";
import { useDebouncedPOProductUpdate } from "@hooks/useDebouncedPOProductUpdate";
import POSection from "./POSection";
import { BahanFieldsProps, POItem, ProductItem } from "./types";
import { usePOsByCardId } from "./hooks/usePOsByCardId";
import {
  getUnitPriceFromProduct,
  resolveProductSource,
  buildProductSelectionKey,
  parseProductSelectionKey,
  resolveAccurateDbId,
  resolveProductKey,
  resolveProductUnit,
} from "./productHelpers";
import { buildRequestItemMeta } from "./requestPayload";

const getRequestedSkuForBahanFields = (
  item?: any
): string | undefined => {
  if (!item) return undefined;

  const composite = buildProductSelectionKey(item);
  if (composite) return composite;

  const candidate =
    item.sku ??
    item.productSku ??
    item.product_code ??
    item.productCode ??
    item.barcode ??
    item.warehouseProduct?.sku ??
    item.warehouseProduct?.productSku ??
    item.warehouseProduct?.product_code ??
    item.warehouseProduct?.productCode ??
    item.warehouseProduct?.barcode;

  if (candidate === undefined || candidate === null) {
    return undefined;
  }

  const trimmed = String(candidate).trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const BahanFields: React.FC<BahanFieldsProps> = ({ cardId, workspaceId }) => {
  const theme = useSelector(selectTheme);
  const { colors } = theme;

  const [poData, setPOData] = useState<POItem[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<{
    [poId: string]: string;
  }>({});

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

  // Debug information available for troubleshooting

  // Load products from Warehouse API
  const { data: warehouseProducts = [], isLoading: isLoadingProducts } =
    useQuery({
      queryKey: ["warehouse-products", "hikmat-mpi"],
      queryFn: async () => {
        const products = await getCombinedOzzyProducts();
        return products.filter((item) => {
          const source = resolveProductSource(item);
          return source === "Hikmat" || source === "MPI";
        });
      },
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
      // Category value updated successfully
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
      // POProduct value updated successfully
    },
    onError: (error) => {
      console.error("❌ Failed to update POProduct value:", error);
      message.error("Failed to save product changes");
    },
  });
  const updatePOProductMutation = useUpdatePOProduct();

  // Note: Removed complex mapping logic - now using direct POProduct access

  // Update local state when API data changes
  useEffect(() => {
    if (apiPOData?.length > 0) {
      const updatedPOData = [...apiPOData];

      // Seed existing products to preserve local edits (e.g., scanned terloading) across refetches
      updatedPOData.forEach((po) => {
        const existing = poData.find((p) => p.id === po.id);
        if (existing) {
          po.products = existing.products ? [...existing.products] : [];
        }
      });

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
              // Product exists, transform normally (no Total field precanervation needed)
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

          // Track products before and after merge for debugging

          if (relatedProducts.length > 0) {
            // Merge with existing products, avoiding duplicates and preserving calculated values
            const existingProductPoIds = new Set(
              po.products.map((p) => p.poProductId)
            );

            // Separate new products from existing ones that need updates
            const newProducts = relatedProducts.filter(
              (p) => !existingProductPoIds.has(p.poProductId)
            );
            const updatedProducts = relatedProducts.filter((p) =>
              existingProductPoIds.has(p.poProductId)
            );

            // Process new and updated products

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

                // Preserve orderCreated status and request linkage to prevent UI state loss after API refetch
                updatedProduct.orderCreated = existingProduct.orderCreated;
                updatedProduct.requestId = existingProduct.requestId;

                po.products[existingIndex] = updatedProduct;
              }
            });

            // Add only truly new products
            po.products = [...po.products, ...newProducts];

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
                }
              }

              // Note: Total field calculations are now handled purely in the frontend (CategorySection.tsx)
            });
          }
        });
      }

      updatedPOData.forEach((po) => {
        po.products.forEach((product) => mapWarehouseProduct(product));
      });
      setPOData(updatedPOData);
      setSelectedProductIds({}); // Reset selected products when PO data changes
    }
  }, [apiPOData, poProductsResponse, warehouseProducts]);

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
    return estBahan - bahanTerpakai;
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
                  estBahanContribution = value * calculationWeight;
                  break;
                case "divide":
                  estBahanContribution =
                    calculationWeight !== 0 ? value / calculationWeight : 0;
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

  const mapWarehouseProduct = (product: ProductItem) => {
    if (!warehouseProducts || warehouseProducts.length === 0) {
      return product;
    }

    const targetId = resolveProductKey(product);
    const targetDbId = resolveAccurateDbId(product);

    const candidates = warehouseProducts.filter((item: any) => {
      const keyMatches = resolveProductKey(item) === targetId;
      if (!keyMatches) return false;

      if (targetDbId) {
        const itemDbId = resolveAccurateDbId(item);
        return itemDbId ? itemDbId === targetDbId : false;
      }

      return true;
    });

    let match: any = null;
    if (candidates.length === 1) {
      match = candidates[0];
    } else if (candidates.length > 1) {
      // Prefer exact name match when DB id is unknown
      const byName = candidates.find(
        (item: any) => item.name && product.name && item.name === product.name
      );
      match = byName ?? candidates[0];
    }

    if (match) {
      product.warehouseProduct = match;
      const resolvedSource = resolveProductSource(match);
      if (resolvedSource && !(product as any).source) {
        (product as any).source = resolvedSource;
      }
      const accurateDbId = resolveAccurateDbId(match);
      if (accurateDbId && !(product as any).accurateDbId) {
        (product as any).accurateDbId = accurateDbId;
      }
    }

    return product;
  };

  const handleTerloadingChange = async (
    poIndex: number,
    productIndex: number,
    bahanTabIndex: number,
    value: number,
    resolvedProduct?: any
  ) => {
    let requestId: number | undefined;
    let snapshotProduct: any | null = null;
    const payloadProduct = resolvedProduct ?? null;

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

      requestId = product.requestId;
      snapshotProduct = product;

      return newData;
    });

    if (requestId) {
      try {
        const productForPayload = payloadProduct || snapshotProduct;
        if (!productForPayload) return;

        const meta = buildRequestItemMeta(productForPayload);

        const latestBahanTab =
          snapshotProduct?.bahanTabs?.[bahanTabIndex] ?? null;
        const estBahanValue =
          latestBahanTab?.estBahan ?? value ?? null;
        const efisiensiValue =
          (latestBahanTab?.estBahan ?? value ?? 0) -
          (latestBahanTab?.bahanTerpakai ?? 0);
        const requestSource =
          resolveProductSource(productForPayload) ?? "Hikmat";

        const payload: Record<string, any> = {
          requestSent: value,
          requestAmount: value,
          request_type: "NEW_ORDER",
          item_name: meta.item_name,
          satuan: meta.satuan,
          unit_price: meta.unit_price,
          beli: "Tidak",
          est_bahan: estBahanValue,
          efisiensi: efisiensiValue,
        };

        payload.source = meta.source ?? requestSource;

        if (meta.requested_item_id) {
          payload.requested_item_id = meta.requested_item_id;
        }

        await updateRequest(requestId.toString(), payload);
      } catch (error) {
        console.error("❌ Failed to sync request terloading:", error);
        message.error("Gagal menyelaraskan nilai terloading ke request");
        throw error;
      }
    }
  };

  const handleBahanTerpakaiChange = async (
    poIndex: number,
    productIndex: number,
    bahanTabIndex: number,
    value: number,
    resolvedProduct?: any
  ) => {
    let requestId: number | undefined;
    let sentValue = 0;
    let snapshotProduct: any | null = null;
    const payloadProduct = resolvedProduct ?? null;

    setPOData((prevData) => {
      const newData = [...prevData];
      const po = newData[poIndex];
      const product = po.products[productIndex];
      const bahanTab = product.bahanTabs[bahanTabIndex];

      bahanTab.bahanTerpakai = value;
      bahanTab.sisaBahan = calculateSisaBahan(bahanTab.terloading, value);
      bahanTab.efisiensi = calculateEfisiensi(bahanTab.estBahan, value);

      requestId = product.requestId;
      snapshotProduct = product;
      sentValue = bahanTab.terloading ?? 0;

      if (product.poProductId) {
        debouncedPOProductUpdate(product.poProductId, {
          bahan_terpakai: value,
        });
      }

      return newData;
    });

    if (requestId !== undefined) {
      const leftValue = Math.max(sentValue - value, 0);
      try {
        const productForPayload = payloadProduct || snapshotProduct;
        if (!productForPayload) return;

        const meta = buildRequestItemMeta(productForPayload);

        const latestBahanTab =
          snapshotProduct?.bahanTabs?.[bahanTabIndex] ?? null;
        const estBahanValue =
          latestBahanTab?.estBahan ?? sentValue ?? null;
        const efisiensiValue =
          (latestBahanTab?.estBahan ?? sentValue ?? 0) - value;
        const requestSource =
          resolveProductSource(productForPayload) ?? "Hikmat";

        const payload: Record<string, any> = {
          requestReceived: value,
          requestLeft: leftValue,
          request_type: "NEW_ORDER",
          item_name: meta.item_name,
          satuan: meta.satuan,
          unit_price: meta.unit_price,
          beli: "Tidak",
          est_bahan: estBahanValue,
          efisiensi: efisiensiValue,
        };

        payload.source = meta.source ?? requestSource;

        if (meta.requested_item_id) {
          payload.requested_item_id = meta.requested_item_id;
        }

        await updateRequest(requestId.toString(), payload);
      } catch (error) {
        console.error("❌ Failed to sync request terpakai:", error);
        message.error("Gagal menyelaraskan bahan terpakai ke request");
        throw error;
      }
    }
  };

  const handleEstBahanChange = (
    poIndex: number,
    productIndex: number,
    bahanTabIndex: number,
    value: number
  ) => {
    let requestId: number | undefined;
    let efisiensiValue: number | null = null;

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

      // Calculate efisiensi from updated Est Bahan and current pemakaian
      efisiensiValue =
        (bahanTab.estBahan ?? 0) - (bahanTab.bahanTerpakai ?? 0);
      bahanTab.efisiensi = efisiensiValue;

      requestId = product.requestId;

      return newData;
    });

    if (requestId !== undefined) {
      updateRequest(requestId.toString(), {
        est_bahan: value,
        efisiensi: efisiensiValue ?? null,
      }).catch((error) => {
        console.error("❌ Failed to sync est_bahan/efisiensi:", error);
        message.error("Gagal menyimpan Est Bahan & efisiensi ke request");
        throw error;
      });
    }
  };

  // Handle category value change
  const handleCategoryValueChange = (
    poIndex: number,
    productIndex: number,
    categoryId: string,
    subcategoryId: string,
    value: number
  ) => {
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

      if (productPoProductId && poProductsResponse?.data) {
        // Find the POProduct using the product's poProductId
        const targetPOProduct = poProductsResponse.data.find(
          (poProduct: any) => poProduct.id === productPoProductId
        );

        if (targetPOProduct) {
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
            debouncedUpdate(existingCategory.id, value);
          } else {
            // Create new POProductCategory with junction_id
            createPOProductCategoryMutation.mutate(
              {
                po_product_id: targetPOProduct.id,
                junction_id: junctionId,
                value: value,
              },
              {
                onSuccess: (response) => {
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
      }

      // Note: Total field calculations are now handled by the backend automatically
      // We'll refresh the data after the backend update completes to get the updated totals

      return newItems;
    });
  };

  // Handle order status change
  const handleOrderStatusChange = (
    poIndex: number,
    productIndex: number,
    orderCreated: boolean,
    requestId?: number | null
  ) => {
    setPOData((prevData) => {
      const newData = [...prevData];
      const po = newData[poIndex];
      const product = po.products[productIndex];

      // Update local state
      product.orderCreated = orderCreated;
      if (requestId !== undefined && requestId !== null) {
        product.requestId = requestId;
      }

      // Call API to persist the change
      if (product.poProductId) {
        debouncedPOProductUpdate(product.poProductId, {
          orderCreated: orderCreated,
        });
      }

      return newData;
    });
  };

  const handleOpenCameraScan = (poId: string) => {
    // Open scan modal for camera scanning (dev helper)
    setScanTargetPOId(poId);
    setScannedValue("");
    scannerBufferRef.current = "";
    setUseCameraScanner(true);
    setScanModalOpen(true);
  };

  const handleProductInputFocus = (poId: string) => {
    setScanTargetPOId(poId);
  };

  const handleInlineScanValue = (poId: string, value: string) => {
    enqueueScan(poId, value);
    scannerBufferRef.current = "";
    setUseCameraScanner(false);
  };

  // --- Scan Produk modal state and handlers ---
  const [scanModalOpen, setScanModalOpen] = useState<boolean>(false);
  const [scanTargetPOId, setScanTargetPOId] = useState<string | null>(null);
  const [scannedValue, setScannedValue] = useState<string>(""); // display last scanned
  const [useCameraScanner, setUseCameraScanner] = useState<boolean>(false);
  const scannerBufferRef = useRef<string>("");
  const scannerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scanQueueRef = useRef<{ poId: string; value: string }[]>([]);
  const isProcessingScanRef = useRef<boolean>(false);
  // Note: We no longer suppress duplicate scanned values via a ref
  // because the new requirement is to sum quantity when scanning the same ID multiple times.
  const isDevMode = process.env.NODE_ENV !== "production";

  const enqueueScan = (poId: string, value: string) => {
    const trimmed = value.trim();
    if (!trimmed || !poId) return;
    scanQueueRef.current.push({ poId, value: trimmed });
    setScannedValue(trimmed);
    setScanTargetPOId(poId);
    processScanQueue();
  };

  const handleCameraScan = (value?: string) => {
    if (!value) return;
    if (!scanTargetPOId) {
      message.error("Pilih PO dulu sebelum scan.");
      return;
    }
    enqueueScan(scanTargetPOId, value);
    // setScanModalOpen(false);
    setUseCameraScanner(false);
  };

  // Listen for external scanner input when modal is open
  useEffect(() => {
    if (!scanModalOpen || useCameraScanner) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore modifier keys and navigation keys
      if (
        [
          "Shift",
          "Control",
          "Alt",
          "Meta",
          "CapsLock",
          "Tab",
          "Escape",
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
        ].includes(event.key)
      ) {
        return;
      }

      if (event.key === "Enter") {
        const value = scannerBufferRef.current.trim();
        if (value.length > 0) {
          setScannedValue(value);
          // setScanModalOpen(false);
        }
        // Reset buffer
        scannerBufferRef.current = "";
        if (scannerTimeoutRef.current) {
          clearTimeout(scannerTimeoutRef.current);
          scannerTimeoutRef.current = null;
        }
        return;
      }

      // Accumulate characters quickly sent by scanners
      if (event.key.length === 1) {
        scannerBufferRef.current += event.key;
        // Clear buffer shortly after input bursts (typical scanner behavior)
        if (scannerTimeoutRef.current) {
          clearTimeout(scannerTimeoutRef.current);
        }
        scannerTimeoutRef.current = setTimeout(() => {
          scannerBufferRef.current = "";
        }, 150);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (scannerTimeoutRef.current) {
        clearTimeout(scannerTimeoutRef.current);
        scannerTimeoutRef.current = null;
      }
    };
  }, [scanModalOpen, useCameraScanner]);

  // Helper to robustly parse numbers that may come with locale separators
  const parseLocaleNumber = useCallback((input: any): number => {
    if (input === null || input === undefined) return 0;
    if (typeof input === "number") return Number.isFinite(input) ? input : 0;
    const str = String(input).trim();
    if (!str) return 0;
    // If both separators exist, assume '.' is thousands and ',' is decimal (id-ID style)
    const normalized =
      str.includes(".") && str.includes(",")
        ? str.replace(/\./g, "").replace(/,/g, ".")
        : str.replace(/,/g, ".");
    const n = Number(normalized);
    return Number.isFinite(n) ? n : 0;
  }, []);

  const processScannedItem = useCallback(
    async (poId: string, value: string) => {
      if (!poId || !value) return;

      try {
        // Call backend to resolve barcode -> product
        const result = await getOzzyBarcodeProduct(value);
        const accurateId = result?.product?.accurateId;
        const accurateDbId = resolveAccurateDbId(result?.product);
        const scannedQtyRaw = result?.quantity ?? "0";
        // Quantity comes as string from API; parse to number safely (supports id-ID separators)
        const scannedQty = parseLocaleNumber(scannedQtyRaw);

        if (!accurateId) {
          message.error("No product found for the scanned barcode.");
          return;
        }

        // Ensure product list is available
        const items = warehouseProducts || [];
        if (!items || items.length === 0) {
          message.warning(
            "Products are still loading or not available. Please try again shortly."
          );
          return;
        }

        // Find the item in product list that matches the accurateId from scan
        const matchedItem = items.find((item: any) => {
          const key = resolveProductKey(item);
          if (key !== accurateId.toString()) {
            return false;
          }

          if (accurateDbId) {
            const itemDbId = resolveAccurateDbId(item);
            return itemDbId ? itemDbId === accurateDbId.toString() : false;
          }

          return true;
        });

        if (!matchedItem) {
          message.error(
            `Scanned product (accurateId=${accurateId}) not found in product list.`
          );
          return;
        }

        // Check if product already exists in this PO
        const currentPOIndex = poData.findIndex((po) => po.id === poId);
        const currentPO =
          currentPOIndex !== -1 ? poData[currentPOIndex] : null;
        const matchedSelectionKey =
          buildProductSelectionKey(matchedItem) ||
          resolveProductKey(matchedItem);
        const { productId: matchedProductId } =
          parseProductSelectionKey(matchedSelectionKey);
        if (!matchedSelectionKey || !matchedProductId) {
          message.error("Scanned product is missing an identifier.");
          return;
        }
        const existingProductIndex = currentPO
          ? currentPO.products.findIndex((p) => p.id === matchedProductId)
          : -1;

        if (currentPO && existingProductIndex !== -1) {
          // Product already exists in this PO: sum the terloading with scanned quantity
          const existingProduct = currentPO.products[existingProductIndex];
          const currentTerloadingRaw =
            existingProduct?.bahanTabs?.[0]?.terloading ?? 0;
          const currentTerloading = parseLocaleNumber(currentTerloadingRaw);
          const newTerloading = currentTerloading + scannedQty;

          // Update local state and persist to backend
          await handleTerloadingChange(
            currentPOIndex,
            existingProductIndex,
            0,
            newTerloading
          );
        } else {
          // Product not yet in this PO: prefill dropdown and add it, then set initial Terloading from scanned quantity
          setSelectedProductIds((prev) => ({
            ...prev,
            [poId]: matchedProductId,
          }));

          await handleSelectProduct(
            poId,
            matchedSelectionKey,
            scannedQty,
            matchedItem
          );
        }
      } catch (error) {
        console.error("Failed to fetch product by scanned barcode:", error);
        message.error(
          "Failed to resolve the scanned barcode. Please try again."
        );
      }
    },
    [
      handleTerloadingChange,
      poData,
      warehouseProducts,
      parseLocaleNumber,
    ]
  );

  const processScanQueue = useCallback(async () => {
    if (isProcessingScanRef.current) return;
    const next = scanQueueRef.current.shift();
    if (!next) return;
    isProcessingScanRef.current = true;
    try {
      await processScannedItem(next.poId, next.value);
    } finally {
      isProcessingScanRef.current = false;
      if (scanQueueRef.current.length > 0) {
        processScanQueue();
      }
    }
  }, [processScannedItem]);

  // Helper function to select appropriate GL account following modal request logic
  const selectGLAccount = async (selectedItem: any) => {
    // Starting GL account selection for item

    try {
      // Fetch GL accounts for the item's source
      const itemSource = resolveProductSource(selectedItem) ?? "Hikmat";
      const glAccountsResponse = await getAllAdjustmentItems(itemSource);
      const glaccounts = glAccountsResponse;

      // GL accounts response received

      if (glaccounts && glaccounts.data && glaccounts.data.d) {
        // First, try to get Inventory GL account from item category (this is the correct field for adjustment)
        const inventoryGlAccountId =
          selectedItem?.itemCategory?.parent?.inventoryGlAccountId;

        if (inventoryGlAccountId) {
          const matchingGlAccount = glaccounts.data.d.find(
            (acc: any) => acc.id === inventoryGlAccountId
          );

          if (matchingGlAccount) {
            return {
              adjustment_no: matchingGlAccount.no,
              adjustment_name: matchingGlAccount.name,
            };
          }
        }

        // Fallback: try COGS GL account if inventory account not found
        const cogsGlAccountId =
          selectedItem?.itemCategory?.parent?.cogsGlAccountId;

        if (cogsGlAccountId) {
          const matchingGlAccount = glaccounts.data.d.find(
            (acc: any) => acc.id === cogsGlAccountId
          );

          if (matchingGlAccount) {
            return {
              adjustment_no: matchingGlAccount.no,
              adjustment_name: matchingGlAccount.name,
            };
          }
        }

        const rawCategoryName =
          selectedItem?.itemCategory?.name ||
          (selectedItem as any)?.categoryName ||
          (selectedItem as any)?.category_name;
          const itemCategoryName = rawCategoryName
            ? rawCategoryName.toLowerCase()
            : "";
          const normalizedSource = itemSource
            ? itemSource.toLowerCase()
            : null;

          let suitableAccount = null;

          if (itemCategoryName) {
            suitableAccount = glaccounts.data.d.find((acc: any) => {
            const accountName = acc.name.toLowerCase();
            const cleanAccountName = accountName
              .replace("hpp ", "")
              .replace("beban ", "");

            const directMatch = accountName.includes(itemCategoryName);
            const reverseMatch = itemCategoryName.includes(cleanAccountName);

                return directMatch || reverseMatch;
              });

              if (!suitableAccount && normalizedSource === "hikmat") {
                const hikmatCategoryKeywords = [
                  "krah",
                  "manset",
                  "rib",
              "bahan",
              "kain",
            ];

            const matchingKeyword = hikmatCategoryKeywords.find((keyword) =>
              itemCategoryName.includes(keyword)
            );

            if (matchingKeyword) {
              suitableAccount = glaccounts.data.d.find((acc: any) => {
                const accountName = acc.name.toLowerCase();
                return (
                  accountName.includes(matchingKeyword) ||
                  accountName.includes("penyesuaian " + matchingKeyword) ||
                  accountName.includes("beban penyesuaian " + matchingKeyword)
                );
              });
            }

            if (!suitableAccount) {
              suitableAccount = glaccounts.data.d.find((acc: any) => {
                const accountName = acc.name.toLowerCase();
                return (
                  accountName.includes("hikmat") ||
                  accountName.includes("adjustment hikmat") ||
                  accountName.includes("bahan hikmat")
                );
              });
            }
              }

              // General fallback: Use the first available account from the same source
              if (!suitableAccount && normalizedSource) {
                suitableAccount = glaccounts.data.d.find((acc: any) => {
                  const accountSource = (acc.source || "").toLowerCase();
                  return accountSource === normalizedSource;
                });
              }

              // Last resort: Use the first available account
          if (!suitableAccount && glaccounts.data.d.length > 0) {
            suitableAccount = glaccounts.data.d[0];
          }

          if (suitableAccount) {
            return {
              adjustment_no: suitableAccount.no,
              adjustment_name: suitableAccount.name,
            };
          }
        }
      }
    } catch (error) {
      console.error("🔍 [PO PROD DEBUG] Failed to fetch GL accounts:", error);
    }

    // Return undefined values if no suitable account found
    return {
      adjustment_no: undefined,
      adjustment_name: undefined,
    };
  };

  const handleSelectProduct = async (
    poId: string,
    productSelectionValue: string,
    initialTerloading?: number,
    preselectedProduct?: any
  ) => {
    // Starting product selection

    const {
      productId: parsedProductId,
      accurateDbId: parsedAccurateDbId,
      source: parsedSource,
    } = parseProductSelectionKey(productSelectionValue);
    const targetProductId = parsedProductId || productSelectionValue;
    if (!targetProductId) {
      message.error("Selected product is missing an identifier");
      setSelectedProductIds((prev) => ({ ...prev, [poId]: "" }));
      return;
    }

    // Find the selected product from warehouse items
    const selectedProduct =
      preselectedProduct ??
      ((warehouseProducts || []).find((item: any) => {
        const keyMatches = resolveProductKey(item) === targetProductId;
        if (!keyMatches) return false;

        if (parsedAccurateDbId) {
          const itemDbId = resolveAccurateDbId(item);
          if (!itemDbId || itemDbId !== parsedAccurateDbId) {
            return false;
          }
        } else if (parsedSource) {
          const itemSource = resolveProductSource(item);
          if (itemSource && itemSource !== parsedSource) {
            return false;
          }
        }

        return true;
      }) ?? null);

    // Selected product found

    if (selectedProduct) {
      const productKey = resolveProductKey(selectedProduct);
      if (!productKey) {
        message.error("Selected product is missing an identifier");
        setSelectedProductIds((prev) => ({ ...prev, [poId]: "" }));
        return;
      }

      // Check if product already exists in this PO
      const currentPO = poData.find((po) => po.id === poId);
      const productExistsInCurrentPO = currentPO?.products.some(
        (p) => p.id === productKey
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
        const productSource =
          parsedSource ?? resolveProductSource(selectedProduct);
        const accurateDbId = resolveAccurateDbId(selectedProduct);

        // Extract satuan from product unit data
        const satuan = resolveProductUnit(selectedProduct);
        const hasInitialTerloading =
          typeof initialTerloading === "number" &&
          Number.isFinite(initialTerloading);

        // Extracted satuan and available units

        // Get GL account information using the same logic as modal request
        // Starting GL account selection

        const glAccountInfo = await selectGLAccount({
          ...selectedProduct,
          source: productSource ?? selectedProduct.source,
        });
        // GL account selection completed

        // Additional validation
        if (!glAccountInfo.adjustment_no || !glAccountInfo.adjustment_name) {
          console.warn(
            "⚠️ [PO PROD DEBUG] GL account selection failed! Missing adjustment_no or adjustment_name"
          );
          console.warn(
            "⚠️ [PO PROD DEBUG] This will result in incomplete data being sent to backend"
          );
        }

        // Create PO Product in the backend with new fields
        const poProductData = {
          po_id: poId,
          hikmat_product_id: productKey,
          product_name: selectedProduct.name,
          terloading: hasInitialTerloading ? initialTerloading : undefined,
          satuan,
          // Use GL account info from the helper function
          adjustment_no: glAccountInfo.adjustment_no,
          adjustment_name: glAccountInfo.adjustment_name,
        };

        const result = await createPOProductMutation.mutateAsync(poProductData);

        // Clear the dropdown selection
        setSelectedProductIds((prev) => ({ ...prev, [poId]: "" }));

        // If this product was added as a result of a scan, set the initial Terloading
        // Access created POProduct ID from ApiResponse shape
        const createdPOProductId =
          (result as any)?.data?.id || (result as any)?.id;
        if (hasInitialTerloading && createdPOProductId) {
          try {
            // Persist Terloading to backend immediately for newly created products
            await updatePOProductMutation.mutateAsync({
              id: createdPOProductId,
              data: { terloading: initialTerloading },
            });
            // Also queue debounced update to catch any rapid follow-ups
            debouncedPOProductUpdate(createdPOProductId, {
              terloading: initialTerloading,
            });
          } catch (e) {
            console.error("❌ Failed to set initial Terloading:", e);
          }

          // Optimistically add the new product with its initial terloading so the UI reflects the scanned qty immediately
          setPOData((prevData) =>
            prevData.map((poItem) => {
              if (poItem.id !== poId) return poItem;

              const alreadyExists = poItem.products.some(
                (p) =>
                  p.poProductId === createdPOProductId ||
                  p.id === productKey
              );
              if (alreadyExists) return poItem;

              const terloadingValue = initialTerloading ?? 0;

              const newProduct: ProductItem = {
                id: productKey,
                name: selectedProduct.name,
                poProductId: createdPOProductId,
                source: productSource,
                accurateDbId: accurateDbId,
                satuan,
                adjustment_no: glAccountInfo.adjustment_no,
                adjustment_name: glAccountInfo.adjustment_name,
                orderCreated: false,
                bahanTabs: [
                  {
                    id: createdPOProductId,
                    name: selectedProduct.name,
                    description: selectedProduct.description ?? null,
                    terloading: terloadingValue,
                    bahanTerpakai: 0,
                    sisaBahan: calculateSisaBahan(terloadingValue, 0),
                    jmlProduksi: 0,
                    estBahan: 0,
                    efisiensi: calculateEfisiensi(0, 0),
                  },
                ],
                categoryData: [],
                warehouseProduct: selectedProduct,
              };

              return {
                ...poItem,
                products: [...poItem.products, newProduct],
              };
            })
          );
        }

        // Product selection completed
      } catch (error) {
        console.error("🚀 [PO PROD DEBUG] Failed to create PO Product:", error);
        message.error(
          `Failed to add product "${selectedProduct.name}". Please try again.`
        );
      }
    } else {
      message.error("Selected product not found.");
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
            products={warehouseProducts || []}
            isLoadingProducts={isLoadingProducts}
            categories={categories || []}
            isLoadingCategories={isLoadingCategories}
            onSelectProduct={handleSelectProduct}
            onProductInputFocus={handleProductInputFocus}
            onScanValue={handleInlineScanValue}
            onOpenCameraScan={isDevMode ? handleOpenCameraScan : undefined}
            onOpenSummary={handleOpenSummary}
            onTerloadingChange={handleTerloadingChange}
            onBahanTerpakaiChange={handleBahanTerpakaiChange}
            onEstBahanChange={handleEstBahanChange}
            onCategoryValueChange={handleCategoryValueChange}
            onOrderStatusChange={handleOrderStatusChange}
            setPOData={setPOData}
            setSelectedProductIds={setSelectedProductIds}
            isCategoryLoading={isCategoryLoading}
            getCategoryError={getCategoryError}
            clearCategoryError={clearCategoryError}
          />
        ))}
      </div>

      {/* Scan Produk Modal */}
      <Modal
        title="Scan Produk"
        open={scanModalOpen}
        onCancel={() => {
          setScanModalOpen(false);
          setUseCameraScanner(false);
        }}
        footer={null}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              {useCameraScanner
                ? "Scan using your device camera"
                : "Ready for scan"}
            </span>
            {isDevMode && (
              <Button
                size="small"
                type={useCameraScanner ? "default" : "primary"}
                onClick={() => {
                  setUseCameraScanner((prev) => !prev);
                  scannerBufferRef.current = "";
                }}
              >
                {useCameraScanner ? "Use scanner input" : "Use camera (dev)"}
              </Button>
            )}
          </div>

          {useCameraScanner ? (
            <div className="relative w-full overflow-hidden rounded-md border border-gray-200">
              <div className="aspect-[4/3] w-full">
                <Scanner
                  onScan={(result) => {
                    const raw =
                      (result && result[0]?.rawValue) ||
                      (Array.isArray(result) && typeof result[0] === "string"
                        ? result[0]
                        : null);
                    if (raw) {
                      handleCameraScan(raw);
                    }
                  }}
                  onError={(error) => {
                    console.error("Scanner error:", error);
                    message.error("Camera scanning failed. Please try again.");
                  }}
                  styles={{
                    container: { width: "100%", height: "100%" },
                    video: { width: "100%", height: "100%" },
                  }}
                />
              </div>
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-40 h-40 border-2 border-green-500/80 rounded-md" />
              </div>
            </div>
          ) : (
            <>
              <Input
                readOnly
                value={scannedValue}
                placeholder="Scan with your external scanner. Press Enter to submit."
              />
              {scanTargetPOId && (
                <div className="text-xs text-gray-500">
                  Target PO: {scanTargetPOId}
                </div>
              )}
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default BahanFields;
