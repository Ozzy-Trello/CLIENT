// Harus cocok dengan backend/src/utils/shipping_weight.ts. Angka di layar dan
// angka yang dikirim ke ekspedisi tidak boleh berbeda.
export const WEIGHT_ROUND_UP_THRESHOLD_GRAMS = 300;

export function roundShippingKg(grams: number): number {
  if (!Number.isFinite(grams) || grams <= 0) return 0;
  const remainder = grams % 1000;
  const base = Math.floor(grams / 1000);
  return Math.max(
    1,
    base + (remainder >= WEIGHT_ROUND_UP_THRESHOLD_GRAMS ? 1 : 0)
  );
}

export const formatGrams = (grams: number): string =>
  `${grams.toLocaleString("id-ID")} g`;

export const formatRupiah = (amount: number): string =>
  `Rp${amount.toLocaleString("id-ID")}`;
