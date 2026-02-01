import React from "react";
import { AutoComplete, message } from "antd";
import { Camera } from "lucide-react";
import { buildProductSelectionKey, resolveProductSource } from "./productHelpers";

type ProductSelectorProps = {
  poId: string;
  colors: any;
  selectedProductId: string;
  products: any[];
  isLoadingProducts: boolean;
  onSelectProduct: (poId: string, productId: string) => void;
  onProductInputFocus: (poId: string) => void;
  onScanValue: (poId: string, value: string) => void;
  onOpenCameraScan?: (poId: string) => void;
  setSelectedProductIds: React.Dispatch<React.SetStateAction<{ [poId: string]: string }>>;
};

const ProductSelector: React.FC<ProductSelectorProps> = ({
  poId,
  colors,
  selectedProductId,
  products,
  isLoadingProducts,
  onSelectProduct,
  onProductInputFocus,
  onScanValue,
  onOpenCameraScan,
  setSelectedProductIds,
}) => {
  const productInputRef = React.useRef<any>(null);
  const scanBufferRef = React.useRef<string>("");
  const scanTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    return () => {
      if (scanTimerRef.current) {
        clearTimeout(scanTimerRef.current);
      }
    };
  }, []);

  const getProductValue = (product: any) => {
    const selectionKey = buildProductSelectionKey(product);
    if (selectionKey) return selectionKey;

    const rawValue = product?.accurateId ?? product?.id ?? product?.productId;
    return rawValue !== undefined && rawValue !== null
      ? rawValue.toString()
      : "";
  };

  const formatProductLabel = (product: any) => {
    const name = product?.name || "Unnamed product";
    const code =
      product?.sku ||
      product?.barcode ||
      product?.accurateId ||
      product?.id ||
      product?.productId;
    const source = resolveProductSource(product);
    const displaySource = source === "Hikmat" ? "HKI" : source;
    const sourceSuffix = displaySource ? ` - ${displaySource}` : "";
    return code ? `${name} (${code})${sourceSuffix}` : `${name}${sourceSuffix}`;
  };

  const handleScannerKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      const value =
        scanBufferRef.current.trim() ||
        (event.target as HTMLInputElement)?.value?.trim() ||
        "";
      if (value) {
        onScanValue(poId, value);
        scanBufferRef.current = "";
        if (scanTimerRef.current) {
          clearTimeout(scanTimerRef.current);
          scanTimerRef.current = null;
        }
        setTimeout(() => productInputRef.current?.focus?.(), 0);
      }
      return;
    }

    if (event.key.length === 1) {
      scanBufferRef.current += event.key;
      if (scanTimerRef.current) {
        clearTimeout(scanTimerRef.current);
      }
      scanTimerRef.current = setTimeout(() => {
        scanBufferRef.current = "";
      }, 300);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <AutoComplete
        ref={productInputRef}
        value={selectedProductId}
        onChange={(value) => {
          setSelectedProductIds((prev) => ({ ...prev, [poId]: value }));
        }}
        onSelect={(value) => {
          if (value) {
            onSelectProduct(poId, value);
          }
        }}
        options={products
          .map((product: any) => ({
            value: getProductValue(product),
            label: formatProductLabel(product),
          }))
          .filter((option) => option.value)}
        placeholder={
          isLoadingProducts ? "Loading products..." : "Scan or select a product"
        }
        filterOption={(inputValue, option) =>
          option!.label.toLowerCase().indexOf(inputValue.toLowerCase()) !== -1
        }
        style={{
          minWidth: "420px",
        }}
        disabled={isLoadingProducts}
        showSearch
        onFocus={() => onProductInputFocus(poId)}
        onKeyDown={handleScannerKeyDown}
      />
      {onOpenCameraScan && (
        <button
          type="button"
          onClick={() => {
            onProductInputFocus(poId);
            onOpenCameraScan(poId);
            setTimeout(() => productInputRef.current?.focus?.(), 0);
          }}
          className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 hover:border-blue-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
        >
          <Camera size={14} className="inline-block mr-1" />
          Camera (dev)
        </button>
      )}
    </div>
  );
};

export default ProductSelector;
