import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { batchCardCount } from "@api/card";
import { Card, EnumCardType } from "@myTypes/card";
import {
  getDashcardConfigSignature,
  getDashcardCountQueryKey,
} from "@hooks/dashcard";

/**
 * Board-level hook that prefetches ALL dashcard counts in a single batch request.
 *
 * Problem: Individual dashcard components mount at different times due to
 * IntersectionObserver-based lazy rendering of lists. This causes multiple
 * batch requests that resolve at different times, making counts appear to
 * "pop in" list-by-list in random order.
 *
 * Solution: This hook runs at the board level as soon as cards are loaded.
 * It identifies every dashcard on the board, fetches all counts in ONE request,
 * and pre-populates the React Query cache. When individual Dashcard components
 * mount later, they find cached data instantly — all counts appear at once.
 */
export const usePrefetchDashcardCounts = (
  localCards: Record<string, Card[]>,
  workspaceId: string,
  enabled: boolean = true
) => {
  const queryClient = useQueryClient();
  // Track which IDs we've already prefetched to avoid duplicate requests
  const fetchedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled || !workspaceId) return;

    // Collect all dashcard IDs across all lists
    const dashcardIds: string[] = [];
    Object.values(localCards).forEach((cards) => {
      cards.forEach((card) => {
        if (
          card.type === EnumCardType.Dashcard &&
          !fetchedIdsRef.current.has(card.id)
        ) {
          dashcardIds.push(card.id);
        }
      });
    });

    if (dashcardIds.length === 0) return;

    // Mark as fetched immediately to prevent duplicate requests
    dashcardIds.forEach((id) => fetchedIdsRef.current.add(id));

    // Single batch request for ALL dashcard counts on the board
    batchCardCount(dashcardIds, workspaceId)
      .then((countMap) => {
        // Pre-populate React Query cache for each dashcard.
        // Uses the same query key ["dashcardCount", id] as useDashcardCount,
        // so when the individual hook mounts it finds cached data instantly.
        const dashcardById = new Map<string, Card>();
        Object.values(localCards).forEach((cards) => {
          cards.forEach((card) => {
            if (card.type === EnumCardType.Dashcard) dashcardById.set(card.id, card);
          });
        });

        Object.entries(countMap).forEach(([id, count]) => {
          const dashcard = dashcardById.get(id);
          queryClient.setQueryData(
            getDashcardCountQueryKey(
              workspaceId,
              id,
              getDashcardConfigSignature(dashcard?.dashConfig)
            ),
            count
          );
        });
      })
      .catch(() => {
        // On failure, remove from fetched set so individual hooks can retry
        dashcardIds.forEach((id) => fetchedIdsRef.current.delete(id));
      });
  }, [localCards, workspaceId, enabled, queryClient]);
};
