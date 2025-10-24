import React, { useState, useEffect } from "react";
import { Select, Spin, message } from "antd";
import { useCardDetails } from "@hooks/card-details";
import { getProducts, Product } from "@api/product";
import { getBahans, Bahan } from "@api/bahan";
import { getWarnas, Warna } from "@api/warna";
import { getProductCodes, ProductCode } from "@api/product-code";
import { Card } from "@myTypes/card";
import { useBoardPermissionsContext } from "@providers/board-permissions-context";

const { Option } = Select;

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
}

const ProdukFields: React.FC<ProdukFieldsProps> = ({ card, setCard }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [productCodes, setProductCodes] = useState<ProductCode[]>([]);
  const [bahans, setBahans] = useState<Bahan[]>([]);
  const [warnas, setWarnas] = useState<Warna[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingProductCodes, setLoadingProductCodes] = useState(false);
  const [loadingBahans, setLoadingBahans] = useState(false);
  const [loadingWarnas, setLoadingWarnas] = useState(false);

  const { updateCard } = useCardDetails(
    card?.id || "",
    card?.listId || "",
    card?.boardId || ""
  );
  const { canUpdateCard } = useBoardPermissionsContext();

  // Load products on component mount
  useEffect(() => {
    const loadProducts = async () => {
      setLoadingProducts(true);
      try {
        const response = await getProducts();
        if (response.data) {
          setProducts(response.data);
        }
      } catch (error) {
        message.error("Failed to load products");
        console.error("Error loading products:", error);
      } finally {
        setLoadingProducts(false);
      }
    };

    loadProducts();
  }, []);

  // Load product codes when product is selected
  useEffect(() => {
    const loadProductCodes = async () => {
      if (!card.productId) {
        setProductCodes([]);
        return;
      }

      setLoadingProductCodes(true);
      try {
        const response = await getProductCodes(1, 100, card.productId);
        if (response.data) {
          setProductCodes(response.data);
        }
      } catch (error) {
        message.error("Failed to load product codes");
        console.error("Error loading product codes:", error);
      } finally {
        setLoadingProductCodes(false);
      }
    };

    loadProductCodes();
  }, [card.productId]);

  // Load bahans when product is selected
  useEffect(() => {
    const loadBahans = async () => {
      if (!card.productId) {
        setBahans([]);
        return;
      }

      setLoadingBahans(true);
      try {
        const response = await getBahans(1, 100, card.productId);
        if (response.data) {
          setBahans(response.data);
        }
      } catch (error) {
        message.error("Failed to load bahans");
        console.error("Error loading bahans:", error);
      } finally {
        setLoadingBahans(false);
      }
    };

    loadBahans();
  }, [card.productId]);

  // Load warnas when bahan is selected
  useEffect(() => {
    const loadWarnas = async () => {
      if (!card.bahanId) {
        setWarnas([]);
        return;
      }

      setLoadingWarnas(true);
      try {
        const response = await getWarnas(1, 100, card.bahanId);
        if (response.data) {
          // Sort warnas alphabetically by name (A-Z)
          const sortedWarnas = response.data.sort((a, b) => 
            a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
          );
          setWarnas(sortedWarnas);
        }
      } catch (error) {
        message.error("Failed to load warnas");
        console.error("Error loading warnas:", error);
      } finally {
        setLoadingWarnas(false);
      }
    };

    loadWarnas();
  }, [card.bahanId]);

  const handleProductChange = (productId: string) => {
    if (!canUpdateCard()) return;

    const selectedProduct = products.find((p) => p.id === productId);

    // Update local state first for immediate UI feedback
    const updatedCard = {
      ...card,
      productId,
      productInfo: selectedProduct
        ? {
            id: selectedProduct.id,
            name: selectedProduct.name,
          }
        : undefined,
      // Reset dependent fields when product changes
      productCodeId: undefined,
      bahanId: undefined,
      bahanInfo: undefined,
      warnaId: undefined,
      warnaInfo: undefined,
    };
    setCard(updatedCard);

    // Update card in backend
    updateCard({
      productId: productId || undefined,
      productCodeId: undefined, // Reset product code
      bahanId: undefined, // Reset dependent fields
      warnaId: undefined,
    });
  };

  const handleProductCodeChange = (productCodeId: string) => {
    if (!canUpdateCard()) return;

    // Update local state first for immediate UI feedback
    const updatedCard = {
      ...card,
      productCodeId,
    };
    setCard(updatedCard);

    // Update card in backend
    updateCard({
      productCodeId: productCodeId || undefined,
    });
  };

  const handleBahanChange = (bahanId: string) => {
    if (!canUpdateCard()) return;

    const selectedBahan = bahans.find((b) => b.id === bahanId);

    // Update local state first for immediate UI feedback
    const updatedCard = {
      ...card,
      bahanId,
      bahanInfo: selectedBahan
        ? {
            id: selectedBahan.id,
            name: selectedBahan.name,
          }
        : undefined,
      // Reset dependent fields when bahan changes
      warnaId: undefined,
      warnaInfo: undefined,
    };
    setCard(updatedCard);

    // Update card in backend
    updateCard({
      bahanId: bahanId || undefined,
      warnaId: undefined, // Reset dependent field
    });
  };

  const handleWarnaChange = (warnaId: string) => {
    if (!canUpdateCard()) return;

    const selectedWarna = warnas.find((w) => w.id === warnaId);

    // Update local state first for immediate UI feedback
    const updatedCard = {
      ...card,
      warnaId,
      warnaInfo: selectedWarna
        ? {
            id: selectedWarna.id,
            name: selectedWarna.name,
          }
        : undefined,
    };
    setCard(updatedCard);

    // Update card in backend
    updateCard({ warnaId: warnaId || undefined });
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
          disabled={!canUpdateCard() || loadingProducts}
          allowClear
          showSearch
          filterOption={(input, option) =>
            option?.children
              ?.toString()
              .toLowerCase()
              .includes(input.toLowerCase()) ?? false
          }
        >
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
          disabled={!canUpdateCard() || !card.productId || loadingProductCodes}
          allowClear
          showSearch
          filterOption={(input, option) =>
            option?.children
              ?.toString()
              .toLowerCase()
              .includes(input.toLowerCase()) ?? false
          }
        >
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
          disabled={!canUpdateCard() || !card.productId || loadingBahans}
          allowClear
          showSearch
          filterOption={(input, option) =>
            option?.children
              ?.toString()
              .toLowerCase()
              .includes(input.toLowerCase()) ?? false
          }
        >
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
          disabled={!canUpdateCard() || !card.bahanId || loadingWarnas}
          allowClear
          showSearch
          filterOption={(input, option) =>
            option?.children
              ?.toString()
              .toLowerCase()
              .includes(input.toLowerCase()) ?? false
          }
        >
          {warnas.map((warna) => (
            <Option key={warna.id} value={warna.id}>
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px 8px',
                  backgroundColor: warna.hexCode || 'transparent',
                  color: warna.hexCode ? getContrastColor(warna.hexCode) : 'inherit',
                  borderRadius: '4px',
                  minHeight: '24px'
                }}
              >
                {warna.name} {warna.hexCode && `(${warna.hexCode})`}
              </div>
            </Option>
          ))}
        </Select>
      </div>
    </div>
  );
};

export default ProdukFields;
