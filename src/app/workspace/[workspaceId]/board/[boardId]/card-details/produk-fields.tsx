import React, { useState, useEffect } from "react";
import { Select, Spin, message } from "antd";
import { useCardDetails } from "@hooks/card-details";
import { getProducts, Product } from "@api/product";
import { getBahans, Bahan } from "@api/bahan";
import { getWarnas, Warna } from "@api/warna";
import { Card } from "@myTypes/card";
import { useBoardPermissionsContext } from "@providers/board-permissions-context";

const { Option } = Select;

interface ProdukFieldsProps {
  card: Card;
  setCard: React.Dispatch<React.SetStateAction<Card | null>>;
}

const ProdukFields: React.FC<ProdukFieldsProps> = ({ card, setCard }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [bahans, setBahans] = useState<Bahan[]>([]);
  const [warnas, setWarnas] = useState<Warna[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
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
          setWarnas(response.data);
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
            code: selectedProduct.code,
          }
        : undefined,
      // Reset dependent fields when product changes
      bahanId: undefined,
      bahanInfo: undefined,
      warnaId: undefined,
      warnaInfo: undefined,
    };
    setCard(updatedCard);

    // Update card in backend
    updateCard({
      productId: productId || undefined,
      bahanId: undefined, // Reset dependent fields
      warnaId: undefined,
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
    <div className="grid grid-cols-3 gap-4 py-5">
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
              [{product.code}] {product.name}
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
              {warna.name}
            </Option>
          ))}
        </Select>
      </div>
    </div>
  );
};

export default ProdukFields;
