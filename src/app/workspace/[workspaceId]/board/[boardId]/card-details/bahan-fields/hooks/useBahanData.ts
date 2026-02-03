import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePOsByCardId } from "./usePOsByCardId";
import { usePOProductsByCardId, transformPOProductToProductItem } from "@hooks/usePOProducts";
import { POItem, ProductItem, BahanTab } from "../types";

interface UseBahanDataResult {
    poData: POItem[];
    isLoading: boolean;
    refetchPOs: () => Promise<void>;
    refetchProducts: () => Promise<void>;
    updateLocalProduct: (
        poId: string,
        productId: string,
        updates: Partial<BahanTab>
    ) => void;
    setPoData: React.Dispatch<React.SetStateAction<POItem[]>>;
}

/**
 * Centralized hook for fetching, merging, and managing Bahan data.
 * This hook ensures all data normalization (e.g., null vs 0) happens in one place.
 */
export const useBahanData = (
    cardId: string,
    categories?: any[],
    warehouseProducts?: any[],
    calculateEstBahanFromCategories?: (product: ProductItem, categories: any[]) => number
): UseBahanDataResult => {
    const [poData, setPoData] = useState<POItem[]>([]);

    // Fetch POs and Products
    const {
        data: apiPOData,
        isLoading: isPOLoading,
        refetch: refetchPOsInternal,
    } = usePOsByCardId(cardId);

    const {
        data: poProductsResponse,
        isLoading: isProductsLoading,
        refetch: refetchProductsInternal,
    } = usePOProductsByCardId(cardId);

    // Track data signatures to avoid unnecessary re-renders
    const lastDataSignatureRef = useRef<string>("");
    const poSignatureRef = useRef<string>("");

    const buildPOSignature = useCallback((data: POItem[]) => {
        return data
            .map((po) => `${po.id}:${po.products?.length ?? 0}`)
            .sort()
            .join("|");
    }, []);

    // Map warehouse product data onto a product
    const mapWarehouseProduct = useCallback(
        (product: ProductItem) => {
            if (!warehouseProducts) return;
            const warehouseProduct = warehouseProducts.find(
                (wp) =>
                    wp.hikmatProductId === product.id ||
                    wp.id === product.id ||
                    wp.product_code === product.product_code
            );
            if (warehouseProduct) {
                product.warehouseProduct = warehouseProduct;
                if (!product.satuan && warehouseProduct.satuan) {
                    product.satuan = warehouseProduct.satuan;
                }
            }
        },
        [warehouseProducts]
    );

    // Main data merging effect
    useEffect(() => {
        const signature = [
            apiPOData?.length ?? 0,
            poProductsResponse?.data?.length ?? 0,
            warehouseProducts?.length ?? 0,
        ].join("|");

        if (signature === lastDataSignatureRef.current) {
            return;
        }
        lastDataSignatureRef.current = signature;

        if (!apiPOData || apiPOData.length === 0) {
            setPoData([]);
            return;
        }

        const updatedPOData = [...apiPOData];

        // Preserve existing local edits
        updatedPOData.forEach((po) => {
            const existing = poData.find((p) => p.id === po.id);
            if (existing) {
                po.products = existing.products ? [...existing.products] : [];
            }
        });

        // Integrate PO Products
        if (poProductsResponse?.data && poProductsResponse.data.length > 0) {
            updatedPOData.forEach((po) => {
                const relatedPOProducts = (poProductsResponse.data || []).filter(
                    (poProduct) => poProduct.poId === po.id
                );

                const relatedProducts = relatedPOProducts.map((poProduct) => {
                    const existingProduct = po.products.find(
                        (p) => p.poProductId === poProduct.id
                    );

                    if (existingProduct) {
                        return transformPOProductToProductItem(poProduct, categories);
                    } else {
                        return transformPOProductToProductItem(poProduct, categories);
                    }
                });

                if (relatedProducts.length > 0) {
                    const existingProductPoIds = new Set(
                        po.products.map((p) => p.poProductId)
                    );

                    const newProducts = relatedProducts.filter(
                        (p) => !existingProductPoIds.has(p.poProductId)
                    );
                    const updatedProducts = relatedProducts.filter((p) =>
                        existingProductPoIds.has(p.poProductId)
                    );

                    // Update existing products in place to preserve calculated values
                    updatedProducts.forEach((updatedProduct) => {
                        const existingIndex = po.products.findIndex(
                            (p) => p.poProductId === updatedProduct.poProductId
                        );
                        if (existingIndex !== -1) {
                            const existingProduct = po.products[existingIndex];

                            // Preserve user-entered bahan tab values
                            if (
                                existingProduct.bahanTabs?.length > 0 &&
                                updatedProduct.bahanTabs?.length > 0
                            ) {
                                const existingBahanTab = existingProduct.bahanTabs[0];
                                const updatedBahanTab = updatedProduct.bahanTabs[0];

                                updatedBahanTab.terloading = existingBahanTab.terloading;
                                updatedBahanTab.bahanTerpakai = existingBahanTab.bahanTerpakai;
                                updatedBahanTab.sisaBahan = existingBahanTab.sisaBahan;
                                updatedBahanTab.estBahan = existingBahanTab.estBahan;
                                updatedBahanTab.efisiensi = existingBahanTab.efisiensi;
                            }

                            updatedProduct.orderCreated = existingProduct.orderCreated;
                            updatedProduct.requestId = existingProduct.requestId;
                            po.products[existingIndex] = updatedProduct;
                        }
                    });

                    po.products = [...po.products, ...newProducts];

                    // Calculate Est Bahan for new products
                    if (calculateEstBahanFromCategories && categories) {
                        newProducts.forEach((product) => {
                            if (product.bahanTabs?.length > 0) {
                                const calculatedEstBahan = calculateEstBahanFromCategories(
                                    product,
                                    categories
                                );
                                if (calculatedEstBahan > 0) {
                                    product.bahanTabs[0].estBahan = calculatedEstBahan;
                                }
                            }
                        });
                    }

                    // Remove stale products
                    const allowedIds = new Set(
                        relatedProducts
                            .map((p) => p.poProductId)
                            .filter(Boolean) as (string | number)[]
                    );
                    po.products = po.products.filter((p) =>
                        p.poProductId ? allowedIds.has(p.poProductId) : true
                    );
                } else {
                    po.products = [];
                }
            });
        } else if (poProductsResponse?.data?.length === 0) {
            updatedPOData.forEach((po) => {
                po.products = [];
            });
        }

        // Map warehouse products
        updatedPOData.forEach((po) => {
            po.products.forEach((product) => mapWarehouseProduct(product));
        });

        setPoData(updatedPOData);
    }, [
        apiPOData,
        poProductsResponse,
        warehouseProducts,
        categories,
        mapWarehouseProduct,
        calculateEstBahanFromCategories,
        poData,
    ]);

    // Update a specific product's bahan tab locally
    const updateLocalProduct = useCallback(
        (poId: string, productId: string, updates: Partial<BahanTab>) => {
            setPoData((prev) => {
                const newData = prev.map((po) => {
                    if (po.id !== poId) return po;
                    return {
                        ...po,
                        products: po.products.map((product) => {
                            if (product.id !== productId && product.poProductId !== productId) {
                                return product;
                            }
                            return {
                                ...product,
                                bahanTabs: product.bahanTabs.map((tab, idx) =>
                                    idx === 0 ? { ...tab, ...updates } : tab
                                ),
                            };
                        }),
                    };
                });
                return newData;
            });
        },
        []
    );

    const refetchPOs = useCallback(async () => {
        await refetchPOsInternal();
    }, [refetchPOsInternal]);

    const refetchProducts = useCallback(async () => {
        await refetchProductsInternal();
    }, [refetchProductsInternal]);

    const isLoading = isPOLoading || isProductsLoading;

    return {
        poData,
        isLoading,
        refetchPOs,
        refetchProducts,
        updateLocalProduct,
        setPoData,
    };
};

export default useBahanData;
