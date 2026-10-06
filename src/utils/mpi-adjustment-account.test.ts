import {
  getMpiAdjustmentAccountName,
  resolveMpiAdjustmentAccount,
} from "./mpi-adjustment-account";

const accounts = [
  { id: 1, no: "5001", name: "HPP Benang" },
  { id: 2, no: "5002", name: "Beban Perlengkapan" },
  { id: 3, no: "5003", name: "HPP Label" },
  { id: 4, no: "5004", name: "HPP Hang Tag" },
  { id: 5, no: "5008.01", name: "HPP Bahan HEMCA Stok" },
  { id: 6, no: "5006", name: "HPP Resleting" },
  { id: 7, no: "5007", name: "HPP Plastik OPP" },
  { id: 8, no: "5008", name: "HPP Kancing" },
  { id: 9, no: "5009", name: "HPP Kain Keras" },
  { id: 10, no: "5010", name: "Persediaan Produk Reject" },
];

describe("MPI inventory-adjustment category mapping", () => {
  it.each([
    ["Benang Obras Hitam", "Benang", "HPP Benang"],
    ["Benang Obras Navy", "Benang", "HPP Benang"],
    ["Kertas Numbering", "Perlengkapan Produksi", "Beban Perlengkapan"],
    ["Label Size HEMCA Custom XL", "Label Size", "HPP Label"],
    ["Label Size HEMCA Custom L", "Label Size", "HPP Label"],
    ["Benang Obras Abu Misty Gelap", "Benang", "HPP Benang"],
    ["Loop Hang Tag", "Hangtag", "HPP Hang Tag"],
    ["Tali Rafia", "Perlengkapan Produksi", "Beban Perlengkapan"],
  ])("maps %s in category %s to %s", (_itemName, category, expected) => {
    const item = { categoryName: category };
    expect(getMpiAdjustmentAccountName(item, "MPI")).toBe(expected);
    expect(resolveMpiAdjustmentAccount(item, "MPI", accounts)?.name).toBe(expected);
  });

  it("overrides an item's old HPP Hemca account with its category mapping", () => {
    const item = {
      cogsGlAccountId: 5,
      itemCategory: { name: "Perlengkapan Produksi" },
    };
    expect(resolveMpiAdjustmentAccount(item, "MPI", accounts)?.name).toBe(
      "Beban Perlengkapan",
    );
  });

  it.each([
    // Reported in NTL-0134: these two kept landing in Persediaan Produk Reject.
    ["Resleting YKK 75 cm Gigi Besar (Jagung) Navy", "Resleting", "HPP Resleting"],
    ["OPP HEMCA Professional Polo Shirt", "Plastik OPP", "HPP Plastik OPP"],
    ["Kancing HEMCA Navy 12mm", "Kancing", "HPP Kancing"],
    ["Kain Keras Polos", "Kain Keras", "HPP Kain Keras"],
    ["Benang Reject Navy", "Reject", "Persediaan Produk Reject"],
  ])(
    "maps %s in category %s to %s",
    (_itemName, category, expected) => {
      const item = { categoryName: category };
      expect(getMpiAdjustmentAccountName(item, "MPI")).toBe(expected);
      expect(resolveMpiAdjustmentAccount(item, "MPI", accounts)?.name).toBe(
        expected,
      );
    },
  );

  it("reads the category from the payload shape the warehouse API returns", () => {
    // /warehouse/ozzy/products sends category_name, not itemCategory.
    const item = { category_name: "Resleting" };
    expect(resolveMpiAdjustmentAccount(item, "MPI", accounts)?.name).toBe(
      "HPP Resleting",
    );
  });

  it("does not apply MPI rules to other sources or unrelated categories", () => {
    expect(
      getMpiAdjustmentAccountName(
        { itemCategory: { name: "Benang" } },
        "Hikmat",
      ),
    ).toBeNull();
    expect(
      getMpiAdjustmentAccountName(
        { itemCategory: { name: "Kain" } },
        "MPI",
      ),
    ).toBeNull();
  });
});
