import { api } from ".";

export type TelegramLinkStatus = {
  linked: boolean;
  telegramUsername?: string | null;
  telegramFirstName?: string | null;
  linkedAt?: string | null;
};

export const startTelegramLink = async (): Promise<{
  deepLink: string;
  expiresInSeconds: number;
}> => {
  const { data } = await api.post("/account/telegram/link");
  return data;
};

export const getTelegramLinkStatus = async (): Promise<TelegramLinkStatus> => {
  const { data } = await api.get("/account/telegram/status");
  return data;
};

export const unlinkTelegram = async (): Promise<{ unlinked: boolean }> => {
  const { data } = await api.delete("/account/telegram/link");
  return data;
};
