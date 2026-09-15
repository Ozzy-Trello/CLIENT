import { isCardListBordirEligible } from "./bordir-gate";

describe("isCardListBordirEligible", () => {
  it("passes cards already in Finishing Bordir", () => {
    expect(isCardListBordirEligible("Finishing Bordir")).toBe(true);
  });

  it("passes cards already in QC Bordir", () => {
    expect(isCardListBordirEligible("QC Bordir")).toBe(true);
  });

  it("is case-insensitive and trims extra whitespace", () => {
    expect(isCardListBordirEligible("  qc   bordir  ")).toBe(true);
    expect(isCardListBordirEligible("FINISHING BORDIR")).toBe(true);
  });

  it("rejects unrelated lists", () => {
    expect(isCardListBordirEligible("Siap Bordir")).toBe(false);
    expect(isCardListBordirEligible("Packing")).toBe(false);
    expect(isCardListBordirEligible("")).toBe(false);
  });
});
