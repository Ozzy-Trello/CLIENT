import { api } from ".";
import { ApiResponse, FileAttachment } from "../dto/types";

export const uploadFile = async (file: File): Promise<ApiResponse<FileAttachment>> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('name', file.name);
  formData.append('prefix', file.type);

  try {
    const { data } = await api.post("/file", formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      transformRequest: [(data) => data],
    });

    return data;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};