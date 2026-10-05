/**
 * Patch one row of a cached scan-progress payload.
 *
 * Refetching after every scan re-downloads the whole item list — 299 KB for a
 * 1,092-item PO — which operators feel as a pause between scans. The scan
 * response already carries the updated row, so apply it locally and let the
 * slower poll reconcile anything scanned on another device.
 */
export function applyScannedItem(previous: any, scannedItem: any): any {
  const progress = previous?.data;
  if (!progress || !Array.isArray(progress.items) || !scannedItem?.id) {
    return previous;
  }

  let found = false;
  let countedBefore = false;

  const items = progress.items.map((item: any) => {
    if (item?.id !== scannedItem.id) return item;
    found = true;
    countedBefore = Boolean(item.scannedAt ?? item.scanned_at ?? item.scanned);
    return { ...item, ...scannedItem };
  });

  if (!found) return previous;

  return {
    ...previous,
    data: {
      ...progress,
      items,
      scanned: countedBefore
        ? (progress.scanned ?? 0)
        : (progress.scanned ?? 0) + 1,
    },
  };
}
