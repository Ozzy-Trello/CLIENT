/** @jest-environment node */
import { downloadMiniWarehouseLabels } from "./mini-warehouse-labels";

const mockSave = jest.fn();
jest.mock("jspdf", () => {
  const actual = jest.requireActual("jspdf");
  return {
    jsPDF: function (...args: unknown[]) {
      const pdf = new actual.jsPDF(...args);
      pdf.save = (filename: string) => mockSave(filename, pdf.output(), pdf.getNumberOfPages());
      return pdf;
    },
  };
});

it("generates a three-across PDF for the existing 103 × 16 mm label stock", async () => {
  const labels = Array.from({ length: 4 }, (_, index) => ({
    code: `MW-81063F39-3C0F-4D48-AEAD-72E6CF9C9C0${index}`,
    itemName: "Cotton Carded Biru Navy 24s",
    itemCode: "CCD-05",
    unitType: "kg",
    quantity: "1.14",
  }));
  await downloadMiniWarehouseLabels(labels);

  const [filename, pdf, pages] = mockSave.mock.calls[0];
  expect(filename).toBe("barcode-mini-warehouse.pdf");
  expect(pdf).toMatch(/^%PDF-/);
  expect(pdf).toContain("/MediaBox [0 0 291.96");
  expect(pages).toBe(2);
});
