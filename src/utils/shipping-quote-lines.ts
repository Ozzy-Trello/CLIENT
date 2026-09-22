import { shortDestinationLabel } from "./shipping-destination";
import { formatRupiah } from "./shipping-weight";

export interface QuoteItemForText {
  productName: string;
  variantName: string;
  quantity: number;
}

export interface QuoteRateForText {
  courierName: string;
  service: string;
  cost: number;
  etd: string | null;
}

export const ESTIMATE_NOTE = [
  "• Ongkir hanya estimasi awal.",
  "• Estimasi waktu pengiriman dihitung setelah paket diserahkan ke ekspedisi",
  "• Tarif akhir akan menyesuaikan hasil timbang serta ketentuan ekspedisi.",
].join("\n");

/**
 * Menyusun nama produk untuk autotext WhatsApp. Satu pesanan bisa memuat
 * lebih dari satu produk, dan tiap produk bisa punya beberapa varian, jadi
 * nama yang sama hanya ditulis sekali.
 */
export function buildOrderLines(items: QuoteItemForText[]): string {
  const names: string[] = [];
  for (const item of items) {
    if (!names.includes(item.productName)) names.push(item.productName);
  }
  return names.join(", ");
}

/**
 * Pesan siap tempel ke chat konsumen. Berat yang ditampilkan adalah berat
 * hitung ongkir, bukan berat produk, karena itu yang dipakai ekspedisi.
 */
export function buildQuoteMessage(input: {
  originName: string;
  destinationLabel: string;
  items: QuoteItemForText[];
  totalPieces: number;
  billedWeightKg: number;
  rates: QuoteRateForText[];
}): string {
  const rateLines = input.rates
    .map(
      (rate, index) =>
        // Barisnya tetap ditulis walau ekspedisi tidak memberi estimasi,
        // supaya nomor urut dan bentuk tiap pilihan tetap sejajar.
        `${index + 1}. ${rate.courierName} ${rate.service} — ${formatRupiah(rate.cost)}` +
        `\n   Estimasi ${rate.etd || "-"}`
    )
    .join("\n");

  return [
    `Berikut estimasi ongkir pesanannya\nDari: ${input.originName}\nKe: ${shortDestinationLabel(input.destinationLabel)}.`,
    `Produk: ${buildOrderLines(input.items)}\nTotal Pesanan: ${input.totalPieces}pcs\nEstimasi berat: ${input.billedWeightKg} kg`,
    rateLines,
    ESTIMATE_NOTE,
    "Kakak mau pilih pengiriman yang mana?",
  ].join("\n\n");
}
