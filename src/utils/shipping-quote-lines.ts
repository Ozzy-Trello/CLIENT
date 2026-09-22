export interface QuoteItemForText {
  productName: string;
  variantName: string;
  quantity: number;
}

/**
 * Menyusun rincian pesanan per produk untuk autotext WhatsApp. Satu pesanan
 * bisa memuat lebih dari satu produk, jadi varian dikelompokkan di bawah
 * nama produknya masing-masing.
 */
export function buildOrderLines(items: QuoteItemForText[]): string {
  const grouped = new Map<string, string[]>();
  for (const item of items) {
    const rows = grouped.get(item.productName) ?? [];
    rows.push(`  ${item.variantName}: ${item.quantity} pcs`);
    grouped.set(item.productName, rows);
  }
  return Array.from(grouped.entries())
    .map(([productName, rows]) => `${productName}\n${rows.join("\n")}`)
    .join("\n");
}
