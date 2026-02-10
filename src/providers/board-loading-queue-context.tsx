"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

/** Number of lists to load simultaneously per batch */
export const LIST_BATCH_SIZE = 5;

interface BoardLoadingQueueContextType {
  /** Called by page.tsx to set all list IDs in order (resets batch progress) */
  setAllListIds: (listIds: string[]) => void;
  /** The list IDs in the current active batch */
  activeBatchListIds: string[];
  /** Check if a list is in the current active batch */
  isListInActiveBatch: (listId: string) => boolean;
  /** Called by page.tsx after card stubs for a list have been fetched */
  reportListStubsLoaded: (listId: string) => void;
  /** Called by DraggableList when its card IDs change */
  updateListCards: (listId: string, cardIds: string[]) => void;
  /** Called by card to check if detail hooks should be enabled */
  isCardDetailEnabled: (listId: string, cardId: string) => boolean;
  /** Called by card when all its detail queries have settled */
  reportCardDetailsLoaded: (listId: string, cardId: string) => void;
}

const BoardLoadingQueueContext =
  createContext<BoardLoadingQueueContextType | undefined>(undefined);

export const BoardLoadingQueueProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  // All list IDs in display order
  const [allListIds, setAllListIdsState] = useState<string[]>([]);
  // Current batch index (0-based)
  const [batchIndex, setBatchIndex] = useState(0);
  // Lists whose card stubs have been fetched by page.tsx
  const stubsReadyRef = useRef(new Set<string>());
  // Per-list: ordered array of card IDs (set by DraggableList)
  const listCardIdsRef = useRef(new Map<string, string[]>());
  // Per-list: set of card IDs that reported details loaded
  const loadedCardsRef = useRef(new Map<string, Set<string>>());
  // Force re-render counter
  const [, setVersion] = useState(0);

  const forceUpdate = useCallback(() => setVersion((v) => v + 1), []);

  // ── Derived state ──────────────────────────────────────────────

  /** Current batch of list IDs */
  const activeBatchListIds = useMemo(() => {
    const start = batchIndex * LIST_BATCH_SIZE;
    return allListIds.slice(start, start + LIST_BATCH_SIZE);
  }, [batchIndex, allListIds]);

  const activeBatchSet = useMemo(
    () => new Set(activeBatchListIds),
    [activeBatchListIds]
  );

  /**
   * All list IDs that are enabled for detail loading.
   * This includes lists from completed batches (so infinite-scroll
   * cards in older lists still get details) PLUS the active batch.
   */
  const enabledListIds = useMemo(() => {
    const enabled = new Set<string>();
    const end = (batchIndex + 1) * LIST_BATCH_SIZE;
    for (let i = 0; i < Math.min(end, allListIds.length); i++) {
      enabled.add(allListIds[i]);
    }
    return enabled;
  }, [batchIndex, allListIds]);

  // ── Core logic ─────────────────────────────────────────────────

  const isListFullyLoaded = useCallback((listId: string) => {
    // Stubs must be ready first
    if (!stubsReadyRef.current.has(listId)) return false;
    // If DraggableList hasn't reported card IDs yet, not done
    const cardIds = listCardIdsRef.current.get(listId);
    if (cardIds === undefined) return false;
    // Empty list with stubs ready = done
    if (cardIds.length === 0) return true;
    // Check every card has reported details loaded
    const loaded = loadedCardsRef.current.get(listId);
    if (!loaded) return false;
    return cardIds.every((id) => loaded.has(id));
  }, []);

  const tryAdvanceBatch = useCallback(() => {
    setBatchIndex((prevIndex) => {
      const start = prevIndex * LIST_BATCH_SIZE;
      const currentBatch = allListIds.slice(start, start + LIST_BATCH_SIZE);
      if (currentBatch.length === 0) return prevIndex;

      const allDone = currentBatch.every((listId) =>
        isListFullyLoaded(listId)
      );
      if (!allDone) return prevIndex;

      // Only advance if there are more lists to process
      const nextIndex = prevIndex + 1;
      if (nextIndex * LIST_BATCH_SIZE >= allListIds.length) return prevIndex;

      console.log(
        `📦 [QUEUE] Batch ${prevIndex} complete → advancing to batch ${nextIndex}`
      );
      return nextIndex;
    });
  }, [allListIds, isListFullyLoaded]);

  // ── Public API ─────────────────────────────────────────────────

  const setAllListIds = useCallback(
    (listIds: string[]) => {
      setAllListIdsState(listIds);
      setBatchIndex(0);
      // Reset all tracking
      stubsReadyRef.current = new Set();
      listCardIdsRef.current = new Map();
      loadedCardsRef.current = new Map();
      forceUpdate();
    },
    [forceUpdate]
  );

  const isListInActiveBatch = useCallback(
    (listId: string) => activeBatchSet.has(listId),
    [activeBatchSet]
  );

  const reportListStubsLoaded = useCallback(
    (listId: string) => {
      stubsReadyRef.current.add(listId);
      forceUpdate();
      tryAdvanceBatch();
    },
    [forceUpdate, tryAdvanceBatch]
  );

  const updateListCards = useCallback(
    (listId: string, cardIds: string[]) => {
      const normalized = Array.from(new Set(cardIds));
      listCardIdsRef.current.set(listId, normalized);

      // Ensure loaded set exists
      let loadedSet = loadedCardsRef.current.get(listId);
      if (!loadedSet) {
        loadedSet = new Set<string>();
        loadedCardsRef.current.set(listId, loadedSet);
      }
      // Remove tracked cards no longer in the list
      for (const id of Array.from(loadedSet)) {
        if (!normalized.includes(id)) {
          loadedSet.delete(id);
        }
      }

      forceUpdate();
      tryAdvanceBatch();
    },
    [forceUpdate, tryAdvanceBatch]
  );

  const isCardDetailEnabled = useCallback(
    (listId: string, cardId: string) => {
      if (!listId || !cardId) return false;
      // Enabled if list is in any completed or active batch AND stubs are ready
      return enabledListIds.has(listId) && stubsReadyRef.current.has(listId);
    },
    [enabledListIds]
  );

  const reportCardDetailsLoaded = useCallback(
    (listId: string, cardId: string) => {
      if (!listId || !cardId) return;
      let loadedSet = loadedCardsRef.current.get(listId);
      if (!loadedSet) {
        loadedSet = new Set<string>();
        loadedCardsRef.current.set(listId, loadedSet);
      }
      const prevSize = loadedSet.size;
      loadedSet.add(cardId);
      if (loadedSet.size !== prevSize) {
        forceUpdate();
        tryAdvanceBatch();
      }
    },
    [forceUpdate, tryAdvanceBatch]
  );

  // ── Context value ──────────────────────────────────────────────

  const value = useMemo(
    () => ({
      setAllListIds,
      activeBatchListIds,
      isListInActiveBatch,
      reportListStubsLoaded,
      updateListCards,
      isCardDetailEnabled,
      reportCardDetailsLoaded,
    }),
    [
      setAllListIds,
      activeBatchListIds,
      isListInActiveBatch,
      reportListStubsLoaded,
      updateListCards,
      isCardDetailEnabled,
      reportCardDetailsLoaded,
    ]
  );

  return (
    <BoardLoadingQueueContext.Provider value={value}>
      {children}
    </BoardLoadingQueueContext.Provider>
  );
};

export const useBoardLoadingQueue = () => {
  const context = useContext(BoardLoadingQueueContext);
  if (!context) {
    throw new Error(
      "useBoardLoadingQueue must be used within a BoardLoadingQueueProvider"
    );
  }
  return context;
};
