const getLocalDateKey = (date: Date) =>
  `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

export const getChatDateSeparator = (
  currentCreatedAt?: string,
  previousCreatedAt?: string,
  now = new Date(),
): string | null => {
  if (!currentCreatedAt) return null;

  const currentDate = new Date(currentCreatedAt);
  if (Number.isNaN(currentDate.getTime())) return null;

  if (previousCreatedAt) {
    const previousDate = new Date(previousCreatedAt);
    if (
      !Number.isNaN(previousDate.getTime())
      && getLocalDateKey(previousDate) === getLocalDateKey(currentDate)
    ) {
      return null;
    }
  }

  if (getLocalDateKey(currentDate) === getLocalDateKey(now)) {
    return "Hari ini";
  }

  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (getLocalDateKey(currentDate) === getLocalDateKey(yesterday)) {
    return "Kemarin";
  }

  return currentDate.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};
