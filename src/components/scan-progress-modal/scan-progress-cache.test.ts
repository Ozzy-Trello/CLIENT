import { applyScannedItem } from "./scan-progress-cache";

const progress = (items: any[], scanned: number) => ({
  data: { scanned, total: items.length, items },
});

describe("applyScannedItem", () => {
  it("marks the scanned row and bumps the counter", () => {
    const previous = progress(
      [
        { id: "a", scanned: false, scannedAt: null },
        { id: "b", scanned: false, scannedAt: null },
      ],
      0
    );

    const next = applyScannedItem(previous, {
      id: "b",
      scanned: true,
      scannedAt: "2026-10-05T08:00:00Z",
    });

    expect(next.data.scanned).toBe(1);
    expect(next.data.items[1]).toMatchObject({ scanned: true });
    // Untouched rows keep their identity so the list does not re-render whole.
    expect(next.data.items[0]).toBe(previous.data.items[0]);
  });

  it("does not double count a row scanned twice", () => {
    const previous = progress(
      [{ id: "a", scanned: true, scannedAt: "2026-10-05T07:00:00Z" }],
      1
    );

    const next = applyScannedItem(previous, {
      id: "a",
      scanned: true,
      scannedAt: "2026-10-05T08:00:00Z",
    });

    expect(next.data.scanned).toBe(1);
  });

  it("leaves the cache alone when the item is not in this PO", () => {
    const previous = progress([{ id: "a", scanned: false }], 0);

    const next = applyScannedItem(previous, { id: "zzz", scanned: true });

    expect(next.data.scanned).toBe(0);
    expect(next.data.items[0]).toMatchObject({ scanned: false });
  });

  it("returns the input untouched when there is nothing cached yet", () => {
    expect(applyScannedItem(undefined, { id: "a" })).toBeUndefined();
  });
});
