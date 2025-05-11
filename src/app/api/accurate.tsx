import { api } from ".";

export const getAllItemCategories = async () => {
  const { data } = await api.get("/accurate/item-category-list");
  return data;
};

export const getAllAdjustmentItems = async () => {
  const { data } = await api.get("/accurate/glaccount-list");
  return data;
};

export const getAllItemList = async () => {
  const { data } = await api.get("/accurate/item-list");
  return data;
};

export const getAllRequests = async (page = 1, limit = 10) => {
  const { data } = await api.get(`/request`, { params: { page, limit } });
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
