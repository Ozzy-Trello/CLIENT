import { buildOrderLines, buildQuoteMessage } from "./shipping-quote-lines";

describe("buildOrderLines", () => {
  it("menulis satu nama untuk produk dengan beberapa varian", () => {
    expect(
      buildOrderLines([
        { productName: "Polo", variantName: "TPD", quantity: 4 },
        { productName: "Polo", variantName: "TPJ", quantity: 1 },
      ])
    ).toBe("Polo");
  });

  it("memisahkan produk berbeda dengan koma", () => {
    expect(
      buildOrderLines([
        { productName: "Polo", variantName: "TPD", quantity: 4 },
        { productName: "Rompi", variantName: "TPD", quantity: 2 },
      ])
    ).toBe("Polo, Rompi");
  });

  it("menjaga urutan produk sesuai urutan item", () => {
    expect(
      buildOrderLines([
        { productName: "Rompi", variantName: "TPD", quantity: 1 },
        { productName: "Polo", variantName: "TPD", quantity: 1 },
      ])
    ).toBe("Rompi, Polo");
  });

  it("tidak mengulang produk yang variannya tidak berurutan", () => {
    expect(
      buildOrderLines([
        { productName: "Polo", variantName: "TPD", quantity: 1 },
        { productName: "Rompi", variantName: "TPD", quantity: 2 },
        { productName: "Polo", variantName: "TPJ", quantity: 3 },
      ])
    ).toBe("Polo, Rompi");
  });

  it("mengembalikan teks kosong kalau tidak ada item", () => {
    expect(buildOrderLines([])).toBe("");
  });
});

describe("buildQuoteMessage", () => {
  it("menghasilkan pesan persis seperti contoh yang disepakati", () => {
    const message = buildQuoteMessage({
      originName: "Ozzy Clothing Warungboto",
      destinationLabel: "KEDATON, KEDATON, BANDAR LAMPUNG, LAMPUNG, 35141",
      items: [{ productName: "Polo", variantName: "TPD", quantity: 12 }],
      totalPieces: 12,
      billedWeightKg: 2,
      rates: [
        { courierName: "Lion Parcel", service: "BIGPACK", cost: 32000, etd: "2-4 day" },
        { courierName: "POS Indonesia (POS)", service: "POS KARGO", cost: 48500, etd: "7-14 day" },
        { courierName: "Jalur Nugraha Ekakurir (JNE)", service: "JTR", cost: 55000, etd: "3 day" },
        { courierName: "SiCepat Express", service: "GOKIL", cost: 60000, etd: "5-7 day" },
        { courierName: "Jalur Nugraha Ekakurir (JNE)", service: "REG", cost: 64000, etd: "2 day" },
        { courierName: "POS Indonesia (POS)", service: "Pos Reguler", cost: 64000, etd: "2 day" },
        { courierName: "Shopee Express", service: "SPX Standard", cost: 66000, etd: null },
        { courierName: "Lion Parcel", service: "REGPACK", cost: 68480, etd: "2-3 day" },
      ],
    });

    expect(message).toBe(
      [
        "Berikut estimasi ongkir pesanannya",
        "Dari: Ozzy Clothing Warungboto",
        "Ke: Kedaton, Bandar Lampung 35141.",
        "",
        "Produk: Polo",
        "Total Pesanan: 12pcs",
        "Estimasi berat: 2 kg",
        "",
        "1. Lion Parcel BIGPACK — Rp32.000",
        "   Estimasi 2-4 day",
        "2. POS Indonesia (POS) POS KARGO — Rp48.500",
        "   Estimasi 7-14 day",
        "3. Jalur Nugraha Ekakurir (JNE) JTR — Rp55.000",
        "   Estimasi 3 day",
        "4. SiCepat Express GOKIL — Rp60.000",
        "   Estimasi 5-7 day",
        "5. Jalur Nugraha Ekakurir (JNE) REG — Rp64.000",
        "   Estimasi 2 day",
        "6. POS Indonesia (POS) Pos Reguler — Rp64.000",
        "   Estimasi 2 day",
        "7. Shopee Express SPX Standard — Rp66.000",
        "   Estimasi -",
        "8. Lion Parcel REGPACK — Rp68.480",
        "   Estimasi 2-3 day",
        "",
        "• Ongkir hanya estimasi awal.",
        "• Estimasi waktu pengiriman dihitung setelah paket diserahkan ke ekspedisi",
        "• Tarif akhir akan menyesuaikan hasil timbang serta ketentuan ekspedisi.",
        "",
        "Kakak mau pilih pengiriman yang mana?",
      ].join("\n")
    );
  });

  it("menyebut semua produk saat pesanan campuran", () => {
    const message = buildQuoteMessage({
      originName: "Ozzy Clothing Solo",
      destinationLabel: "GROGOL, GROGOL, SUKOHARJO, JAWA TENGAH, 57552",
      items: [
        { productName: "Polo", variantName: "TPD", quantity: 4 },
        { productName: "Polo", variantName: "TPJ", quantity: 1 },
        { productName: "Rompi", variantName: "TPD", quantity: 2 },
      ],
      totalPieces: 7,
      billedWeightKg: 2,
      rates: [
        { courierName: "JNE", service: "REG", cost: 12000, etd: "1 day" },
      ],
    });

    expect(message).toContain("Produk: Polo, Rompi");
    expect(message).toContain("Total Pesanan: 7pcs");
    expect(message).toContain("Ke: Grogol, Sukoharjo 57552.");
  });
});
