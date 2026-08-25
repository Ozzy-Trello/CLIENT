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
