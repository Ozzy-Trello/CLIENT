export type MentionUser = {
  id: string;
  username?: string;
  name?: string;
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
