export const CARD_DESCRIPTION_PLACEHOLDER = "[has_content]";

export const isCardDescriptionPlaceholder = (description?: string) =>
  description === CARD_DESCRIPTION_PLACEHOLDER;

export const mergeCardDescription = (
  existing?: string,
  incoming?: string
): string | undefined =>
  incoming === undefined || incoming === "" || isCardDescriptionPlaceholder(incoming)
    ? existing
    : incoming;

export const mergeCardListDescriptions = <T extends { id: string; description?: string }>(
  existing: T[] = [],
  incoming: T[] = []
): T[] =>
  incoming.map((card) => {
    const previous = existing.find((item) => item.id === card.id);
    return previous
      ? { ...card, description: mergeCardDescription(previous.description, card.description) }
      : card;
  });
