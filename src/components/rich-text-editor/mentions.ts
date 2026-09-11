export type MentionUser = {
  id: string;
  username?: string;
  name?: string;
};

/**
 * Mobile keyboards shrink the visual viewport but leave documentElement at full
 * height, so quill-mention reads the covered area as free space and drops short
 * lists behind the keyboard. Measure against the visual viewport instead.
 */
export const mentionListTop = (
  anchor: { top: number; bottom: number },
  listHeight: number,
  viewport: { height: number; offsetTop: number }
) => {
  const visibleTop = viewport.offsetTop;
  const visibleBottom = viewport.offsetTop + viewport.height;

  if (anchor.bottom + listHeight <= visibleBottom) return anchor.bottom;
  if (anchor.top - listHeight >= visibleTop) return anchor.top - listHeight;

  return Math.max(visibleTop, visibleBottom - listHeight);
};

export const buildMentionSuggestions = (
  users: MentionUser[],
  searchTerm: string,
  includeWorkspaceAll: boolean
) => {
  const search = searchTerm.toLowerCase();
  const suggestions = users
    .map((user) => ({ id: user.id, value: user.name || user.username || "Unknown user" }))
    .filter((user) => !search || user.value.toLowerCase().includes(search));

  if (includeWorkspaceAll && (!search || "all".includes(search))) {
    return [{ id: "__workspace_all__", value: "all" }, ...suggestions];
  }

  return suggestions;
};
