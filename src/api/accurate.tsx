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
  // Create params object with page and limit
  const params: Record<string, any> = { page, limit };

  // If filter is provided, convert it to a query string format
  // The backend expects filter as a string parameter
  if (filter && Object.keys(filter).length > 0) {
    // Convert filter object to JSON string
    params.filter = JSON.stringify(filter);
  }

  const { data } = await api.get(`/request`, { params });
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

export const rejectRequest = async (id: string) => {
  // Use snake_case for API request payload
  const { data } = await api.patch(`/request/${id}`, { is_rejected: true });
  return data;
};

export const markRequestDone = async (id: string) => {
  // Use snake_case for API request payload
  const { data } = await api.patch(`/request/${id}`, { is_done: true });
  return data;
};

export const getItemDetail = async (id: string) => {
  const { data } = await api.get(`/accurate/item/${id}`);
  return data;
};
