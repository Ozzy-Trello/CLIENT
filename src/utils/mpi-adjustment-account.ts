type AdjustmentAccount = {
  name?: string | null;
  [key: string]: unknown;
};

const MPI_CATEGORY_ACCOUNT_MAPPINGS = new Map<string, string>([
  ["benang", "HPP Benang"],
  ["perlengkapanproduksi", "Beban Perlengkapan"],
  ["labelsize", "HPP Label"],
  ["hangtag", "HPP Hang Tag"],
]);

const normalize = (value: unknown): string =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]/g, "");

export const getItemCategoryName = (item: any): string =>
  String(
    item?.itemCategory?.name ??
      item?.item_category?.name ??
      item?.categoryName ??
      item?.category_name ??
      "",
  ).trim();

export const getMpiAdjustmentAccountName = (
  item: any,
  source?: string | null,
): string | null => {
  if (normalize(source) !== "mpi") return null;
  return MPI_CATEGORY_ACCOUNT_MAPPINGS.get(normalize(getItemCategoryName(item))) ?? null;
};

export const findAdjustmentAccountByName = <T extends AdjustmentAccount>(
  accounts: T[],
  accountName: string,
): T | undefined => {
  const target = normalize(accountName);
  return accounts.find((account) => normalize(account.name) === target);
};

export const resolveMpiAdjustmentAccount = <T extends AdjustmentAccount>(
  item: any,
  source: string | null | undefined,
  accounts: T[],
): T | undefined => {
  const accountName = getMpiAdjustmentAccountName(item, source);
  return accountName
    ? findAdjustmentAccountByName(accounts, accountName)
    : undefined;
};
