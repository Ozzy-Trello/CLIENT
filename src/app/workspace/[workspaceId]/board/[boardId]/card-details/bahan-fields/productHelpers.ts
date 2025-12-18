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

const ACCURATE_DB_SOURCE_MAP: Record<string, string> = {
  "1880451": "MPI",
  "1880365": "Hikmat",
  "1954066": "KUI",
};

const normalizeSource = (value?: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  const raw = String(value).trim();
  if (!raw) return undefined;
  const lower = raw.toLowerCase();
  if (lower === "hikmat") return "Hikmat";
  if (lower === "mpi") return "MPI";
  if (lower === "kui") return "KUI";
  return raw;
};

export const resolveProductSource = (item?: any): string | undefined => {
  if (!item) return undefined;

  const candidates = [
    normalizeSource(item.source),
    normalizeSource(item.warehouseProduct?.source),
    normalizeSource(item.productSource),
    normalizeSource(item.warehouseProduct?.productSource),
  ].filter(Boolean) as string[];

  if (candidates.length > 0) {
    return candidates[0];
  }

  const accurateDbId =
    item.accurateDbId ??
    item.accurate_db_id ??
    item.warehouseProduct?.accurateDbId ??
    item.warehouseProduct?.accurate_db_id;

  if (accurateDbId !== undefined && accurateDbId !== null) {
    const mapped = ACCURATE_DB_SOURCE_MAP[String(accurateDbId)];
    return normalizeSource(mapped);
  }

  return undefined;
};
