import URLShortener from "@utils/url-shortener";

const CARD_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Hasil scan QR card berupa URL `.../qr/<id>`. Di lapangan ada dua bentuk id:
 * angka `card.short_id` dan short url base64url. Scanner dan copy-paste dari
 * address bar kadang mengirim URL ganda, sisa karakter, atau skema huruf besar
 * (`Https://`). Semua itu gagal di `new URL`, jadi id diambil dengan regex.
 */
const extractQrId = (trimmed: string): string | null => {
  const numeric = trimmed.match(/\/qr\/(\d+)/i)?.[1];
  if (numeric) return numeric;

  const opaque = trimmed.match(/\/qr\/([A-Za-z0-9_-]{4,})/)?.[1];
  if (opaque) return opaque;

  if (/^\d+$/.test(trimmed)) return trimmed;

  return null;
};

/**
 * Ubah hasil scan/paste menjadi card id, atau null kalau tidak bisa dipastikan.
 *
 * Penting: teks yang tidak ter_resolve tidak boleh diteruskan sebagai card id.
 * Route backend `.../receiving/:cardId` tidak bisa mencocokkan teks ber-slash,
 * jadi request-nya jatuh ke catch-all yang membalas 200 + HTML — pemanggil
 * lalu salah mengira PO-nya tidak ada.
 */
export const resolveCardIdFromScan = async (
  scanned: string,
  lookupByShortId: (shortId: string) => Promise<string | null>,
): Promise<string | null> => {
  const trimmed = scanned.trim();
  if (!trimmed) return null;

  if (CARD_UUID.test(trimmed)) return trimmed;

  const qrId = extractQrId(trimmed);
  if (qrId) {
    const byShortId = await lookupByShortId(qrId);
    if (byShortId) return byShortId;
  }

  // Short url base64url dan URL card biasa hanya bisa diselesaikan di sisi klien.
  return URLShortener.extractCardIdFromUrl(trimmed);
};