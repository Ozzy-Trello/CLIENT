# Goal
Implement truly instant card drag-and-drop without any visual flash or rubber-banding by using local React state (like checklist), matching the smoothness of the official react-beautiful-dnd demo.

# Context
The current card drag-and-drop has a brief flash/delay when dropping cards, even with optimistic React Query cache updates and `flushSync`. This is because:

**Current Approach (Has Flash):**
- Uses React Query cache for card positions
- Cache updates → notify subscribers → re-render = ~50-100ms delay
- Even with `flushSync` and synchronous cache updates in `onDragEnd`, there's a notification delay

**Checklist Approach (Instant - "Smooth as Butter"):**
- Uses `useState` for local state (lines 387-432 in `checklist-field/index.tsx`)
- Updates state synchronously in `onDragEnd` BEFORE function returns
- API call fires in background after state update
- Zero delay because React state updates are truly synchronous

**Stack Overflow Evidence:**
- https://stackoverflow.com/questions/72822413/react-beautiful-dnd-delay-when-dropping
- Solution: "Update your state by hand before calling Firebase"
- Comment: "This is exactly what I did and it's as smooth as butter now"

**Official Demo:**
- https://react-beautiful-dnd.netlify.app/?path=/story/board--simple
- Uses pure `useState` with synchronous updates in `onDragEnd`

Tech Stack:
- Frontend: Next.js 14, React 18, @hello-pangea/dnd v16.6.1, TanStack React Query v5
- Card pagination via `useCardsPaginated` hook (10 cards per page, infinite scroll)
- Backend: Node.js, TypeScript, REST API for mutations, WebSocket for real-time sync

# Constraints
- **Backward compatibility:** WebSocket real-time updates must continue working for multi-user collaboration
- **Pagination:** Must maintain infinite scroll functionality with lazy loading
- **Performance:** Local state should not cause memory issues with large boards (100+ cards)
- **React Query:** Keep React Query for initial data fetching and background sync
- **Error handling:** Failed mutations must rollback local state to previous positions
- **Files that MUST NOT be modified:**
  - Backend API endpoints (no backend changes)
  - WebSocket infrastructure (keep existing real-time sync)
  - Drag library configuration (keep @hello-pangea/dnd as-is)

# Assumptions
- Local state is the source of truth for visual card positions during active user session
- React Query cache serves as backup/sync mechanism for other users' changes
- WebSocket events update local state (not just cache) for real-time collaboration
- On page load/refresh, initialize local state from React Query cache
- Mutation success = local state stays; mutation failure = rollback to previous local state
- Pagination continues loading from API, new cards merge into local state

# Files to Modify
| File Path | Action | Description |
|-----------|--------|-------------|
| `src/app/workspace/[workspaceId]/board/[boardId]/page.tsx` | MODIFY | Add local state for all cards across all lists, initialize from React Query |
| `src/app/workspace/[workspaceId]/board/[boardId]/draggable-list/index.tsx` | MODIFY | Accept cards from props instead of `useCardsPaginated`, manage pagination differently |
| `src/hooks/card.tsx` | MODIFY | Modify `useCardMove` to not update cache in onMutate (parent handles local state) |
| `src/hooks/websocket.tsx` | MODIFY | Update WebSocket handlers to update local state instead of just cache |
| `docs/drag-drop-refactor.md` | CREATE | Document the new architecture and rollback instructions |

# Step-by-Step Plan

## Phase 1: Create Local State Infrastructure in Board Page

- [ ] **Step 1.1:** Add local state declarations at top of Board component
  - File: `src/app/workspace/[workspaceId]/board/[boardId]/page.tsx`
  - Action: MODIFY
  - Line: After line 481 (after `currentDragState` ref declaration)
  - Details: Add the following state declarations exactly:
    ```typescript
    // Local state for instant drag-and-drop (like checklist)
    // This is the source of truth for card positions in the UI
    const [localCards, setLocalCards] = useState<Record<string, Card[]>>({});
    const [localCardsInitialized, setLocalCardsInitialized] = useState(false);
    const [cardsPagination, setCardsPagination] = useState<Record<string, {
      currentPage: number;
      hasMore: boolean;
      totalCards: number;
    }>>({});
    ```

- [ ] **Step 1.2:** Initialize local state from React Query cache on mount
  - File: `src/app/workspace/[workspaceId]/board/[boardId]/page.tsx`
  - Action: MODIFY
  - Line: After state declarations (around line 490)
  - Details: Add effect to initialize local state from all list queries:
    ```typescript
    // Initialize local cards from React Query cache on mount
    useEffect(() => {
      if (!lists || lists.length === 0) return;

      const initialCards: Record<string, Card[]> = {};
      const initialPagination: Record<string, any> = {};

      lists.forEach((list) => {
        const cachedCards = queryClient.getQueryData<ApiResponse<Card[]>>(
          queryKeys.cards.list(list.id)
        );

        if (cachedCards?.data) {
          initialCards[list.id] = cachedCards.data;
          initialPagination[list.id] = {
            currentPage: 1,
            hasMore: cachedCards.data.length >= 10,
            totalCards: cachedCards.paginate?.totalData || cachedCards.data.length,
          };
        } else {
          initialCards[list.id] = [];
          initialPagination[list.id] = {
            currentPage: 1,
            hasMore: false,
            totalCards: 0,
          };
        }
      });

      setLocalCards(initialCards);
      setCardsPagination(initialPagination);
      setLocalCardsInitialized(true);
    }, [lists, queryClient]);
    ```

- [ ] **Step 1.3:** Create helper function to move card between lists
  - File: `src/app/workspace/[workspaceId]/board/[boardId]/page.tsx`
  - Action: MODIFY
  - Line: Before `handleCardDragEnd` function (around line 680)
  - Details: Add helper function exactly:
    ```typescript
    // Helper to move card between lists (like checklist reorder)
    const moveCardBetweenLists = useCallback((
      sourceListId: string,
      destListId: string,
      sourceIndex: number,
      destIndex: number,
      cardId: string
    ): Record<string, Card[]> => {
      const newLocalCards = { ...localCards };

      // Find card to move
      const sourceCards = [...(newLocalCards[sourceListId] || [])];
      const [movedCard] = sourceCards.splice(sourceIndex, 1);

      if (!movedCard) return newLocalCards;

      // Update card's listId
      const updatedCard = { ...movedCard, listId: destListId };

      // Add to destination
      const destCards = [...(newLocalCards[destListId] || [])];
      destCards.splice(destIndex, 0, updatedCard);

      // Update state
      newLocalCards[sourceListId] = sourceCards;
      newLocalCards[destListId] = destCards;

      return newLocalCards;
    }, [localCards]);
    ```

- [ ] **Step 1.4:** Refactor handleCardDragEnd to update local state synchronously
  - File: `src/app/workspace/[workspaceId]/board/[boardId]/page.tsx`
  - Action: MODIFY
  - Line: Replace entire `handleCardDragEnd` function (starts around line 710)
  - Details: Replace the ENTIRE function with:
    ```typescript
    const handleCardDragEnd = (
      sourceList: string,
      sourceIndex: number,
      destList: string,
      destIndex: number,
      cardId: string
    ): void => {
      const sourceListId = sourceList?.replaceAll("droppable-card-area-", "");
      const destListId = destList?.replaceAll("droppable-card-area-", "");

      const originalPosition = currentDragState.current?.originalPosition;
      const originalListId = currentDragState.current?.originalListId;
      const originalCard = currentDragState.current?.originalCard;

      const actualMove =
        currentDragState.current &&
        originalPosition !== undefined &&
        originalListId &&
        (destListId !== originalListId ||
          (destListId === originalListId && destIndex !== originalPosition));

      console.log('🎯 [DRAG END] Drag ended', {
        cardId,
        from: originalListId,
        to: destListId,
        actualMove,
      });

      (window as any).__DRAG_IN_PROGRESS__ = true;
      currentDragState.current = null;

      if (actualMove && originalCard && originalListId) {
        console.log('🚀 [DRAG END] Updating LOCAL STATE synchronously');

        // Store previous state for rollback
        const previousLocalCards = { ...localCards };

        // Update local state SYNCHRONOUSLY (instant!)
        const newLocalCards = moveCardBetweenLists(
          originalListId,
          destListId,
          originalPosition,
          destIndex,
          cardId
        );
        setLocalCards(newLocalCards);

        console.log('✅ [DRAG END] Local state updated - INSTANT!');

        // Fire mutation in background
        console.log('🔄 [DRAG END] Firing mutation for persistence');
        moveCard(
          {
            cardId: cardId,
            previousListId: originalListId,
            targetListId: destListId,
            previousPosition: originalPosition,
            targetPosition: destIndex,
          },
          {
            onError: () => {
              console.error('❌ [DRAG END] Mutation failed - rolling back');
              setLocalCards(previousLocalCards);
            },
            onSettled: () => {
              console.log('✅ [DRAG END] Mutation settled');
              (window as any).__DRAG_IN_PROGRESS__ = false;
              document.body.classList.remove("dragging");
            },
          }
        );
      } else {
        (window as any).__DRAG_IN_PROGRESS__ = false;
        document.body.classList.remove("dragging");
      }
    };
    ```

## Phase 2: Update List Component to Use Props

- [ ] **Step 2.1:** Modify DraggableList interface to accept cards from props
  - File: `src/app/workspace/[workspaceId]/board/[boardId]/draggable-list/index.tsx`
  - Action: MODIFY
  - Line: Line 21 (interface DraggableListProps)
  - Details: Add new props to interface:
    ```typescript
    interface DraggableListProps {
      list: AnyList;
      index: number;
      boardId: string;
      updateList: UseMutateFunction<any, Error, { listId: string; updates: Partial<AnyList> }, unknown>;
      deleteList: UseMutateFunction<any, Error, { listId: string }, unknown>;
      collapsed?: boolean;
      onToggleCollapse?: (listId: string) => void;
      selectedLabelIds?: string[];
      // NEW PROPS:
      cards: Card[];
      hasMoreCards: boolean;
      isLoadingMore: boolean;
      onLoadMore: () => void;
      totalCards: number;
    }
    ```

- [ ] **Step 2.2:** Remove useCardsPaginated hook from component
  - File: `src/app/workspace/[workspaceId]/board/[boardId]/draggable-list/index.tsx`
  - Action: MODIFY
  - Line: Delete lines 66-82
  - Details: Delete this entire block:
    ```typescript
    // DELETE THIS:
    const {
      cards,
      addCard,
      isLoading,
      isError,
      hasMoreCards,
      isLoadingMore,
      loadMoreCards,
      loadMoreError,
      retryLoadMore,
      totalCards,
      isAddingCard,
    } = useCardsPaginated(list.id, boardId, {
      labelIds: selectedLabelIds.length > 0 ? selectedLabelIds : undefined,
      sortBy: activeSortOption.sortBy,
      sortOrder: activeSortOption.sortOrder,
    });
    ```

- [ ] **Step 2.3:** Destructure new props in component
  - File: `src/app/workspace/[workspaceId]/board/[boardId]/draggable-list/index.tsx`
  - Action: MODIFY
  - Line: Line 37 (component function declaration)
  - Details: Update to destructure new props:
    ```typescript
    const DraggableList: React.FC<DraggableListProps> = ({
      list,
      index,
      boardId,
      updateList,
      deleteList,
      collapsed = false,
      onToggleCollapse,
      selectedLabelIds = [],
      // NEW:
      cards,
      hasMoreCards,
      isLoadingMore,
      onLoadMore,
      totalCards,
    }) => {
    ```

- [ ] **Step 2.4:** Update infinite scroll observer
  - File: `src/app/workspace/[workspaceId]/board/[boardId]/draggable-list/index.tsx`
  - Action: MODIFY
  - Line: Replace useEffect at lines 88-108
  - Details: Replace with:
    ```typescript
    useEffect(() => {
      const el = loadMoreRef.current;
      if (!el || isLoadingMore || !hasMoreCards) return;

      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            onLoadMore();
          }
        },
        {
          root: null,
          rootMargin: "100px",
          threshold: 0.1,
        }
      );

      observer.observe(el);
      return () => observer.disconnect();
    }, [isLoadingMore, hasMoreCards, onLoadMore]);
    ```

## Phase 3: Implement Load More in Board Page

- [ ] **Step 3.1:** Import cards API function
  - File: `src/app/workspace/[workspaceId]/board/[boardId]/page.tsx`
  - Action: MODIFY
  - Line: At top imports section
  - Details: Add import:
    ```typescript
    import { cards } from "@api/card";
    ```

- [ ] **Step 3.2:** Create loadMoreCards function
  - File: `src/app/workspace/[workspaceId]/board/[boardId]/page.tsx`
  - Action: MODIFY
  - Line: After helper functions (around line 770)
  - Details: Add function:
    ```typescript
    const loadMoreCards = useCallback(async (listId: string) => {
      const pagination = cardsPagination[listId];
      if (!pagination || !pagination.hasMore) return;

      const nextPage = pagination.currentPage + 1;

      try {
        const response = await cards(
          listId,
          resolvedBoardId,
          nextPage,
          10,
          selectedLabelIds.length > 0 ? selectedLabelIds : undefined,
          undefined,
          undefined
        );

        if (response.data && response.data.length > 0) {
          setLocalCards((prev) => ({
            ...prev,
            [listId]: [...(prev[listId] || []), ...response.data],
          }));

          setCardsPagination((prev) => ({
            ...prev,
            [listId]: {
              currentPage: nextPage,
              hasMore: response.data.length >= 10,
              totalCards: response.paginate?.totalData || prev[listId].totalCards,
            },
          }));
        } else {
          setCardsPagination((prev) => ({
            ...prev,
            [listId]: { ...prev[listId], hasMore: false },
          }));
        }
      } catch (error) {
        console.error('[LOAD MORE] Error:', error);
      }
    }, [cardsPagination, resolvedBoardId, selectedLabelIds]);
    ```

- [ ] **Step 3.3:** Pass cards and callbacks to List components
  - File: `src/app/workspace/[workspaceId]/board/[boardId]/page.tsx`
  - Action: MODIFY
  - Line: Find where List components render (around line 152)
  - Details: Replace the map with:
    ```typescript
    {lists?.map((list: AnyList, index: number) => {
      const listCards = localCards[list.id] || [];
      const pagination = cardsPagination[list.id] || {
        currentPage: 1,
        hasMore: false,
        totalCards: 0,
      };

      return (
        <List
          key={list.id}
          list={list}
          index={index}
          boardId={resolvedBoardId}
          updateList={updateList}
          deleteList={deleteList}
          collapsed={!!collapsedLists[list.id]}
          onToggleCollapse={onToggleCollapse}
          selectedLabelIds={selectedLabelIds}
          cards={listCards}
          hasMoreCards={pagination.hasMore}
          isLoadingMore={false}
          onLoadMore={() => loadMoreCards(list.id)}
          totalCards={pagination.totalCards}
        />
      );
    })}
    ```

## Phase 4: Simplify useCardMove Hook

- [ ] **Step 4.1:** Remove cache updates from onMutate
  - File: `src/hooks/card.tsx`
  - Action: MODIFY
  - Line: Find useCardMove hook's onMutate (around line 765)
  - Details: Replace onMutate with:
    ```typescript
    onMutate: ({ cardId, previousListId, targetListId }) => {
      console.log('🔄 [CARD MOVE] onMutate - state updated by parent');

      queryClient.cancelQueries({
        queryKey: queryKeys.cards.list(previousListId),
      });
      queryClient.cancelQueries({
        queryKey: queryKeys.cards.list(targetListId),
      });

      return {};
    },
    ```

- [ ] **Step 4.2:** Simplify onSuccess
  - File: `src/hooks/card.tsx`
  - Action: MODIFY
  - Line: Find onSuccess in useCardMove
  - Details: Replace with:
    ```typescript
    onSuccess: (data, variables) => {
      console.log('✅ [CARD MOVE] Success - local state stays');
    },
    ```

## Phase 5: Testing

- [ ] **Step 5.1:** Test instant drag with no flash
  - Action: Manual test
  - Details: Drag card between lists. Expected: INSTANT movement, ZERO flash

- [ ] **Step 5.2:** Test error rollback
  - Action: Manual test (simulate backend error)
  - Details: Card should revert to original position on error

- [ ] **Step 5.3:** Test pagination
  - Action: Manual test
  - Details: Scroll to load more cards, drag a card from page 2

- [ ] **Step 5.4:** Test on slow network
  - Action: DevTools → Network → Slow 3G
  - Details: Card should still move instantly despite slow API

# Acceptance Criteria
- [ ] Zero visual flash on drag-and-drop
- [ ] Smoothness matches checklist exactly
- [ ] Mutation errors rollback correctly
- [ ] Pagination works (loads more cards)
- [ ] Build succeeds: `npm run dev`
- [ ] Console shows "INSTANT!" message
- [ ] Works on slow network (Slow 3G test)

# Non-Goals
- WebSocket integration (Phase 4 - separate task)
- Offline support
- Backend changes

# Rollback Plan
```bash
git checkout HEAD~1 -- src/app/workspace/[workspaceId]/board/[boardId]/page.tsx
git checkout HEAD~1 -- src/app/workspace/[workspaceId]/board/[boardId]/draggable-list/index.tsx
git checkout HEAD~1 -- src/hooks/card.tsx
```
