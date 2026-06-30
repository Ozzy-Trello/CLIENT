import { useQuery, useQueryClient } from "@tanstack/react-query";
import { batchCardCount } from "@api/card";
import { useParams } from "next/navigation";

/**
 * DataLoader-style batcher: collects dashcard IDs over a short window
 * then fires a single batch request for all of them.
 *
 * This prevents N dashcards on a board from making N individual HTTP requests.
 */
const BATCH_DELAY_MS = 200;
const MAX_BATCH_SIZE = 50;

type PendingEntry = {
  resolve: (count: number) => void;
  reject: (err: unknown) => void;
};

const pendingBatches = new Map<
  string, // workspaceId
  { timer: ReturnType<typeof setTimeout>; entries: Map<string, PendingEntry[]> }
>();

function scheduleBatchFetch(
  dashcardId: string,
  workspaceId: string
): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    let batch = pendingBatches.get(workspaceId);

    if (!batch) {
      batch = { timer: null as any, entries: new Map() };
      pendingBatches.set(workspaceId, batch);
    }

    // Add this ID to the pending entries
    const existing = batch.entries.get(dashcardId) || [];
    existing.push({ resolve, reject });
    batch.entries.set(dashcardId, existing);

    const flushBatch = async () => {
      const currentBatch = pendingBatches.get(workspaceId);
      if (!currentBatch) return;

      // Take ownership of entries and clear
      const entries = currentBatch.entries;
      pendingBatches.delete(workspaceId);

      const ids = Array.from(entries.keys());

      try {
        const countMap = await batchCardCount(ids, workspaceId);

        entries.forEach((callbacks: PendingEntry[], id: string) => {
          const count = countMap[id] ?? 0;
          callbacks.forEach((cb: PendingEntry) => cb.resolve(count));
        });
      } catch (err) {
        entries.forEach((callbacks: PendingEntry[]) => {
          callbacks.forEach((cb: PendingEntry) => cb.reject(err));
        });
      }
    };

    // Reset the timer — we flush after BATCH_DELAY_MS of silence
    clearTimeout(batch.timer);
    batch.timer = setTimeout(flushBatch, BATCH_DELAY_MS);

    // Flush immediately once the batch reaches max API payload size.
    if (batch.entries.size >= MAX_BATCH_SIZE) {
      clearTimeout(batch.timer);
      batch.timer = setTimeout(flushBatch, 0);
    }
  });
}

/**
 * Custom hook for fetching and managing dashcard counts.
 *
 * Uses a DataLoader-style batcher: when multiple dashcards mount on the same
 * board, their individual count requests are automatically collected into a
 * single batch API call within a 50ms window.
 */
const dashcardCountKey = (
  workspaceId: string | undefined,
  dashcardId: string,
  configSignature?: string
) => ["dashcardCount", workspaceId, dashcardId, configSignature || "no-config"];

export const getDashcardCountQueryKey = dashcardCountKey;

export const getDashcardConfigSignature = (dashConfig: unknown) =>
  dashConfig ? JSON.stringify(dashConfig) : "no-config";

export const useDashcardCount = (dashcardId: string, dashConfig?: unknown) => {
  const queryClient = useQueryClient();
  const params = useParams();
  const workspaceId = Array.isArray(params.workspaceId)
    ? params.workspaceId[0]
    : params.workspaceId;
  const configSignature = getDashcardConfigSignature(dashConfig);

  const {
    data: count = 0,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: dashcardCountKey(workspaceId, dashcardId, configSignature),
    queryFn: () => scheduleBatchFetch(dashcardId, workspaceId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // refresh every 5 minutes
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: !!dashcardId && !!workspaceId,
  });

  /**
   * Force refresh the dashcard count
   * This can be called manually if needed
   */
  const refreshCount = () => {
    queryClient.invalidateQueries({ queryKey: ["dashcardCount", workspaceId, dashcardId] });
  };

  return {
    count,
    isLoading,
    isError,
    error,
    refreshCount,
    refetch,
  };
};
