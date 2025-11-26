import React, { useState, useEffect, useRef } from "react";
import { message, Modal, Input } from "antd";
import { useSelector } from "react-redux";
import { selectTheme } from "@store/app_slice";
import { useQuery } from "@tanstack/react-query";
import { getAllAdjustmentItems, updateRequest } from "@api/accurate";
import { getOzzyBarcodeProduct, getOzzyProducts } from "@api/ozzy-warehouse";
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

  const [poData, setPOData] = useState<POItem[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<{ [poId: string]: string }>({});

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
  const {
    data: warehouseProducts = [],
    isLoading: isLoadingProducts,
  } = useQuery({
    queryKey: ["warehouse-products", "1880365"],
    queryFn: () => getOzzyProducts("1880365"),
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

  // Note: Removed complex mapping logic - now using direct POProduct access

  // Update local state when API data changes
  useEffect(() => {
    if (apiPOData?.length > 0) {
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

  const resolveProductKey = (product: any): string => {
    const rawKey =
      product?.accurateId ??
      product?.id ??
      product?.productId ??
      product?.accurate_id ??
      product?.product_id;
    return rawKey !== undefined && rawKey !== null ? rawKey.toString() : "";
  };

  const resolveProductUnit = (product: any): string | undefined => {
    if (!product) return undefined;
    if (product.unitType) return product.unitType;
    if ((product as any).unit_type) return (product as any).unit_type;

    const unitData = product.unitData ?? (product as any).unit_data;
    if (unitData) {
      try {
        const parsed =
          typeof unitData === "string" ? JSON.parse(unitData) : unitData;
        if (Array.isArray(parsed) && parsed.length > 0) {
          return (
            parsed[0]?.name ||
            parsed[0]?.unit ||
            parsed[0]?.unitType ||
            parsed[0]?.unit_type
          );
        }
      } catch (error) {
        console.warn("Failed to parse unit data for product", error);
      }
    }

    return undefined;
  };

  const handleTerloadingChange = async (
    poIndex: number,
    productIndex: number,
    bahanTabIndex: number,
    value: number
  ) => {
    let requestId: number | undefined;
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

      return newData;
    });

    if (requestId) {
      try {
        await updateRequest(requestId.toString(), {
          requestSent: value,
          requestAmount: value,
        });
      } catch (error) {
        console.error("❌ Failed to sync request terloading:", error);
        message.error("Gagal menyelaraskan nilai terloading ke request");
        throw error;
      }
    }
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

  const handleScanProduct = (poId: string) => {
    // Open scan modal and prepare to receive scanner input (external barcode/QR scanners act like keyboard)
    setScanTargetPOId(poId);
    setScannedValue("");
    scannerBufferRef.current = "";
    setScanModalOpen(true);
  };

  // --- Scan Produk modal state and handlers ---
  const [scanModalOpen, setScanModalOpen] = useState<boolean>(false);
  const [scanTargetPOId, setScanTargetPOId] = useState<string | null>(null);
  const [scannedValue, setScannedValue] = useState<string>("");
  const scannerBufferRef = useRef<string>("");
  const scannerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Note: We no longer suppress duplicate scanned values via a ref
  // because the new requirement is to sum quantity when scanning the same ID multiple times.

  // Listen for external scanner input when modal is open
  useEffect(() => {
    if (!scanModalOpen) return;

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
          message.success(`Scanned: ${value}`);
          // Close modal after receiving value
          setScanModalOpen(false);
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
  }, [scanModalOpen]);

  // After scan completes, fetch product by barcode and prefill dropdown with the matched item (safe: no DB writes)
  useEffect(() => {
    // Helper to robustly parse numbers that may come with locale separators
    const parseLocaleNumber = (input: any): number => {
      if (input === null || input === undefined) return 0;
      if (typeof input === "number") return Number.isFinite(input) ? input : 0;
      const str = String(input).trim();
      if (!str) return 0;
      // If both separators exist, assume '.' is thousands and ',' is decimal (id-ID style)
      const normalized = str.includes(".") && str.includes(",")
        ? str.replace(/\./g, "").replace(/,/g, ".")
        : str.replace(/,/g, ".");
      const n = Number(normalized);
      return Number.isFinite(n) ? n : 0;
    };

    const prefillProductFromScan = async () => {
      // Only act if we have a scanned value and a target PO
      if (!scannedValue || !scanTargetPOId) return;

      // Process the scanned value every time (even if same as previous) to support quantity summing

      try {
        // Call backend to resolve barcode -> product
        const result = await getOzzyBarcodeProduct(scannedValue);
        const accurateId = result?.product?.accurateId;
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
          return key === accurateId.toString();
        });

        if (!matchedItem) {
          message.error(
            `Scanned product (accurateId=${accurateId}) not found in product list.`
          );
          return;
        }

        // Check if product already exists in this PO
        const currentPOIndex = poData.findIndex((po) => po.id === scanTargetPOId);
        const currentPO = currentPOIndex !== -1 ? poData[currentPOIndex] : null;
        const matchedKey = resolveProductKey(matchedItem);
        if (!matchedKey) {
          message.error("Scanned product is missing an identifier.");
          return;
        }
        const existingProductIndex = currentPO
          ? currentPO.products.findIndex((p) => p.id === matchedKey)
          : -1;

        if (currentPO && existingProductIndex !== -1) {
          // Product already exists in this PO: sum the terloading with scanned quantity
          const existingProduct = currentPO.products[existingProductIndex];
          const currentTerloadingRaw = existingProduct?.bahanTabs?.[0]?.terloading ?? 0;
          const currentTerloading = parseLocaleNumber(currentTerloadingRaw);
          const newTerloading = currentTerloading + scannedQty;

          // Update local state and persist to backend
          handleTerloadingChange(currentPOIndex, existingProductIndex, 0, newTerloading);

          message.success(
            `Updated Terloading for ${matchedItem.name}: +${scannedQty} (total ${newTerloading})`
          );
        } else {
          // Product not yet in this PO: prefill dropdown and add it, then set initial Terloading from scanned quantity
          setSelectedProductIds((prev) => ({
            ...prev,
            [scanTargetPOId]: matchedKey,
          }));

          message.success(
            `Detected product: ${matchedItem.name}. Adding to PO with Terloading ${scannedQty}...`
          );
          await handleSelectProduct(
            scanTargetPOId,
            matchedKey,
            scannedQty
          );
        }
      } catch (error) {
        console.error("Failed to fetch product by scanned barcode:", error);
        message.error("Failed to resolve the scanned barcode. Please try again.");
      }
    };

    prefillProductFromScan();
    // We intentionally include warehouseProducts as a dependency to ensure matching when the list is ready
  }, [scannedValue, scanTargetPOId, warehouseProducts]);

  // Helper function to select appropriate GL account following modal request logic
  const selectGLAccount = async (selectedItem: any) => {
    // Starting GL account selection for item

    try {
      // Fetch GL accounts for the item's source
      const glAccountsResponse = await getAllAdjustmentItems(
        selectedItem?.source
      );
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
        const itemSource = selectedItem?.source;

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

          if (!suitableAccount && itemSource === "Hikmat") {
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
          if (!suitableAccount && itemSource) {
            suitableAccount = glaccounts.data.d.find(
              (acc: any) => acc.source === itemSource
            );
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
    productId: string,
    initialTerloading?: number
  ) => {
    // Starting product selection

    // Find the selected product from warehouse items
    const selectedProduct =
      (warehouseProducts || []).find(
        (item: any) => resolveProductKey(item) === productId
      ) || null;

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
        // Extract satuan from product unit data
        const satuan = resolveProductUnit(selectedProduct);

        // Extracted satuan and available units

        // Get GL account information using the same logic as modal request
        // Starting GL account selection

        const glAccountInfo = await selectGLAccount(selectedProduct);
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
          satuan,
          // Use GL account info from the helper function
          adjustment_no: glAccountInfo.adjustment_no,
          adjustment_name: glAccountInfo.adjustment_name,
        };

        const result = await createPOProductMutation.mutateAsync(poProductData);

        // Clear the dropdown selection
        setSelectedProductIds((prev) => ({ ...prev, [poId]: "" }));

        // Show success message
        message.success(
          `Product "${selectedProduct.name}" added successfully!`
        );

        // If this product was added as a result of a scan, set the initial Terloading
        // Access created POProduct ID from ApiResponse shape
        const createdPOProductId = (result as any)?.data?.id || (result as any)?.id;
        if (typeof initialTerloading === "number" && createdPOProductId) {
          try {
            // Persist Terloading to backend using the newly created POProduct ID
            debouncedPOProductUpdate(createdPOProductId, { terloading: initialTerloading });
          } catch (e) {
            console.error("❌ Failed to set initial Terloading:", e);
          }
        }

        // Note: No manual state update needed - the query invalidation will trigger a refetch
        // and the useEffect will update the local state with the fresh data from the backend
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
            onScanProduct={handleScanProduct}
            onSelectProduct={handleSelectProduct}
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
        onCancel={() => setScanModalOpen(false)}
        footer={null}
      >
        <div className="space-y-3">
          <div className="text-sm text-gray-600">Ready for scan</div>
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
        </div>
      </Modal>
    </div>
  );
};

export default BahanFields;
