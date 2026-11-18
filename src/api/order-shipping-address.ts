import { api } from ".";

export interface OrderShippingAddress {
  customerPhone: string;
  recipientName: string;
  recipientPhone?: string;
  address: string;
  village: string;
  district: string;
  city: string;
  province: string;
  postalCode: string;
}

export interface OrderShippingDetails {
  shippingAddress: OrderShippingAddress | null;
  customerPhone: string | null;
  confirmationStatus: "pending" | "sending" | "sent" | "failed" | "uncertain" | null;
}

const addressPath = (boardId: string, cardId: string) =>
  `/board/${boardId}/card/${cardId}/shipping-address`;

export async function getOrderShippingDetails(boardId: string, cardId: string): Promise<OrderShippingDetails> {
  const { data } = await api.get(addressPath(boardId, cardId));
  return data.data;
}

export async function saveOrderShippingAddress(
  boardId: string,
  cardId: string,
  address: OrderShippingAddress,
): Promise<OrderShippingAddress> {
  const { data } = await api.put(addressPath(boardId, cardId), address);
  return data.data;
}
