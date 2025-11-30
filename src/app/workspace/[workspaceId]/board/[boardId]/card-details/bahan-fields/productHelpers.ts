export const getRequestedItemIdFromProduct = (item?: any): string | undefined => {
  if (!item) return undefined;
  const candidate =
    item.sku ??
    item.product_code ??
    item.productCode ??
    item.accurateId ??
    item.accurate_id ??
    item.productId ??
    item.id ??
    item.warehouseProduct?.sku ??
    item.warehouseProduct?.accurate_id ??
    item.warehouseProduct?.accurateId ??
    item.warehouseProduct?.id;
  return candidate !== undefined && candidate !== null ? String(candidate) : undefined;
};

export const getUnitPriceFromProduct = (item?: any): number => {
  if (!item) return 0;
  const warehouse = item.warehouseProduct ?? item;
  const raw =
    warehouse.unit_price ??
    warehouse.unitPrice ??
    warehouse.vendor_price ??
    warehouse.price ??
    warehouse.unitPricePerItem ??
    0;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
};
