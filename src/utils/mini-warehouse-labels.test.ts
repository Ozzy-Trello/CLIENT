import { expandLabelQuantities } from "./mini-warehouse-labels";

describe("Mini Warehouse label quantities", () => {
  it("keeps the individual quantity of each package under the same product", () => {
    expect(expandLabelQuantities(8.08, [
      { quantity: 1.14, count: 1 },
      { quantity: 3.62, count: 1 },
      { quantity: 3.32, count: 1 },
    ])).toEqual([1.14, 3.62, 3.32]);
  });

  it("counts separate packages with the same quantity", () => {
    expect(expandLabelQuantities(0.3, [{ quantity: 0.1, count: 3 }])).toEqual([0.1, 0.1, 0.1]);
  });

  it.each([
    [0.9, 0.1, 3],
    [0.1, 0.1, 0],
    [0.1, 0.1, 101],
    [0.1, 0.10001, 1],
    [0.1, -0.1, 1],
  ])("rejects totals or package inputs that cannot be recorded (%s, %s, %s)", (total, quantity, count) => {
    expect(() => expandLabelQuantities(total, [{ quantity, count }])).toThrow();
  });
});
