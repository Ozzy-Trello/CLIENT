export const resolveProductKey = (product: any): string => {
  const rawKey =
    product?.accurateId ??
    product?.id ??
    product?.productId ??
    product?.accurate_id ??
    product?.product_id;
  return rawKey !== undefined && rawKey !== null ? rawKey.toString() : "";
};

export const resolveAccurateDbId = (product: any): string | undefined => {
  const raw =
    product?.accurateDbId ??
    product?.accurate_db_id ??
    product?.warehouseProduct?.accurateDbId ??
    product?.warehouseProduct?.accurate_db_id;

  if (raw === undefined || raw === null) return undefined;
  const trimmed = String(raw).trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const resolveProductUnit = (product: any): string | undefined => {
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

export const getRequestedItemIdFromProduct = (
  item?: any
): string | undefined => {
  if (!item) return undefined;

  // Prefer a composite key (id + db/source) to avoid collisions across databases.
  const compositeKey = buildProductSelectionKey(item);
  if (compositeKey) {
    return compositeKey;
  }

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
  return candidate !== undefined && candidate !== null
    ? String(candidate)
    : undefined;
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

export const buildProductSelectionKey = (product: any): string => {
  const baseKey = resolveProductKey(product);
  if (!baseKey) return "";

  const accurateDbId = resolveAccurateDbId(product);
  const source = resolveProductSource(product);
  const parts = [`id:${baseKey}`];

  if (accurateDbId) {
    parts.push(`db:${accurateDbId}`);
  }

  if (source) {
    parts.push(`src:${source}`);
  }

  return parts.join("|");
};

export const parseProductSelectionKey = (
  selection: string | undefined | null
): { productId: string; accurateDbId?: string; source?: string } => {
  const rawSelection = selection ? selection.toString().trim() : "";
  const parts = rawSelection.split("|");

  let productId = rawSelection;
  let accurateDbId: string | undefined;
  let source: string | undefined;

  parts.forEach((part) => {
    if (part.startsWith("id:")) {
      productId = part.slice(3);
    } else if (part.startsWith("db:")) {
      const value = part.slice(3);
      if (value && value !== "unknown") {
        accurateDbId = value;
      }
    } else if (part.startsWith("src:")) {
      const value = part.slice(4);
      if (value) {
        source = value;
      }
    }
  });

  if (
    productId &&
    productId.includes("|") &&
    !productId.startsWith("id:")
  ) {
    productId = productId.split("|")[0];
  }

  return { productId, accurateDbId, source };
};
