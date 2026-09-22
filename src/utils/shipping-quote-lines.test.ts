import { buildOrderLines } from "./shipping-quote-lines";

describe("buildOrderLines", () => {
  it("menulis satu produk dengan varian di bawahnya", () => {
    expect(
      buildOrderLines([
        { productName: "Polo", variantName: "TPD", quantity: 4 },
        { productName: "Polo", variantName: "TPJ", quantity: 1 },
      ])
    ).toBe("Polo\n  TPD: 4 pcs\n  TPJ: 1 pcs");
  });

  it("memisahkan varian milik produk berbeda", () => {
    expect(
      buildOrderLines([
        { productName: "Polo", variantName: "TPD", quantity: 4 },
        { productName: "Rompi", variantName: "TPD", quantity: 2 },
      ])
    ).toBe("Polo\n  TPD: 4 pcs\nRompi\n  TPD: 2 pcs");
  });

  it("menjaga urutan produk sesuai urutan item", () => {
    const text = buildOrderLines([
      { productName: "Rompi", variantName: "TPD", quantity: 1 },
      { productName: "Polo", variantName: "TPD", quantity: 1 },
    ]);
    expect(text.indexOf("Rompi")).toBeLessThan(text.indexOf("Polo"));
  });

  it("menggabungkan varian produk yang sama walau tidak berurutan", () => {
    expect(
      buildOrderLines([
        { productName: "Polo", variantName: "TPD", quantity: 1 },
        { productName: "Rompi", variantName: "TPD", quantity: 2 },
        { productName: "Polo", variantName: "TPJ", quantity: 3 },
      ])
    ).toBe("Polo\n  TPD: 1 pcs\n  TPJ: 3 pcs\nRompi\n  TPD: 2 pcs");
  });

  it("mengembalikan teks kosong kalau tidak ada item", () => {
    expect(buildOrderLines([])).toBe("");
  });
});
