import { api } from ".";

export const getMiniWarehouseStock = async () => {
  const { data } = await api.get("/warehouse/mini-stock");
  return data.data;
};

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

export const recordMiniWarehouseMovement = async (payload: {
  accurateDbId: number; accurateId: number; itemName: string; itemCode?: string;
  unitType: string; quantity: number; movementType: "opening" | "addition"; note?: string;
}) => {
  const { data } = await api.post("/warehouse/mini-stock/movements", payload);
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
