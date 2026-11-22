import type { MiniWarehouseLabel } from "@api/mini-warehouse";

export function expandLabelQuantities(
  total: number,
  packages: Array<{ quantity: number; count: number }>,
) {
  const labels: number[] = [];
  for (const { quantity, count } of packages) {
    if (!Number.isInteger(count) || count < 1 || labels.length + count > 100) {
      throw new Error("Gunakan maksimal 100 label per input stok.");
    }
    if (!Number.isFinite(quantity) || quantity <= 0 || Number(quantity.toFixed(4)) !== quantity) {
      throw new Error("Isi qty per kemasan dengan maksimal 4 angka desimal.");
    }
    for (let index = 0; index < count; index++) labels.push(quantity);
  }
  const labelTotal = labels.reduce((sum, quantity) => sum + Math.round(quantity * 10000), 0);
  if (labelTotal !== Math.round(total * 10000)) {
    throw new Error("Total qty label harus sama dengan jumlah stok masuk.");
  }
  return labels;
}

export async function downloadMiniWarehouseLabels(labels: MiniWarehouseLabel[]) {
  if (!labels.length) return;
  const [{ jsPDF }, { default: QRCode }] = await Promise.all([
    import("jspdf"),
    import("qrcode"),
  ]);
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: [103, 16], compress: true });
  for (let index = 0; index < labels.length; index++) {
    const label = labels[index];
    const position = index % 3;
    if (index > 0 && position === 0) pdf.addPage();
    const x = position * 35;
    const { modules } = QRCode.create(label.code.toUpperCase(), { errorCorrectionLevel: "M" });
    const step = 13 / (modules.size + 8);
    pdf.setFillColor("#000000");
    for (let row = 0; row < modules.size; row++) {
      let col = 0;
      while (col < modules.size) {
        if (!modules.get(row, col)) {
          col++;
          continue;
        }
        const start = col;
        while (col < modules.size && modules.get(row, col)) col++;
        pdf.rect(x + (start + 4) * step, 1 + (row + 4) * step, (col - start) * step, step, "F");
      }
    }

    const quantity = Number(label.quantity).toLocaleString("id-ID", { maximumFractionDigits: 4 });
    pdf.setFontSize(7);
    pdf.text(`${quantity} ${label.unitType}`, x + 13, 4, { maxWidth: 19 });
    pdf.setFontSize(6);
    pdf.text(pdf.splitTextToSize(label.itemCode || "-", 19)[0], x + 13, 7);
    pdf.text(pdf.splitTextToSize(label.itemName, 19).slice(0, 2), x + 13, 10, { lineHeightFactor: 1.2 });
  }
  pdf.save("barcode-mini-warehouse.pdf");
}
