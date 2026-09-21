import { roundShippingKg, formatGrams, formatRupiah } from "./shipping-weight";

describe("roundShippingKg", () => {
  it("membulatkan turun kalau sisa di bawah 300 gram", () => {
    expect(roundShippingKg(1299)).toBe(1);
    expect(roundShippingKg(2001)).toBe(2);
  });

  it("membulatkan naik kalau sisa 300 gram atau lebih", () => {
    expect(roundShippingKg(1300)).toBe(2);
    expect(roundShippingKg(2300)).toBe(3);
  });

  it("memakai minimum 1 kg untuk pesanan tidak kosong", () => {
    expect(roundShippingKg(1)).toBe(1);
    expect(roundShippingKg(299)).toBe(1);
  });

  it("mengembalikan 0 untuk berat kosong", () => {
    expect(roundShippingKg(0)).toBe(0);
    expect(roundShippingKg(-1)).toBe(0);
    expect(roundShippingKg(NaN)).toBe(0);
  });

  it("cocok dengan contoh demo: 4x250 + 1x300 = 1300 g jadi 2 kg", () => {
    expect(roundShippingKg(4 * 250 + 1 * 300)).toBe(2);
  });
});

describe("format", () => {
  it("menulis gram dengan pemisah ribuan Indonesia", () => {
    expect(formatGrams(1300)).toBe("1.300 g");
  });

  it("menulis rupiah dengan pemisah ribuan Indonesia", () => {
    expect(formatRupiah(22000)).toBe("Rp22.000");
  });
});
