const normalizeText = (value?: string | null) =>
  String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/**
 * Card di list "Finishing Bordir" atau "QC Bordir" sudah pasti melewati proses
 * bordir, jadi checkbox Bordir dianggap lolos otomatis tanpa perlu dicentang
 * manual di custom field.
 */
export const isCardListBordirEligible = (cardListName: string): boolean => {
  const normalized = normalizeText(cardListName);
  return (
    normalized.includes("finishing bordir") || normalized.includes("qc bordir")
  );
};
