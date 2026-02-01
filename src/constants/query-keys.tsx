export const queryKeys = {
  workspaces: {
    all: ['workspaces'] as const,
    detail: (workspaceId: string) => [...queryKeys.workspaces.all, workspaceId] as const,
  },
  
  boards: {
    all: ['boards'] as const,
    workspace: (workspaceId: string) => [...queryKeys.boards.all, 'workspace', workspaceId] as const,
    detail: (boardId: string) => [...queryKeys.boards.all, boardId] as const,
    withLists: (boardId: string) => [...queryKeys.boards.detail(boardId), 'with-lists'] as const,
  },
  
  lists: {
    all: ['lists'] as const,
    board: (boardId: string) => [...queryKeys.lists.all, 'board', boardId] as const,
    detail: (listId: string) => [...queryKeys.lists.all, listId] as const,
    withCards: (listId: string) => [...queryKeys.lists.detail(listId), 'with-cards'] as const,
  },
  
  cards: {
    all: ['cards'] as const,
    list: (listId: string) => [...queryKeys.cards.all, 'list', listId] as const,
    detail: (cardId: string) => [...queryKeys.cards.all, cardId] as const,
    labels: (cardId: string) => [...queryKeys.cards.detail(cardId), 'labels'] as const,
    comments: (cardId: string) => [...queryKeys.cards.detail(cardId), 'comments'] as const,
    attachments: (cardId: string) => [...queryKeys.cards.detail(cardId), 'attachments'] as const,
    // For archived cards
    archived: () => [...queryKeys.cards.all, 'archived'] as const,
  },
} as const;