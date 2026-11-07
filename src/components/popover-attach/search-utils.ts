export function rankCardSearchResults<T extends { name: string }>(cards: T[], query: string): T[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const rank = (name: string) => {
    const normalizedName = name.toLocaleLowerCase();
    if (normalizedName === normalizedQuery) return 0;
    if (normalizedName.startsWith(normalizedQuery)) return 1;
    return 2;
  };

  return [...cards].sort((left, right) =>
    rank(left.name) - rank(right.name) || left.name.localeCompare(right.name),
  );
}
