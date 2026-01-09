import { api } from ".";
import { FileUpload } from "../types/file-upload";
import { ApiResponse } from "../types/type";

export const uploadFile = async (
  file: File,
  options?: { cardId?: string }
): Promise<ApiResponse<FileUpload>> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("name", file.name);
  formData.append("prefix", file.type);
  if (options?.cardId) {
    formData.append("card_id", options.cardId);
  }

  try {
    const { data } = await api.post("/file", formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      transformRequest: [(data) => data],
    });

    return data;
  } catch (error) {
    throw error;
  }
};

export const updateFileName = async (
  fileId: string,
  name: string
): Promise<ApiResponse<FileUpload>> => {
  const { data } = await api.put(`/file/${fileId}`, { name });
  return data;
};
