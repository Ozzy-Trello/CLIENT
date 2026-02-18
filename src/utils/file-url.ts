const FILE_PROXY_PATH = "/api/file-proxy";

const isHttpUrl = (value: string): boolean => /^https?:\/\//i.test(value);

const safeDecode = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const decodeCandidates = (value: string): string[] => {
  const candidates: string[] = [];
  const seen = new Set<string>();
  const push = (candidate: string) => {
    if (!candidate || seen.has(candidate)) return;
    seen.add(candidate);
    candidates.push(candidate);
  };

  push(value);
  const once = safeDecode(value);
  push(once);
  const twice = safeDecode(once);
  push(twice);

  return candidates;
};

const stripAppOrigin = (value: string): string => {
  if (!value) return value;

  if (typeof window !== "undefined") {
    const appOrigin = window.location.origin;
    if (value.startsWith(appOrigin)) {
      return value.slice(appOrigin.length);
    }
  }

  try {
    const parsed = new URL(value);
    if (parsed.pathname.startsWith(FILE_PROXY_PATH)) {
      return `${parsed.pathname}${parsed.search}`;
    }
  } catch {
    // Keep as-is if it's not an absolute URL.
  }

  return value;
};

export const isFileProxyUrl = (value?: string): boolean => {
  if (!value) return false;
  const normalized = stripAppOrigin(value.trim());
  return (
    normalized.startsWith(`${FILE_PROXY_PATH}?`) ||
    normalized.startsWith(`${FILE_PROXY_PATH}/`)
  );
};

export const extractOriginalFileUrl = (value?: string): string | null => {
  if (!value) return null;
  const normalized = stripAppOrigin(value.trim());

  if (normalized.startsWith(`${FILE_PROXY_PATH}?`)) {
    const queryString = normalized.split("?")[1] || "";
    const encodedUrl = new URLSearchParams(queryString).get("url");
    if (!encodedUrl) return null;
    for (const candidate of decodeCandidates(encodedUrl)) {
      if (isHttpUrl(candidate)) return candidate;
    }
    return null;
  }

  if (normalized.startsWith(`${FILE_PROXY_PATH}/`)) {
    const encodedUrl = normalized.slice(`${FILE_PROXY_PATH}/`.length);
    for (const candidate of decodeCandidates(encodedUrl)) {
      if (isHttpUrl(candidate)) return candidate;
    }
    return null;
  }

  return null;
};

export const toDirectFileUrl = (value?: string): string => {
  if (!value) return "";
  return extractOriginalFileUrl(value) || stripAppOrigin(value.trim());
};

export const buildFileProxyUrl = (value?: string): string => {
  if (!value) return "";
  const targetUrl = extractOriginalFileUrl(value) || value.trim();
  if (!isHttpUrl(targetUrl)) return targetUrl;
  return `${FILE_PROXY_PATH}?url=${encodeURIComponent(targetUrl)}`;
};

