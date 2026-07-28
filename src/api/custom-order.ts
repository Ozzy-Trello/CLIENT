import api from "./index";

export interface CustomOrderInvitation {
  url: string;
  expiresAt: string;
}

export async function createCustomOrderInvitation(boardId: string): Promise<CustomOrderInvitation> {
  const { data } = await api.post("/pos/form-custom/invitations", { boardId });
  return data?.data ?? data;
}
