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
  pagination?: {
    currentPage: number;
    lastPage: number;
    perPage: number;
    total: number;
    from: number;
    to: number;
  };
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

// New interfaces for packing data structure
export interface OzzyPackingProduct {
  id: number;
  accurateId: number;
  accurateDbId: number;
  name: string;
  sku: string;
  barcode: string;
  unitType: string;
  unitPrice: string;
  unitData: string;
  categoryId: number;
  categoryName: string;
  quantity: string;
  description: string | null | undefined;
  createdAt: string;
  updatedAt: string;
  qrCodeImage: string;
}

export interface OzzyPackingItem {
  id: number;
  whPackingId: number;
  whPurchaseOrderItemId: number;
  whProductId: number;
  quantityPacked: number;
  unitType: string;
  note: string | null;
  cartonNo: string | null;
  batchNo: string | null;
  createdAt: string;
  updatedAt: string;
  product: OzzyPackingProduct;
  // Frontend compatibility
  quantity?: number;
  unit_type?: string;
  whMaklonProductId?: number;
}

export interface OzzyPurchaseOrder {
  id: number;
  whVendorId: number;
  whCustomerId: number;
  whWarehouseId: number | null;
  poNumber: string | null;
  soNumber: string;
  date: string;
  supplierName: string;
  shippingAddress: string;
  note: string | null;
  status: string;
  createdBy: string;
  whBranchId: number;
  createdAt: string;
  updatedAt: string;
  accurateIdOzzy: string | null;
  accurateIdMpi: string | null;
}

// Raw purchase order response from API (snake_case + camelCase for FE compatibility)
export interface OzzyRawPurchaseOrder {
  id: number;
  wh_vendor_id: number;
  wh_customer_id: number;
  wh_warehouse_id: number | null;
  po_number: string | null;
  so_number: string;
  date: string;
  supplier_name: string;
  shipping_address: string;
  note: string | null;
  status: string;
  created_by: string;
  wh_branch_id: number;
  created_at: string;
  updated_at: string;
  accurate_id_ozzy: string | null;
  accurate_id_mpi: string | null;
  status_cetak: number;
  purchase_order_items: OzzyRawPurchaseOrderItem[];
  // Frontend camelCase properties (added by interceptor)
  soNumber?: string;
  supplierName?: string;
  items?: OzzyRawPurchaseOrderItem[];
  accurateIdMpi?: string | null;
  createdAt?: string;
  updatedAt?: string;
  accurateIdOzzy?: string | null;
  poNumber?: string | null;
  shippingAddress?: string;
  createdBy?: string;
  whBranchId?: number;
  whVendorId?: number;
  whCustomerId?: number;
  whWarehouseId?: number | null;
  purchaseOrderItems?: OzzyRawPurchaseOrderItem[];
  customer?: {
    id: number;
    customer_no: string;
    name: string;
    email: string | null;
    mobilephone: string | null;
    branch_name: string | null;
    branch_id: number | null;
    accurate_id: number;
    accurate_db_id: number;
    created_at: string;
    updated_at: string;
    address?: string;
  };
  warehouse?: any;
}

export interface OzzyRawPurchaseOrderItem {
  id: number;
  wh_purchase_order_id: number;
  wh_product_id: number;
  wh_maklon_product_id: number;
  quantity: number;
  unit_type: string;
  note: string | null;
  created_at: string;
  updated_at: string;
  // Frontend camelCase properties (added by interceptor)
  whPurchaseOrderId?: number;
  whProductId?: number;
  whMaklonProductId?: number;
  quantityPacked?: number;
  unitType?: string;
  createdAt?: string;
  updatedAt?: string;
  product?: {
    id: number;
    accurate_id: number;
    accurate_db_id: number;
    status_product_accurate: number;
    name: string;
    sku: string;
    barcode: string;
    unit_type: string;
    unit_price: string;
    unit_data: string;
    category_id: number;
    category_name: string;
    quantity: string;
    description: string | null;
    created_at: string;
    updated_at: string;
    qr_code_image: string;
  };
}

// Frontend camelCase versions (after interceptor conversion)
export interface OzzyPurchaseOrderFE {
  id: number;
  whVendorId: number;
  whCustomerId: number;
  whWarehouseId: number | null;
  poNumber: string | null;
  soNumber: string;
  date: string;
  supplierName: string;
  shippingAddress: string;
  note: string | null;
  status: string;
  createdBy: string;
  whBranchId: number;
  createdAt: string;
  updatedAt: string;
  accurateIdOzzy: string | null;
  accurateIdMpi: string | null;
  statusCetak: number;
  purchaseOrderItems: OzzyPurchaseOrderItemFE[];
  customer?: {
    id: number;
    customerNo: string;
    name: string;
    email: string | null;
    mobilephone: string | null;
    branchName: string | null;
    branchId: number | null;
    accurateId: number;
    accurateDbId: number;
    createdAt: string;
    updatedAt: string;
  };
  warehouse?: any;
}

export interface OzzyPurchaseOrderItemFE {
  id: number;
  whPurchaseOrderId: number;
  whProductId: number;
  whMaklonProductId: number;
  quantity: number;
  unitType: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  product?: {
    id: number;
    accurateId: number;
    accurateDbId: number;
    statusProductAccurate: number;
    name: string;
    sku: string;
    barcode: string;
    unitType: string;
    unitPrice: string;
    unitData: string;
    categoryId: number;
    categoryName: string;
    quantity: string;
    description: string | null;
    createdAt: string;
    updatedAt: string;
    qrCodeImage: string;
  };
}

export interface OzzyPackingData {
  id: number;
  whPurchaseOrderId: number;
  whWarehouseId: number | null;
  whBranchId: number;
  packingNumber: string | null;
  status: string;
  createdBy: string;
  packedBy: string;
  packedAt: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  whDeliveryOrderId: number | null;
  purchaseOrder: OzzyPurchaseOrder;
  items: OzzyPackingItem[];
  // Frontend properties for compatibility
  soNumber?: string;
  supplierName?: string;
  date?: string;
  purchase_order_items?: OzzyPackingItem[];
  so_number?: string;
  accurateIdOzzy?: string | null;
  whCustomerId?: number;
  totalQuantity?: number;
  customer?: {
    id: number;
    customer_no: string;
    name: string;
    email: string | null;
    mobilephone: string | null;
    branch_name: string | null;
    branch_id: number | null;
    accurate_id: number;
    accurate_db_id: number;
    created_at: string;
    updated_at: string;
    address?: string;
  };
}

export interface CreateDeliveryOrderPayload {
  deliveryDate: string;
  branchId: number;
  customerId: number;
  shippingAddress: string;
  note?: string | null;
  soNumbers: string[];
  productQuantities: Array<{
    productId: string;
    quantity: number;
  }>;
  accurateDbId?: string | null;
}

export interface CreatePackingPayload {
  soNumber: string;
  productQuantities: Array<{
    productId: string | number;
    quantity: string | number;
  }>;
  accurateDbId?: string | null;
}

export interface CreateSalesOrderPayload {
  wh_customer_id: string;
  date: string;
  shipping_address: string;
  note?: string;
  product_id: string[];
  quantity: Record<string, string>;
  cardId?: string;
}

export interface CreateSalesOrderResponse {
  status: boolean;
  message: string;
  data: {
    totalQty: number;
    description: string;
    items: any[];
    po_number: string | null;
    so_number: string;
    supplier_name: string;
    wh_vendor_id: number;
    wh_warehouse_id: number | null;
    date: string;
    shipping_address: string;
    status: string;
    note: string;
    created_by: string;
    wh_branch_id: number;
    wh_customer_id: string;
    updated_at: string;
    created_at: string;
    id: number;
    branch_name: string;
    attachment: string;
    soNumber: string;
  };
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

export const getOzzyProductById = async (
  productId: number,
  accurateDbId?: string
): Promise<OzzyProduct | null> => {
  try {
    const products = await getOzzyProducts(accurateDbId);
    return products.find(product => product.id === productId) || null;
  } catch (error) {
    console.error("Error fetching product by ID:", error);
    return null;
  }
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
  limit?: number,
  packing?: number
): Promise<OzzyPackingData[]> => {
  const params: Record<string, any> = {};
  
  if (limit !== undefined) {
    params.limit = limit;
  }
  
  if (packing !== undefined) {
    params.packing = packing;
  }

  const { data } = await api.get<OzzyWarehouseResponse<OzzyPackingData[]>>(
    "/warehouse/ozzy/sales-orders",
    { params: Object.keys(params).length > 0 ? params : undefined }
  );

  // Some endpoints return string "success"
  if (Array.isArray(data.data)) {
    return data.data;
  }

  return [];
};

// New function to get raw sales orders for packing
export const getOzzyRawSalesOrders = async (
  limit?: number,
  packing?: number
): Promise<OzzyRawPurchaseOrder[]> => {
  const params: Record<string, any> = {};
  
  if (limit !== undefined) {
    params.limit = limit;
  }
  
  if (packing !== undefined) {
    params.packing = packing;
  }

  const { data } = await api.get<OzzyWarehouseResponse<OzzyRawPurchaseOrder[]>>(
    "/warehouse/ozzy/sales-orders",
    { params: Object.keys(params).length > 0 ? params : undefined }
  );

  // Some endpoints return string "success"
  if (Array.isArray(data.data)) {
    return data.data;
  }

  return [];
};

// New function to get raw sales order by ID for packing
export const getOzzyRawSalesOrderById = async (
  soNumber: string
): Promise<OzzyRawPurchaseOrder | null> => {
  try {
    const { data } = await api.get<OzzyWarehouseResponse<OzzyRawPurchaseOrder>>(
      `/warehouse/ozzy/sales-order/${soNumber}`
    );
    
    if (!data.data) {
      return null;
    }

    return data.data;
  } catch (error) {
    console.error("Error fetching raw sales order:", error);
    return null;
  }
};

export const getOzzySalesOrderById = async (
  soNumber: string
): Promise<OzzyPackingData | null> => {
  try {
    const { data } = await api.get<OzzyWarehouseResponse<any>>(
      `/warehouse/ozzy/sales-order/${soNumber}`
    );
    
    if (!data.data) {
      return null;
    }

    const rawPO = data.data;
    
    // Transform raw purchase order to OzzyPackingData format
    // Note: API interceptor converts snake_case to camelCase
    const transformedData: OzzyPackingData = {
      id: rawPO.id,
      whPurchaseOrderId: rawPO.id,
      whWarehouseId: rawPO.whWarehouseId,
      whBranchId: rawPO.whBranchId,
      packingNumber: null,
      status: rawPO.status,
      createdBy: rawPO.createdBy,
      packedBy: rawPO.createdBy,
      packedAt: rawPO.createdAt,
      note: rawPO.note,
      createdAt: rawPO.createdAt,
      updatedAt: rawPO.updatedAt,
      whDeliveryOrderId: null,
      purchaseOrder: {
        id: rawPO.id,
        whVendorId: rawPO.whVendorId,
        whCustomerId: rawPO.whCustomerId,
        whWarehouseId: rawPO.whWarehouseId,
        poNumber: rawPO.poNumber,
        soNumber: rawPO.soNumber,
        date: rawPO.date,
        supplierName: rawPO.supplierName,
        shippingAddress: rawPO.shippingAddress,
        note: rawPO.note,
        status: rawPO.status,
        createdBy: rawPO.createdBy,
        whBranchId: rawPO.whBranchId,
        createdAt: rawPO.createdAt,
        updatedAt: rawPO.updatedAt,
        accurateIdOzzy: rawPO.accurateIdOzzy,
        accurateIdMpi: rawPO.accurateIdMpi,
      },
      items: (rawPO.purchaseOrderItems || []).map((item: any) => ({
        id: item.id,
        whPackingId: rawPO.id,
        whPurchaseOrderItemId: item.id,
        whProductId: item.whProductId,
        quantityPacked: item.quantity,
        unitType: item.unitType,
        note: item.note,
        cartonNo: null,
        batchNo: null,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        product: {
          id: item.whProductId,
          accurateId: 0,
          accurateDbId: 0,
          name: `Product ${item.whProductId}`,
          sku: `SKU-${item.whProductId}`,
          barcode: '',
          unitType: item.unitType,
          unitPrice: '0',
          unitData: '',
          categoryId: 0,
          categoryName: '',
          quantity: item.quantity.toString(),
          description: null,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          qrCodeImage: '',
        }
      }))
    };
    
    return transformedData;
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
    wh_branch_id: Number(payload.branchId),
    customer_id: Number(payload.customerId),
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

export const createOzzyPacking = async (
  payload: CreatePackingPayload
): Promise<any> => {
  const productMap: Record<string, string> = {};
  const quantityMap: Record<string, string> = {};

  payload.productQuantities.forEach(({ productId, quantity }) => {
    const id = String(productId);
    productMap[id] = id;
    quantityMap[id] = String(quantity);
  });

  const requestBody = {
    so_number: payload.soNumber,
    product_id: productMap,
    quantity: quantityMap,
    accurate_db_id: payload.accurateDbId ?? null,
  };

  const { data } = await api.post("/warehouse/ozzy/packing", requestBody);
  return data;
};

export const createOzzySalesOrder = async (
  payload: CreateSalesOrderPayload
): Promise<CreateSalesOrderResponse> => {
  const response = await api.post(
    "/warehouse/ozzy/sales-order",
    payload,
    withApiKey()
  );

  return response.data;
};

export interface ValidationProduct {
  id: number;
  name: string;
  sku: string;
  quantity: string;
  barcode: string;
  unitType: string;
}

export interface ValidationResponse {
  status: boolean;
  data: {
    productId: number;
    type: string;
    quantity: string;
    product: ValidationProduct;
  };
}

export const validateProductByBarcode = async (
  barcodeProduct: string
): Promise<ValidationResponse> => {
  const { data } = await api.post<ValidationResponse>(
    "/warehouse/validation",
    { barcode_product: barcodeProduct }
  );

  return data;
};

// --- Barcode Product (Scan Produk) ---
// Minimal response type for barcode product lookup (focus on accurateId usage on FE)
export interface OzzyBarcodeProductProduct {
  id?: number;
  accurateId: number;
  accurateDbId?: number;
  name?: string;
  sku?: string;
  unitPrice?: string;
  barcode?: string;
  unitType?: string;
}

export interface OzzyBarcodeProduct {
  id: number;
  whProductId: number;
  barcode: string;
  quantity: string;
  product: OzzyBarcodeProductProduct;
}

// Fetch product details by scanned barcode (GET)
export const getOzzyBarcodeProduct = async (
  barcodeText: string
): Promise<OzzyBarcodeProduct> => {
  const { data } = await api.get<OzzyWarehouseResponse<OzzyBarcodeProduct>>(
    "/warehouse/ozzy/barcode-product",
    {
      params: { barcode_text: barcodeText },
    }
  );
  return data.data;
};
