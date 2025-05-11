import { api } from ".";

export const getAllItemCategories = async () => {
  const { data } = await api.get("/accurate/item-category-list");
  return data;
};

export const getAllAdjustmentItems = async () => {
  const { data } = await api.get("/accurate/glaccount-list");
  return data;
};

export const getAllItemList = async (search?: string) => {
  const params = search ? { search } : {};
  const { data } = await api.get("/accurate/item-list", { params });
  return data;
};

export const getAllRequests = async (
  page = 1,
  limit = 10,
  filter?: Record<string, any>
) => {
  const { data } = await api.get(`/request`, {
    params: { page, limit, ...filter },
  });
  return data;
};

export const submitRequest = async (params: any) => {
  const { data } = await api.post("/request", params);
  return data;
};

export const verifyRequest = async (id: string) => {
  const { data } = await api.post(`/request/${id}/verify`);
  return data;
};

export const updateRequest = async (id: string, requestSent: number) => {
  const { data } = await api.patch(`/request/${id}`, { requestSent });
  return data;
};

export const updateWarehouseReturn = async (
  id: string,
  warehouseReturned: boolean
) => {
  const { data } = await api.patch(`/request/${id}`, { warehouseReturned });
  return data;
};

export const updateWarehouseFinalAmount = async (
  id: string,
  warehouseFinalUsedAmount: number
) => {
  const { data } = await api.patch(`/request/${id}`, {
    warehouseFinalUsedAmount,
  });
  return data;
};

export const getRequestsByCardId = async (cardId: string) => {
  const { data } = await api.get(`/request/card/${cardId}`);
  return data;
};

export const updateRequestReceived = async (
  id: string,
  requestReceived: number
) => {
  const { data } = await api.patch(`/request/${id}`, { requestReceived });
  return data;
};
