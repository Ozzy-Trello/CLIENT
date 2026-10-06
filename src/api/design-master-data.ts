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

export interface DesignZipUploadProgress {
  done: number;
  total: number;
}

/**
 * Upload the ZIP and report progress as the server streams it.
 *
 * The server does the real work and used to answer only at the end, so the
 * bar had nothing truthful to show. It now emits a progress event after each
 * batch of image pairs; fall back to no progress if the stream never arrives.
 */
export const uploadDesignTypeImageZip = async (
  file: File,
  onProgress?: (progress: DesignZipUploadProgress) => void,
): Promise<DesignZipUploadResult> => {
  const formData = new FormData();
  formData.append("file", file);

  const baseUrl = `${process.env.NEXT_PUBLIC_BE_BASE_URL}/v1`;
  const token = TokenStorage.getAccessToken();

  const response = await fetch(`${baseUrl}/design/master-data/type-images/upload-zip`, {
    method: "POST",
    headers: {
      Accept: "text/event-stream",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("text/event-stream")) {
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(body?.message || "Failed to upload ZIP");
    }
    return body?.data;
  }

  if (!response.body) {
    throw new Error("Upload stream unavailable");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: DesignZipUploadResult | undefined;
  let streamError: string | undefined;

  const handleEvent = (raw: string) => {
    let event = "message";
    const dataLines: string[] = [];

    for (const line of raw.split("\n")) {
      if (line.startsWith("event:")) {
        event = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trim());
      }
    }
    if (dataLines.length === 0) return;

    const payload = JSON.parse(dataLines.join("\n"));

    if (event === "progress") {
      onProgress?.({ done: payload.done ?? 0, total: payload.total ?? 0 });
    } else if (event === "error") {
      streamError = payload.message || "Failed to upload ZIP";
    } else {
      result = payload?.data;
    }
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    let boundary = buffer.indexOf("\n\n");
    while (boundary !== -1) {
      const rawEvent = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      if (rawEvent.trim()) handleEvent(rawEvent);
      boundary = buffer.indexOf("\n\n");
    }
  }

  if (buffer.trim()) handleEvent(buffer);
  if (streamError) throw new Error(streamError);
  if (!result) throw new Error("Upload finished without a result");

  return result;
};