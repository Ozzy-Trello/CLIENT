import { api } from "./index";
import { ApiResponse } from "../types/type";
import { FileUpload } from "@myTypes/file-upload";

export const uploadFile = async (
  fileOrFormData: File | FormData,
  options?: { cardId?: string; name?: string; prefix?: string; type?: string },
): Promise<ApiResponse<FileUpload>> => {
  const formData =
    fileOrFormData instanceof FormData ? fileOrFormData : new FormData();

  if (!(fileOrFormData instanceof FormData)) {
    formData.append("file", fileOrFormData);
    formData.append("name", options?.name || fileOrFormData.name);
    if (options?.cardId) formData.append("card_id", options.cardId);
    if (options?.prefix) formData.append("prefix", options.prefix);
    if (options?.type) formData.append("type", options.type);
  }

  const { data } = await api.post("/file", formData);
  return data;
};

export const renameFile = async (
  fileId: string,
  name: string,
): Promise<ApiResponse<FileUpload>> => {
  const { data } = await api.patch(`/file/${fileId}/rename`, { name });
  return data;
};
