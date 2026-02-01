import {
  getRequestedItemIdFromProduct,
  getUnitPriceFromProduct,
  resolveProductSource,
  resolveProductUnit,
} from "./productHelpers";

type RequestItemMeta = {
  requested_item_id?: string;
  item_name: string;
  satuan: string;
  unit_price: number;
  source?: string;
};

export const buildRequestItemMeta = (product?: any): RequestItemMeta => {
  if (!product) {
    return {
      requested_item_id: undefined,
      item_name: "",
      satuan: "",
      unit_price: 0,
      source: undefined,
    };
  }

  const requested_item_id = getRequestedItemIdFromProduct(product);
  const item_name = product?.product_name || product?.name || "";
  const satuan = resolveProductUnit(product) || "";
  const unit_price = getUnitPriceFromProduct(product);
  const source = resolveProductSource(product) ?? undefined;

  return {
    requested_item_id,
    item_name,
    satuan,
    unit_price,
    source,
  };
};
