import TokenStorage from "@utils/token-storage";

export interface DesignZipUploadError {
  variant: string;
  error: string;
}

export interface DesignZipUploadResult {
  total_attempted: number;
  total_matched: number;
  total_updated: number;
  total_skipped: number;
  collection_code: string;
  collar_variant: string;
  errors: DesignZipUploadError[];
}

export const uploadDesignTypeImageZip = async (
  file: File,
): Promise<DesignZipUploadResult> => {
  const formData = new FormData();
  formData.append("file", file);

  const baseUrl = `${process.env.NEXT_PUBLIC_BE_BASE_URL}/v1`;
  const token = TokenStorage.getAccessToken();

  const response = await fetch(
    `${baseUrl}/design/master-data/type-images/upload-zip`,
    {
      method: "POST",
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : undefined,
      body: formData,
    },
  );

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.message || "Failed to upload ZIP");
  }

  return body?.data;
};
