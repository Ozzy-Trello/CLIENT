import { shortDestinationLabel } from "./shipping-destination";

describe("shortDestinationLabel", () => {
  it("menyisakan kelurahan, kota, dan kode pos", () => {
    expect(
      shortDestinationLabel("KEDATON, KEDATON, BANDAR LAMPUNG, LAMPUNG, 35141")
    ).toBe("Kedaton, Bandar Lampung 35141");
  });

  it("membuang kecamatan yang berbeda dari kelurahan", () => {
    expect(
      shortDestinationLabel(
        "GROGOL, GROGOL PETAMBURAN, JAKARTA BARAT, DKI JAKARTA, 11450"
      )
    ).toBe("Grogol, Jakarta Barat 11450");
  });

  it("merapikan huruf kapital pada nama berkata banyak", () => {
    expect(
      shortDestinationLabel(
        "MAKAMHAJI, KARTASURA, SUKOHARJO, JAWA TENGAH, 57161"
      )
    ).toBe("Makamhaji, Sukoharjo 57161");
  });

  // Label yang tidak lengkap lebih baik ditampilkan apa adanya daripada
  // dipotong jadi alamat yang salah.
  it("mengembalikan label apa adanya kalau bagiannya kurang", () => {
    expect(shortDestinationLabel("KEDATON, BANDAR LAMPUNG")).toBe(
      "KEDATON, BANDAR LAMPUNG"
    );
  });

  it("aman untuk teks kosong", () => {
    expect(shortDestinationLabel("")).toBe("");
  });
});
