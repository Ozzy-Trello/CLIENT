import { resolveCardIdFromScan } from "./resolve-card-scan";

const CARD_ID = "86c2b2fd-a9e1-47b1-aa2e-c0b77df7e9f5";

describe("resolveCardIdFromScan", () => {
  const lookup = jest.fn(async (shortId: string) =>
    shortId === "44237" ? CARD_ID : null,
  );

  beforeEach(() => jest.clearAllMocks());

  it("mengambil card id dari URL QR numerik", async () => {
    const result = await resolveCardIdFromScan(
      "https://production.ozzyclothing.co.id/qr/44237",
      lookup,
    );

    expect(lookup).toHaveBeenCalledWith("44237");
    expect(result).toBe(CARD_ID);
  });

  // Kapitalisasi/HTTPS:// pernah membuat parsing URL gagal sehingga URL mentah
  // terkirim sebagai card id ke backend.
  it("tetap mengenali URL dengan skema huruf besar", async () => {
    const result = await resolveCardIdFromScan(
      "Https://production.ozzyclothing.co.id/qr/44237",
      lookup,
    );

    expect(result).toBe(CARD_ID);
  });

  it("tetap mengenali URL yang terkirim ganda oleh scanner", async () => {
    const url = "https://production.ozzyclothing.co.id/qr/44237";
    const result = await resolveCardIdFromScan(url + url, lookup);

    expect(result).toBe(CARD_ID);
  });

  it("menerima short id angka tanpa URL", async () => {
    const result = await resolveCardIdFromScan("44237", lookup);

    expect(lookup).toHaveBeenCalledWith("44237");
    expect(result).toBe(CARD_ID);
  });

  it("menerima Card ID mentah tanpa memanggil lookup", async () => {
    const result = await resolveCardIdFromScan(CARD_ID, lookup);

    expect(lookup).not.toHaveBeenCalled();
    expect(result).toBe(CARD_ID);
  });

  // Inilah yang membuat user melihat "PO tidak ditemukan": teks tak ter_resolve
  // sempat diteruskan sebagai card id, dan route backend tidak bisa
  // mencocokkannya sehingga membalas 200 + HTML.
  it("tidak meneruskan teks tak ter_resolve sebagai card id", async () => {
    const inputs = [
      "MIO SPORTY 2",
      "https://production.ozzyclothing.co.id/qr/99999",
      "http://",
      "   ",
    ];

    for (const input of inputs) {
      await expect(resolveCardIdFromScan(input, lookup)).resolves.toBeNull();
    }
  });

  it("mengembalikan null saat short id tidak ditemukan", async () => {
    await expect(
      resolveCardIdFromScan("https://production.ozzyclothing.co.id/qr/44568", lookup),
    ).resolves.toBeNull();
  });
});