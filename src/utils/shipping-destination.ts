const toTitleCase = (value: string): string =>
  value
    .toLowerCase()
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());

/**
 * RajaOngkir mengirim label lengkap berhuruf kapital semua, misalnya
 * "KEDATON, KEDATON, BANDAR LAMPUNG, LAMPUNG, 35141". Konsumen cukup melihat
 * kelurahan, kota, dan kode pos, jadi kecamatan dan provinsi dibuang.
 */
export function shortDestinationLabel(label: string): string {
  const parts = label
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length < 5) return label.trim();

  const subdistrict = toTitleCase(parts[0]);
  const city = toTitleCase(parts[2]);
  const zip = parts[4];
  return `${subdistrict}, ${city} ${zip}`;
}
