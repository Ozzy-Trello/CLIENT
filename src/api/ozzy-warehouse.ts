import type { AxiosRequestConfig } from "axios";
import { api } from "./index";

const restApiKey = process.env.NEXT_PUBLIC_REST_API_KEY;

const withApiKey = (config: AxiosRequestConfig = {}): AxiosRequestConfig => {
  return {
    ...config,
    headers: {
      ...(config.headers ?? {}),
      "X-API-Key": restApiKey || "",
    },
  };
};

export interface OzzyWarehouseResponse<T> {
  status: boolean | string;
  message?: string;
  data: T;
}

export interface OzzyBranch {
  id: number;
  name: string;
  defaultBranch?: number;
  suspended?: number;
  accurateId?: number;
  accurateDbId?: number;
  whBranchId?: number;
}

export interface OzzyProduct {
  id: number;
  accurateId: number;
  accurateDbId: number;
  name: string;
  sku: string;
  barcode: string;
  unitType: string;
  unitPrice: string;
  quantity: string;
  description?: string | null;
  qrCodeImage?: string | null;
}

export interface OzzyCustomer {
  id: number;
  customerNo: string;
  name: string;
  email: string | null;
  mobilephone: string | null;
  branchName: string | null;
  branchId: number | null;
  accurateId: number;
  accurateDbId: number;
}

export interface OzzySalesOrderItem {
  id: number;
  whPurchaseOrderId: number;
  whProductId: number;
  whMaklonProductId: number;
  quantity: number;
  unitType: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface OzzySalesOrder {
  id: number;
  whVendorId: number | null;
  whCustomerId: number | null;
  whWarehouseId: number | null;
  poNumber: string | null;
  soNumber: string;
  date: string;
  supplierName: string;
  shippingAddress: string;
  note: string | null;
  status: string;
  createdBy: string;
  whBranchId: number | null;
  createdAt: string;
  updatedAt: string;
  purchaseOrderItems?: OzzySalesOrderItem[];
}

export interface CreateDeliveryOrderPayload {
  deliveryDate: string;
  branchId: string;
  shippingName: string;
  shippingAddress: string;
  note?: string | null;
  soNumbers: string[];
  productQuantities: Array<{
    productId: string;
    quantity: number;
  }>;
  accurateDbId?: string | null;
}

export const getOzzyBranches = async (
  accurateDbId?: string
): Promise<OzzyBranch[]> => {
  const { data } = await api.get<OzzyWarehouseResponse<OzzyBranch[]>>(
    "/warehouse/ozzy/branches",
    {
      params: accurateDbId ? { accurate_db_id: accurateDbId } : undefined,
    }
  );
  return data.data;
};

export const getOzzyProducts = async (
  accurateDbId?: string
): Promise<OzzyProduct[]> => {
  const { data } = await api.get<OzzyWarehouseResponse<OzzyProduct[]>>(
    "/warehouse/ozzy/products",
    {
      params: accurateDbId ? { accurate_db_id: accurateDbId } : undefined,
    }
  );
  return data.data;
};

export const getOzzyWarehouses = async (
  accurateDbId?: string
): Promise<any> => {
  const { data } = await api.get<OzzyWarehouseResponse<any>>(
    "/warehouse/ozzy/warehouses",
    {
      params: accurateDbId ? { accurate_db_id: accurateDbId } : undefined,
    }
  );
  return data.data;
};

export const getOzzyCustomers = async (
  accurateDbId?: string
): Promise<OzzyCustomer[]> => {
  const { data } = await api.get<OzzyWarehouseResponse<OzzyCustomer[]>>(
    "/warehouse/ozzy/customers",
    {
      params: accurateDbId ? { accurate_db_id: accurateDbId } : undefined,
    }
  );
  return data.data;
};

export const getOzzySalesOrders = async (
  limit?: number
): Promise<OzzySalesOrder[]> => {
  const { data } = await api.get<OzzyWarehouseResponse<OzzySalesOrder[]>>(
    "/warehouse/ozzy/sales-orders",
    { params: limit ? { limit } : undefined }
  );

  // Some endpoints return string "success"
  if (Array.isArray(data.data)) {
    return data.data;
  }

  return [];
};

export const getOzzySalesOrderById = async (
  soNumber: string
): Promise<OzzySalesOrder | null> => {
  try {
    const { data } = await api.get<OzzyWarehouseResponse<OzzySalesOrder>>(
      `/warehouse/ozzy/sales-order/${soNumber}`
    );
    return data.data;
  } catch (error) {
    console.error("Error fetching sales order:", error);
    return null;
  }
};

export const createOzzyDeliveryOrder = async (
  payload: CreateDeliveryOrderPayload
): Promise<any> => {
  const productMap: Record<string, string> = {};
  const quantityMap: Record<string, string> = {};

  payload.productQuantities.forEach(({ productId, quantity }) => {
    const id = String(productId);
    productMap[id] = id;
    quantityMap[id] = String(quantity);
  });

  const requestBody = {
    delivery_date: payload.deliveryDate,
    wh_branch_id: payload.branchId,
    shipping_name: payload.shippingName,
    shipping_address: payload.shippingAddress,
    note: payload.note ?? null,
    so_number: payload.soNumbers,
    product_id: productMap,
    quantity: quantityMap,
    accurate_db_id: payload.accurateDbId ?? null,
  };

  const { data } = await api.post(
    "/warehouse/ozzy/delivery-order",
    requestBody
  );

  return data;
};
