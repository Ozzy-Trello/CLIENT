import { api } from ".";

// Interceptor di src/api/index.tsx sudah mengubah response ke camelCase.
export interface ShippingOrigin {
  id: string;
  branchCode: string;
  name: string;
  address: string;
  destinationId: number;
}

export interface ShippingOriginAdmin {
  id: string;
  branchCode: string;
  name: string;
  address: string | null;
  rajaongkirDestinationId: number | null;
  rajaongkirLabel: string | null;
  isActive: boolean;
  displayOrder: number;
}

export interface ShippingCourierAdmin {
  id: string;
  courierCode: string;
  displayName: string;
  isActive: boolean;
  displayOrder: number;
}

export interface ShippingDestination {
  id: number;
  label: string;
  provinceName: string;
  cityName: string;
  districtName: string;
  subdistrictName: string;
  zipCode: string;
}

export interface ShippingVariant {
  junctionId: string;
  subcategoryId: string;
  name: string;
  shippingWeightGrams: number;
  displayOrder: number;
}

export interface ShippingProduct {
  mainCategoryId: string;
  name: string;
  displayOrder: number;
  variants: ShippingVariant[];
}

export interface ShippingRate {
  courierCode: string;
  courierName: string;
  service: string;
  description: string;
  cost: number;
  etd: string | null;
}

export interface ShippingQuoteLine {
  junctionId: string;
  productName: string;
  variantName: string;
  quantity: number;
  gramsPerPiece: number;
  totalGrams: number;
}

export interface ShippingQuote {
  origin: ShippingOrigin;
  destination: { id: number; label: string };
  items: ShippingQuoteLine[];
  totalPieces: number;
  totalGrams: number;
  billedWeightKg: number;
  rates: ShippingRate[];
  quotedAt: string;
}

const headers = (workspaceId: string) => ({
  headers: { "workspace-id": workspaceId },
});

export const getShippingOrigins = async (
  workspaceId: string
): Promise<ShippingOrigin[]> => {
  const { data } = await api.get("/shipping/origins", headers(workspaceId));
  return data.data ?? [];
};

export const searchShippingDestinations = async (
  workspaceId: string,
  query: string
): Promise<ShippingDestination[]> => {
  const { data } = await api.get(
    `/shipping/destinations?q=${encodeURIComponent(query)}`,
    headers(workspaceId)
  );
  return data.data ?? [];
};

export const getShippingProducts = async (
  workspaceId: string
): Promise<ShippingProduct[]> => {
  const { data } = await api.get("/shipping/products", headers(workspaceId));
  return data.data ?? [];
};

export const createShippingQuote = async (
  workspaceId: string,
  payload: {
    originId: string;
    destinationId: number;
    destinationLabel: string;
    items: Array<{ junctionId: string; quantity: number }>;
  }
): Promise<ShippingQuote> => {
  const { data } = await api.post(
    "/shipping/quote",
    {
      origin_id: payload.originId,
      destination_id: payload.destinationId,
      destination_label: payload.destinationLabel,
      items: payload.items.map((item) => ({
        junction_id: item.junctionId,
        quantity: item.quantity,
      })),
    },
    headers(workspaceId)
  );
  return data.data;
};

export const getShippingOriginsAdmin = async (
  workspaceId: string
): Promise<ShippingOriginAdmin[]> => {
  const { data } = await api.get(
    "/shipping/admin/origins",
    headers(workspaceId)
  );
  return data.data ?? [];
};

export const updateShippingOrigin = async (
  workspaceId: string,
  id: string,
  payload: {
    name?: string;
    address?: string | null;
    rajaongkirDestinationId?: number | null;
    rajaongkirLabel?: string | null;
    isActive?: boolean;
  }
): Promise<ShippingOriginAdmin> => {
  const { data } = await api.put(
    `/shipping/admin/origins/${id}`,
    {
      ...(payload.name !== undefined ? { name: payload.name } : {}),
      ...(payload.address !== undefined ? { address: payload.address } : {}),
      ...(payload.rajaongkirDestinationId !== undefined
        ? { rajaongkir_destination_id: payload.rajaongkirDestinationId }
        : {}),
      ...(payload.rajaongkirLabel !== undefined
        ? { rajaongkir_label: payload.rajaongkirLabel }
        : {}),
      ...(payload.isActive !== undefined ? { is_active: payload.isActive } : {}),
    },
    headers(workspaceId)
  );
  return data.data;
};

export const getShippingCouriersAdmin = async (
  workspaceId: string
): Promise<ShippingCourierAdmin[]> => {
  const { data } = await api.get(
    "/shipping/admin/couriers",
    headers(workspaceId)
  );
  return data.data ?? [];
};

export const updateShippingCourier = async (
  workspaceId: string,
  id: string,
  isActive: boolean
): Promise<ShippingCourierAdmin> => {
  const { data } = await api.put(
    `/shipping/admin/couriers/${id}`,
    { is_active: isActive },
    headers(workspaceId)
  );
  return data.data;
};
