# Drag & Drop Refactor (Local State)

## Overview
This refactor makes card drag-and-drop feel instant by rendering from local React state instead of waiting for React Query cache notifications. React Query remains the source for initial fetches and background sync, while local state becomes the UI source of truth during a session.

## Data Flow
- Initial load fetches page 1 for each list, stores results in `localCards`, and seeds React Query cache.
- Drag end updates `localCards` synchronously, then triggers the move mutation.
- Mutation errors roll back `localCards` to the previous snapshot.
- Pagination uses the cards API and appends results into `localCards`.
- Add card uses a local optimistic insert, then replaces the temp card on success.

## Key State
- `localCards`: `Record<listId, Card[]>` for render order.
- `cardsPagination`: `currentPage`, `hasMore`, `totalCards` per list.
- `loadingMoreByListId`: guards concurrent load-more requests.
- `addingCardByListId`: drives per-list add-card loading UI.

## Drag End Sequence
1. Capture original card state on drag start.
2. On drag end, update `localCards` synchronously.
3. Fire the `moveCard` mutation in the background.
4. Roll back on error using the saved snapshot.

## Pagination
- `loadMoreCards(listId)` requests the next page and appends into `localCards`.
- `totalCards` and `hasMore` update from the API response.

## Notes
- WebSocket-driven updates still land in React Query cache and are not yet mirrored into local state.

## Rollback
To revert this refactor:

```bash
git checkout HEAD~1 -- src/app/workspace/[workspaceId]/board/[boardId]/page.tsx
git checkout HEAD~1 -- src/app/workspace/[workspaceId]/board/[boardId]/draggable-list/index.tsx
git checkout HEAD~1 -- src/hooks/card.tsx
```
