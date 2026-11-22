import { api } from ".";

export interface MiniWarehouseCatalogItem {
  id: string;
  accurateDbId: string;
  accurateId: string;
  itemName: string;
  itemCode: string | null;
  source: string;
  unitType: string | null;
}

export interface MiniWarehouseRequestProduct extends MiniWarehouseCatalogItem {
  itemCode: string;
  availableQuantity: number;
}

export interface MiniWarehouseStockBalance {
  id: string;
  accurateDbId: string;
  accurateId: string;
  itemName: string;
  itemCode: string | null;
  unitType: string;
  quantity: string;
  reservedQuantity: number;
  availableQuantity: number;
}

export const getMiniWarehouseRequestProducts = async (): Promise<MiniWarehouseRequestProduct[]> => {
  const { data } = await api.get("/request/mini-warehouse-products");
  return data.data;
};

export const getMiniWarehouseStock = async (): Promise<MiniWarehouseStockBalance[]> => {
  const { data } = await api.get("/warehouse/mini-stock");
  return data.data;
};

export const getMiniWarehouseCatalog = async (sync = false): Promise<MiniWarehouseCatalogItem[]> => {
  const { data } = await api.get("/warehouse/mini-catalog", { params: { sync } });
  return data.data;
};

export const getMiniWarehouseStocktake = async () => {
  const { data } = await api.get("/warehouse/stocktake");
  return data.data;
};

export const startMiniWarehouseStocktake = async (notes?: string) => {
  const { data } = await api.post("/warehouse/stocktake", { notes });
  return data.data;
};

export const countMiniWarehouseStocktakeItem = async (id: string, countedQuantity: number) => {
  const { data } = await api.patch(`/warehouse/stocktake/items/${id}`, { countedQuantity });
  return data.data;
};

export const completeMiniWarehouseStocktake = async () => {
  const { data } = await api.post("/warehouse/stocktake/complete");
  return data.data;
};

export const cancelMiniWarehouseStocktake = async () => {
  const { data } = await api.post("/warehouse/stocktake/cancel");
  return data.data;
};

export const syncMiniWarehouseCatalog = async () => getMiniWarehouseCatalog(true);

export const getStockRequestItems = async () => {
  const { data } = await api.get("/warehouse/stock-request-items", { params: { page: 1, limit: 200 } });
  return data.data;
};

export const createMiniWarehouseStockRequest = async (payload: {
  nomorDo: string; asal: string; tujuan: string; description?: string;
  items: Array<{ accurateDbId: number; accurateId: number; itemName: string; itemCode?: string; quantity: number; unitType: string }>;
}) => {
  const { data } = await api.post("/warehouse/stock-requests", payload);
  return data.data;
};

export interface MiniWarehouseLabel {
  code: string;
  itemName: string;
  itemCode: string | null;
  unitType: string;
  quantity: string;
}

export interface MiniWarehouseMovement {
  id: string;
  movementType: string;
  quantity: string;
  balanceAfter: string;
  createdAt: string;
  createdByName: string | null;
  note: string | null;
  voidedAt: string | null;
  requestReference: string | number | null;
  labels: MiniWarehouseLabel[];
}

export const recordMiniWarehouseMovement = async (payload: {
  operationId: string;
  accurateDbId: number;
  accurateId: number;
  quantity: number;
  movementType: "opening" | "addition" | "reduction";
  labelQuantities: number[];
  note?: string;
}): Promise<{ labels: MiniWarehouseLabel[] }> => {
  const { data } = await api.post("/warehouse/mini-stock/movements", payload);
  return data.data;
};

export const getMiniWarehouseMovements = async (
  balanceId: string, page: number,
): Promise<{ movements: MiniWarehouseMovement[]; total: number }> => {
  const { data } = await api.get(`/warehouse/mini-stock/${balanceId}/movements`, { params: { page } });
  return data.data;
};

export const reverseMiniWarehouseOpening = async (id: string, note: string) => {
  await api.post(`/warehouse/mini-stock/movements/${id}/reverse-opening`, { note });
};

export const lookupMiniWarehouseLabel = async (
  code: string,
): Promise<MiniWarehouseLabel & { availableQuantity: number; balanceId: string | null; returnPending: boolean }> => {
  const { data } = await api.get("/warehouse/mini-stock/labels/lookup", { params: { code } });
  return data.data;
};

export const fulfillStockRequestItem = async (id: string, source: "mini_warehouse" | "purchase", quantity: number) => {
  const { data } = await api.patch(`/warehouse/stock-request-items/${id}/fulfillment`, { source, quantity });
  return data.data;
};

export const reportStockRequestLeftover = async (id: string, leftoverQuantity: number) => {
  const { data } = await api.post(`/warehouse/stock-request-items/${id}/leftover`, { leftoverQuantity });
  return data.data;
};

export const cancelStockRequestItem = async (id: string) => {
  const { data } = await api.delete(`/warehouse/stock-request-items/${id}`);
  return data.data;
};
