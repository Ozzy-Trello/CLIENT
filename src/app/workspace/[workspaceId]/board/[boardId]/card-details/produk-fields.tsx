import React, { useState, useEffect, useCallback } from "react";
import { Select, Spin, message } from "antd";
import { useCardDetails } from "@hooks/card-details";
import { getProducts, Product } from "@api/product";
import { getBahan, getBahans, Bahan } from "@api/bahan";
import { getWarna, getWarnas, Warna } from "@api/warna";
import { getProductCodes, ProductCode } from "@api/product-code";
import { Card } from "@myTypes/card";
import { useBoardPermissionsContext } from "@providers/board-permissions-context";

const { Option } = Select;

// Special value used to represent clearing a selection via '-' option
const CLEAR_VALUE = "__CLEAR__";
const PAGE_LIMIT = 100;

// Utility function to determine text color based on background color
const getContrastColor = (hexColor: string): string => {
  // Remove # if present
  const hex = hexColor.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return black for light colors, white for dark colors
  return luminance > 0.5 ? '#000000' : '#ffffff';
};

interface ProdukFieldsProps {
  card: Card;
  setCard: React.Dispatch<React.SetStateAction<Card | null>>;
  viewOnly?: boolean;
}

const ProdukFields: React.FC<ProdukFieldsProps> = ({ card, setCard, viewOnly = false }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [productCodes, setProductCodes] = useState<ProductCode[]>([]);
  const [bahans, setBahans] = useState<Bahan[]>([]);
  const [warnas, setWarnas] = useState<Warna[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingProductCodes, setLoadingProductCodes] = useState(false);
  const [loadingBahans, setLoadingBahans] = useState(false);
  const [loadingWarnas, setLoadingWarnas] = useState(false);

  const [productsPage, setProductsPage] = useState(1);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);

  const [productCodesPage, setProductCodesPage] = useState(1);
  const [hasMoreProductCodes, setHasMoreProductCodes] = useState(true);

  const [bahansPage, setBahansPage] = useState(1);
  const [hasMoreBahans, setHasMoreBahans] = useState(true);

  const [warnasPage, setWarnasPage] = useState(1);
  const [hasMoreWarnas, setHasMoreWarnas] = useState(true);

  const [productSearch, setProductSearch] = useState("");
  const [productCodeSearch, setProductCodeSearch] = useState("");
  const [bahanSearch, setBahanSearch] = useState("");
  const [warnaSearch, setWarnaSearch] = useState("");

  const [debouncedProductSearch, setDebouncedProductSearch] = useState("");
  const [debouncedProductCodeSearch, setDebouncedProductCodeSearch] =
    useState("");
  const [debouncedBahanSearch, setDebouncedBahanSearch] = useState("");
  const [debouncedWarnaSearch, setDebouncedWarnaSearch] = useState("");

  const { updateCard } = useCardDetails(
    card?.id || "",
    card?.listId || "",
    card?.boardId || ""
  );
  const { canUpdateCard } = useBoardPermissionsContext();
  const canEdit = canUpdateCard();
  const isViewOnly = viewOnly || !canEdit;

  useEffect(() => {
    let cancelled = false;

    const hydrateMissingParents = async () => {
      if (card.productId || !card.bahanId) return;

      try {
        const response = await getBahan(card.bahanId);
        const bahan = response.data;
        if (!bahan || cancelled) return;

        setCard((prev) => {
          if (!prev || prev.id !== card.id || prev.productId) return prev;
          return {
            ...prev,
            productId: bahan.productId,
            productInfo: bahan.productInfo
              ? { id: bahan.productInfo.id, name: bahan.productInfo.name }
              : prev.productInfo,
            bahanInfo: { id: bahan.id, name: bahan.name },
          };
        });
      } catch {
        // Keep the raw value; the backend may not have enough relation data for older cards.
      }
    };

    hydrateMissingParents();
    return () => {
      cancelled = true;
    };
  }, [card.id, card.bahanId, card.productId, setCard]);

  useEffect(() => {
    let cancelled = false;

    const hydrateMissingBahan = async () => {
      if (card.bahanId || !card.warnaId) return;

      try {
        const response = await getWarna(card.warnaId);
        const warna = response.data;
        if (!warna || cancelled) return;

        setCard((prev) => {
          if (!prev || prev.id !== card.id || prev.bahanId) return prev;
          return {
            ...prev,
            bahanId: warna.bahanId,
            bahanInfo: warna.bahanInfo
              ? { id: warna.bahanInfo.id, name: warna.bahanInfo.name }
              : prev.bahanInfo,
            productId: warna.bahanInfo?.product?.id ?? prev.productId,
            productInfo: warna.bahanInfo?.product
              ? { id: warna.bahanInfo.product.id, name: warna.bahanInfo.product.name }
              : prev.productInfo,
            warnaInfo: { id: warna.id, name: warna.name },
          };
        });
      } catch {
        // Keep the raw value; the backend may not have enough relation data for older cards.
      }
    };

    hydrateMissingBahan();
    return () => {
      cancelled = true;
    };
  }, [card.id, card.bahanId, card.warnaId, setCard]);

  const renderDropdownWithScrollLock = (menu: React.ReactElement) => (
    <div
      onWheel={(e) => {
        e.stopPropagation();
      }}
    >
      {menu}
    </div>
  );

  const notFoundWithLoading = (loading: boolean) =>
    loading ? <Spin size="small" /> : null;

  const hasNextPage = (
    paginate: any,
    currentPage: number,
    fetchedCount: number
  ): boolean => {
    if (paginate) {
      if (typeof paginate.nextPage === "number") {
        return paginate.nextPage > 0;
      }
      if (typeof paginate.totalPage === "number") {
        return currentPage < paginate.totalPage;
      }
    }
    return fetchedCount >= PAGE_LIMIT;
  };

  const mergeUniqueById = <T extends { id: string }>(
    prev: T[],
    next: T[]
  ): T[] => {
    const map = new Map<string, T>();
    prev.forEach((item) => map.set(item.id, item));
    next.forEach((item) => map.set(item.id, item));
    return Array.from(map.values());
  };

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedProductSearch(productSearch), 300);
    return () => clearTimeout(timer);
  }, [productSearch]);

  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedProductCodeSearch(productCodeSearch),
      300
    );
    return () => clearTimeout(timer);
  }, [productCodeSearch]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedBahanSearch(bahanSearch), 300);
    return () => clearTimeout(timer);
  }, [bahanSearch]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedWarnaSearch(warnaSearch), 300);
    return () => clearTimeout(timer);
  }, [warnaSearch]);

  // Load products on component mount
  const loadProducts = useCallback(
    async (page: number, append: boolean, searchTerm: string) => {
      setLoadingProducts(true);
      try {
        const response = await getProducts(page, PAGE_LIMIT, searchTerm);
        const incoming = response.data || [];

        setProducts((prev) =>
          append ? mergeUniqueById(prev, incoming) : incoming
        );
        setProductsPage(page);
        setHasMoreProducts(hasNextPage(response.paginate, page, incoming.length));
      } catch (error) {
        message.error("Failed to load products");
        console.error("Error loading products:", error);
      } finally {
        setLoadingProducts(false);
      }
    },
    []
  );

  useEffect(() => {
    setProducts([]);
    setProductsPage(1);
    setHasMoreProducts(true);
    loadProducts(1, false, debouncedProductSearch);
  }, [loadProducts, debouncedProductSearch]);

  const loadMoreProducts = useCallback(() => {
    if (loadingProducts || !hasMoreProducts) return;
    loadProducts(productsPage + 1, true, debouncedProductSearch);
  }, [
    loadingProducts,
    hasMoreProducts,
    productsPage,
    loadProducts,
    debouncedProductSearch,
  ]);

  const loadProductCodes = useCallback(
    async (page: number, append: boolean, searchTerm: string) => {
      if (!card.productId) {
        setProductCodes([]);
        setProductCodesPage(1);
        setHasMoreProductCodes(false);
        return;
      }

      setLoadingProductCodes(true);
      try {
        const response = await getProductCodes(
          page,
          PAGE_LIMIT,
          card.productId,
          searchTerm
        );
        const incoming = response.data || [];

        setProductCodes((prev) =>
          append ? mergeUniqueById(prev, incoming) : incoming
        );
        setProductCodesPage(page);
        setHasMoreProductCodes(
          hasNextPage(response.paginate, page, incoming.length)
        );
      } catch (error) {
        message.error("Failed to load product codes");
        console.error("Error loading product codes:", error);
      } finally {
        setLoadingProductCodes(false);
      }
    },
    [card.productId]
  );

  // Load product codes when product is selected
  useEffect(() => {
    setProductCodes([]);
    setProductCodesPage(1);
    setHasMoreProductCodes(true);

    if (!card.productId) return;
    loadProductCodes(1, false, debouncedProductCodeSearch);
  }, [card.productId, loadProductCodes, debouncedProductCodeSearch]);

  const loadMoreProductCodes = useCallback(() => {
    if (loadingProductCodes || !hasMoreProductCodes || !card.productId) return;
    loadProductCodes(productCodesPage + 1, true, debouncedProductCodeSearch);
  }, [
    loadingProductCodes,
    hasMoreProductCodes,
    card.productId,
    productCodesPage,
    loadProductCodes,
    debouncedProductCodeSearch,
  ]);

  const loadBahans = useCallback(
    async (page: number, append: boolean, searchTerm: string) => {
      if (!card.productId) {
        setBahans([]);
        setBahansPage(1);
        setHasMoreBahans(false);
        return;
      }

      setLoadingBahans(true);
      try {
        const response = await getBahans(
          page,
          PAGE_LIMIT,
          card.productId,
          searchTerm
        );
        const incoming = response.data || [];

        setBahans((prev) =>
          append ? mergeUniqueById(prev, incoming) : incoming
        );
        setBahansPage(page);
        setHasMoreBahans(hasNextPage(response.paginate, page, incoming.length));
      } catch (error) {
        message.error("Failed to load bahans");
        console.error("Error loading bahans:", error);
      } finally {
        setLoadingBahans(false);
      }
    },
    [card.productId]
  );

  // Load bahans when product is selected
  useEffect(() => {
    setBahans([]);
    setBahansPage(1);
    setHasMoreBahans(true);

    if (!card.productId) return;
    loadBahans(1, false, debouncedBahanSearch);
  }, [card.productId, loadBahans, debouncedBahanSearch]);

  const loadMoreBahans = useCallback(() => {
    if (loadingBahans || !hasMoreBahans || !card.productId) return;
    loadBahans(bahansPage + 1, true, debouncedBahanSearch);
  }, [
    loadingBahans,
    hasMoreBahans,
    card.productId,
    bahansPage,
    loadBahans,
    debouncedBahanSearch,
  ]);

  const loadWarnas = useCallback(
    async (page: number, append: boolean, searchTerm: string) => {
      if (!card.bahanId) {
        setWarnas([]);
        setWarnasPage(1);
        setHasMoreWarnas(false);
        return;
      }

      setLoadingWarnas(true);
      try {
        const response = await getWarnas(
          page,
          PAGE_LIMIT,
          card.bahanId,
          searchTerm
        );
        const incoming = response.data || [];

        setWarnas((prev) => {
          const merged = append ? mergeUniqueById(prev, incoming) : incoming;
          return merged.sort((a, b) =>
            a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
          );
        });
        setWarnasPage(page);
        setHasMoreWarnas(hasNextPage(response.paginate, page, incoming.length));
      } catch (error) {
        message.error("Failed to load warnas");
        console.error("Error loading warnas:", error);
      } finally {
        setLoadingWarnas(false);
      }
    },
    [card.bahanId]
  );

  // Load warnas when bahan is selected
  useEffect(() => {
    setWarnas([]);
    setWarnasPage(1);
    setHasMoreWarnas(true);

    if (!card.bahanId) return;
    loadWarnas(1, false, debouncedWarnaSearch);
  }, [card.bahanId, loadWarnas, debouncedWarnaSearch]);

  const loadMoreWarnas = useCallback(() => {
    if (loadingWarnas || !hasMoreWarnas || !card.bahanId) return;
    loadWarnas(warnasPage + 1, true, debouncedWarnaSearch);
  }, [
    loadingWarnas,
    hasMoreWarnas,
    card.bahanId,
    warnasPage,
    loadWarnas,
    debouncedWarnaSearch,
  ]);

  const handleProductChange = (productId: string) => {
    if (isViewOnly) return;

    // Handle '-' clear option
    const isClear = productId === CLEAR_VALUE;
    // Send null (not undefined) to explicitly clear on backend
    const normalizedProductId = isClear ? null : productId;
    const selectedProduct = products.find((p) => p.id === productId);

    setProductCodeSearch("");
    setBahanSearch("");
    setWarnaSearch("");

    // Update local state first for immediate UI feedback
    const updatedCard = {
      ...card,
      productId: normalizedProductId,
      productInfo: selectedProduct
        ? {
            id: selectedProduct.id,
            name: selectedProduct.name,
          }
        : undefined,
      // Reset dependent fields when product changes
      productCodeId: null,
      bahanId: null,
      bahanInfo: undefined,
      warnaId: null,
      warnaInfo: undefined,
    };
    setCard(updatedCard);

    // Update card in backend
    updateCard({
      productId: normalizedProductId,
      // Explicitly clear dependent fields with null
      productCodeId: null,
      bahanId: null,
      warnaId: null,
    });
  };

  const handleProductCodeChange = (productCodeId: string) => {
    if (isViewOnly) return;

    const isClear = productCodeId === CLEAR_VALUE;
    // Send null to explicitly clear
    const normalizedProductCodeId = isClear ? null : productCodeId;

    // Update local state first for immediate UI feedback
    const updatedCard = {
      ...card,
      productCodeId: normalizedProductCodeId,
    };
    setCard(updatedCard);

    // Update card in backend
    updateCard({
      productCodeId: normalizedProductCodeId,
    });
  };

  const handleBahanChange = (bahanId: string) => {
    if (isViewOnly) return;

    const isClear = bahanId === CLEAR_VALUE;
    // Send null to explicitly clear
    const normalizedBahanId = isClear ? null : bahanId;
    const selectedBahan = bahans.find((b) => b.id === bahanId);

    setWarnaSearch("");

    // Update local state first for immediate UI feedback
    const updatedCard = {
      ...card,
      bahanId: normalizedBahanId,
      bahanInfo: selectedBahan
        ? {
            id: selectedBahan.id,
            name: selectedBahan.name,
          }
        : undefined,
      // Reset dependent fields when bahan changes
      warnaId: null,
      warnaInfo: undefined,
    };
    setCard(updatedCard);

    // Update card in backend
    updateCard({
      bahanId: normalizedBahanId,
      // Explicitly clear dependent field with null
      warnaId: null,
    });
  };

  const handleWarnaChange = (warnaId: string) => {
    if (isViewOnly) return;

    const isClear = warnaId === CLEAR_VALUE;
    // Send null to explicitly clear
    const normalizedWarnaId = isClear ? null : warnaId;
    const selectedWarna = warnas.find((w) => w.id === warnaId);

    // Update local state first for immediate UI feedback
    const updatedCard = {
      ...card,
      warnaId: normalizedWarnaId,
      warnaInfo: selectedWarna
        ? {
            id: selectedWarna.id,
            name: selectedWarna.name,
          }
        : undefined,
    };
    setCard(updatedCard);

    // Update card in backend
    updateCard({ warnaId: normalizedWarnaId });
  };

  return (
    <div className="grid grid-cols-2 gap-4 ml-8">
      {/* Product Dropdown */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Produk
        </label>
        <Select
          value={card.productId || undefined}
          onChange={handleProductChange}
          placeholder="Search product..."
          className="w-full"
          loading={loadingProducts}
          disabled={isViewOnly}
          showSearch
          dropdownRender={renderDropdownWithScrollLock}
          filterOption={false}
          onSearch={setProductSearch}
          notFoundContent={notFoundWithLoading(loadingProducts)}
          onPopupScroll={(e) => {
            const target = e.target as HTMLElement;
            if (
              target.scrollTop + target.clientHeight >=
              target.scrollHeight - 16
            ) {
              loadMoreProducts();
            }
          }}
        >
          <Option key={CLEAR_VALUE} value={CLEAR_VALUE}>
            -
          </Option>
          {card.productId &&
            card.productInfo &&
            !products.some((product) => product.id === card.productId) && (
              <Option key={card.productId} value={card.productId}>
                {card.productInfo.name}
              </Option>
            )}
          {products.map((product) => (
            <Option key={product.id} value={product.id}>
              {product.name}
            </Option>
          ))}
        </Select>
      </div>

      {/* Product Code Dropdown */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Product Code
        </label>
        <Select
          value={card.productCodeId || undefined}
          onChange={handleProductCodeChange}
          placeholder={
            !card.productId ? "Select product first" : "Search product code..."
          }
          className="w-full"
          loading={loadingProductCodes}
          disabled={isViewOnly || !card.productId}
          showSearch
          dropdownRender={renderDropdownWithScrollLock}
          filterOption={false}
          onSearch={setProductCodeSearch}
          notFoundContent={notFoundWithLoading(loadingProductCodes)}
          onPopupScroll={(e) => {
            const target = e.target as HTMLElement;
            if (
              target.scrollTop + target.clientHeight >=
              target.scrollHeight - 16
            ) {
              loadMoreProductCodes();
            }
          }}
        >
          <Option key={CLEAR_VALUE} value={CLEAR_VALUE}>
            -
          </Option>
          {card.productCodeId &&
            card.productCodeInfo &&
            !productCodes.some((productCode) => productCode.id === card.productCodeId) && (
              <Option key={card.productCodeId} value={card.productCodeId}>
                {card.productCodeInfo.description
                  ? `${card.productCodeInfo.description} (${card.productCodeInfo.code})`
                  : card.productCodeInfo.code}
              </Option>
            )}
          {productCodes.map((productCode) => (
            <Option key={productCode.id} value={productCode.id}>
              {productCode.description ? `${productCode.description} (${productCode.code})` : productCode.code}
            </Option>
          ))}
        </Select>
      </div>

      {/* Bahan Dropdown */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Bahan
        </label>
        <Select
          value={card.bahanId || undefined}
          onChange={handleBahanChange}
          placeholder={
            !card.productId ? "Select product first" : "Search bahan..."
          }
          className="w-full"
          loading={loadingBahans}
          disabled={isViewOnly || !card.productId}
          showSearch
          dropdownRender={renderDropdownWithScrollLock}
          filterOption={false}
          onSearch={setBahanSearch}
          notFoundContent={notFoundWithLoading(loadingBahans)}
          onPopupScroll={(e) => {
            const target = e.target as HTMLElement;
            if (
              target.scrollTop + target.clientHeight >=
              target.scrollHeight - 16
            ) {
              loadMoreBahans();
            }
          }}
        >
          <Option key={CLEAR_VALUE} value={CLEAR_VALUE}>
            -
          </Option>
          {card.bahanId &&
            card.bahanInfo &&
            !bahans.some((bahan) => bahan.id === card.bahanId) && (
              <Option key={card.bahanId} value={card.bahanId}>
                {card.bahanInfo.name}
              </Option>
            )}
          {bahans.map((bahan) => (
            <Option key={bahan.id} value={bahan.id}>
              {bahan.name}
            </Option>
          ))}
        </Select>
      </div>

      {/* Warna Dropdown */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Warna
        </label>
        <Select
          value={card.warnaId || undefined}
          onChange={handleWarnaChange}
          placeholder={!card.bahanId ? "Select bahan first" : "Search warna..."}
          className="w-full"
          loading={loadingWarnas}
          disabled={isViewOnly || !card.bahanId}
          showSearch
          dropdownRender={renderDropdownWithScrollLock}
          filterOption={false}
          onSearch={setWarnaSearch}
          notFoundContent={notFoundWithLoading(loadingWarnas)}
          onPopupScroll={(e) => {
            const target = e.target as HTMLElement;
            if (
              target.scrollTop + target.clientHeight >=
              target.scrollHeight - 16
            ) {
              loadMoreWarnas();
            }
          }}
        >
        <Option key={CLEAR_VALUE} value={CLEAR_VALUE}>
          -
        </Option>
        {card.warnaId &&
          card.warnaInfo &&
          !warnas.some((warna) => warna.id === card.warnaId) && (
            <Option key={card.warnaId} value={card.warnaId}>
              {card.warnaInfo.name}
            </Option>
          )}
        {warnas.map((warna) => {
          const trimmedCode = warna.code?.trim();
          return (
            <Option
              key={warna.id}
              value={warna.id}
              label={`${warna.name}${trimmedCode ? ` (${trimmedCode})` : ""}`}
            >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    paddingInline: "1rem",
                    backgroundColor: warna.hexCode || "transparent",
                    color: warna.hexCode
                      ? getContrastColor(warna.hexCode)
                      : "inherit",
                    borderRadius: "4px",
                  }}
                >
                  {warna.name} {trimmedCode ? `(${trimmedCode})` : ""}
                </div>
              </Option>
            );
          })}
        </Select>
      </div>
    </div>
  );
};

export default ProdukFields;
