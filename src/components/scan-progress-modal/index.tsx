import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { Button, message, Modal, Progress, Tooltip } from "antd";
import {
  getPOsByCardId,
  getPOScanProgress,
  scanPOItem,
  PO,
  ScanPOItemResponse,
  ScanProgressResponse,
} from "@api/po";
import { cardDetails } from "@api/card";
import { Card } from "@myTypes/card";
import { LookupCache } from "@utils/lookup-cache";
import { usePermissions } from "@hooks/account";

const STANDARD_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL", "XXXXXL"];
const sizeOrder = (size: string): number => {
  const idx = STANDARD_SIZES.indexOf(size?.toUpperCase?.() ?? size);
  return idx === -1 ? 10 : idx + 1;
};

interface ScanProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardId?: string;
  boardId?: string;
}

const ScanProgressModal: React.FC<ScanProgressModalProps> = ({
  isOpen,
  onClose,
  cardId,
  boardId,
}) => {
  const [scannerInput, setScannerInput] = useState("");
  const [card, setCard] = useState<Card | null>(null);
  const [pos, setPOs] = useState<PO[]>([]);
  const [scanningKey, setScanningKey] = useState<string | null>(null); // per-item / per-scan loading key

  const scannerRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { user, isSuperAdmin } = usePermissions();
  const roleLower = (user?.role?.name || "").trim().toLowerCase();
  const isSuperAdminUser = isSuperAdmin();
  const canManualMark = isSuperAdminUser || roleLower === "kepala produksi";

  /**
   * Fetch card details + POs when modal opens
   */
  useEffect(() => {
    if (!cardId || !boardId || !isOpen) return;

    let cancelled = false;

    // Fetch card details
    cardDetails(cardId, boardId)
      .then((response) => {
        if (cancelled) return;
        if (response.data) setCard(response.data);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Failed to fetch card details:", error);
        message.error("Failed to fetch card details");
      });

    // Fetch POs for the card
    getPOsByCardId(cardId)
      .then((response) => {
        if (cancelled) return;
        if (response.data) setPOs(response.data);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Failed to fetch POs:", error);
        message.error("Failed to fetch POs");
      });

    return () => {
      cancelled = true;
    };
  }, [cardId, boardId, isOpen]);

  /**
   * Poll scan progress for each PO while the modal is open.
   * Keep the interval conservative so large POs do not overwhelm the backend.
   */
  const scanProgressQueries = useQueries({
    queries: pos.map((po) => ({
      queryKey: ["scanProgress", po.id],
      queryFn: () => getPOScanProgress(po.id),
      enabled: !!po.id && isOpen,
      refetchInterval: 8000,
      refetchIntervalInBackground: false,
    })),
  });

  /**
   * Build a map { [poId]: ScanProgressResponse }
   * Memoized by query update timestamps + PO ids to keep stable behavior.
   */
  const progressByPoId = useMemo(() => {
    const next: Record<string, ScanProgressResponse> = {};

    scanProgressQueries.forEach((q, idx) => {
      const po = pos[idx];
      if (!po?.id) return;

      const data = (q.data as any)?.data as ScanProgressResponse | undefined;
      if (data) next[po.id] = data;
    });

    return next;
  }, [
    // Only recompute when actual query data updates or PO ids change
    scanProgressQueries.map((q) => q.dataUpdatedAt ?? 0).join(","),
    pos.map((po) => po.id).join(","),
  ]);

  /**
   * Overall progress (sum across all POs)
   */
  const overallProgress = useMemo(() => {
    let scanned = 0;
    let total = 0;

    Object.values(progressByPoId).forEach((progress) => {
      scanned += progress?.scanned ?? 0;
      total += progress?.total ?? 0;
    });

    return {
      scanned,
      total,
      percentage: total > 0 ? Math.round((scanned / total) * 100) : 0,
    };
  }, [progressByPoId]);

  /**
   * Keep scanner input focused while open
   */
  useEffect(() => {
    if (!isOpen || !scannerRef.current) return;

    scannerRef.current.focus();

    const refocusInput = () => {
      scannerRef.current?.focus();
    };

    const focusInterval = setInterval(refocusInput, 100);
    return () => clearInterval(focusInterval);
  }, [isOpen]);

  /**
   * Refresh all PO scan progress queries (fast UI update after scanning)
   */
  const refreshProgressForScan = (scanResponse: ScanPOItemResponse) => {
    const scannedPoId = scanResponse?.data?.po_id ?? scanResponse?.data?.poId;

    if (scannedPoId) {
      queryClient.invalidateQueries({ queryKey: ["scanProgress", scannedPoId] });
      return;
    }

    pos.forEach((poItem) => {
      queryClient.invalidateQueries({ queryKey: ["scanProgress", poItem.id] });
    });
  };

  /**
   * Unified scan submitter: used by BOTH scanner Enter + per-item button
   */
  const submitScan = async (qrCode: string, loadingKey: string) => {
    const value = qrCode.trim();
    if (!value) return;

    // prevent parallel scans
    if (scanningKey) return;

    setScanningKey(loadingKey);
    try {
      const response = await scanPOItem({ qrCode: value });
      message.success(response?.message || `Scanned: ${value}`);
      refreshProgressForScan(response);
    } catch (error) {
      const errorMessage =
        (error as any)?.response?.data?.message ||
        (error as Error)?.message ||
        "Failed to process scan. Please try again.";
      message.error(errorMessage);
    } finally {
      setScanningKey(null);
      scannerRef.current?.focus();
    }
  };

  /**
   * Handle scanner Enter
   */
  const handleScannerKeyPress = async (
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key !== "Enter") return;

    e.preventDefault();
    const value = scannerInput.trim();
    setScannerInput("");

    if (!value) return;

    // scanner run key
    await submitScan(value, `scanner:${value}`);
  };

  /**
   * Helper: find QR value from item shape (adjust key names if your backend differs)
   */
  const getItemQrCode = (item: any): string | null => {
    const qr =
      item?.qrCode ??
      item?.qr_code ??
      item?.qrcode ??
      item?.qr ??
      item?.code ??
      null;

    return qr ? String(qr) : null;
  };

  return (
    <Modal
      title={
        <div>
          <div>Scan Progress</div>
          {card && (
            <div
              style={{ fontSize: "14px", fontWeight: "normal", color: "#666" }}
            >
              Card: {card.name}
            </div>
          )}
        </div>
      }
      open={isOpen}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
      ]}
      width={800}
      styles={{ body: { padding: "1rem" } }}
    >
      {/* Hidden scanner input (keyboard wedge) */}
      <input
        ref={scannerRef}
        type="text"
        value={scannerInput}
        onChange={(e) => setScannerInput(e.target.value)}
        onKeyDown={handleScannerKeyPress}
        onBlur={(e) => e.target.focus()}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          opacity: 0,
          width: "1px",
          height: "1px",
          border: "none",
          padding: 0,
          margin: 0,
        }}
        autoFocus
      />

      <div onClick={() => scannerRef.current?.focus()}>
        <div className="space-y-4">
          {/* Overall progress */}
          {overallProgress.total > 0 && (
            <div className="p-4 rounded-lg border bg-white shadow-sm">
              <div className="flex items-center justify-between text-sm font-medium text-gray-700">
                <span>Overall progress</span>
                <span className="text-gray-500">
                  {overallProgress.scanned}/{overallProgress.total} (
                  {overallProgress.percentage}%)
                </span>
              </div>
              <div className="mt-2">
                <Progress
                  percent={overallProgress.percentage}
                  size="small"
                  strokeWidth={10}
                  showInfo={false}
                />
              </div>
            </div>
          )}

          {/* Loading State */}
          {scanProgressQueries.some((q) => q.isLoading) && (
            <div className="text-center py-4">
              <div className="text-sm text-gray-600">
                Loading scan progress...
              </div>
            </div>
          )}

          {/* Error State */}
          {scanProgressQueries.some((q) => q.error) && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-red-800 font-medium mb-2">Errors:</div>
              {scanProgressQueries
                .filter((q) => q.error)
                .map((query, index) => (
                  <div key={index} className="text-red-700 text-sm">
                    {(query.error as any)?.message || "Unknown error"}
                  </div>
                ))}
            </div>
          )}

          {/* No PO data */}
          {pos.length === 0 && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="text-yellow-800 text-sm">
                No PO items found for this card. Ensure the correct card ID was
                provided.
              </div>
            </div>
          )}

          {/* PO Scan Progress */}
          {pos.length > 0 &&
            pos
              .slice()
              .reverse()
              .map((po: PO, idx: number) => {
                const queryIndex = pos.findIndex((p) => p.id === po.id);
                const query = scanProgressQueries[queryIndex];

                const progressData = (query?.data as any)?.data as
                  | ScanProgressResponse
                  | undefined;

                const scanned = progressData?.scanned ?? 0;
                const total = progressData?.total ?? 0;
                const percentage =
                  total > 0 ? Math.round((scanned / total) * 100) : 0;

                return (
                  <div key={po.id} className="p-4 rounded-lg border bg-gray-50">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">PO: {idx + 1}</span>
                      <span className="text-sm font-medium">
                        {scanned}/{total} ({percentage}%)
                      </span>
                    </div>

                    <div className="mt-2">
                      <Progress
                        percent={percentage}
                        size="small"
                        showInfo={false}
                      />
                    </div>

                    {/* Individual Items */}
                    <div className="mt-3 space-y-1">
                      {(progressData?.items || [])
                        .slice()
                        .sort((a: any, b: any) => {
                          const orderA = sizeOrder(a.size);
                          const orderB = sizeOrder(b.size);
                          if (orderA !== orderB) return orderA - orderB;
                          // Custom sizes (same order=10): sort alphabetically
                          const sizeCmp = String(a.size).localeCompare(String(b.size));
                          if (sizeCmp !== 0) return sizeCmp;

                          const aNum =
                            typeof a.itemNumber === "number"
                              ? a.itemNumber
                              : (a.item_number ?? 0);
                          const bNum =
                            typeof b.itemNumber === "number"
                              ? b.itemNumber
                              : (b.item_number ?? 0);

                          return aNum - bNum;
                        })
                        .map((item: any) => {
                          const scannedAt = item.scannedAt || item.scanned_at;
                          const scannedByUserId =
                            item.scannedBy || item.scanned_by;

                          const scannedByName =
                            item.scannedByName ||
                            item.scanned_by_name ||
                            (scannedByUserId
                              ? LookupCache.label("user", scannedByUserId)
                              : null) ||
                            scannedByUserId;

                          const subcategoryName =
                            item.subcategoryName || item.subcategory_name;

                          const formattedTime = scannedAt
                            ? new Date(scannedAt).toLocaleString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : null;

                          const itemNumber =
                            item.itemNumber ?? item.item_number ?? 0;

                          const itemKey = `${po.id}:${item.id ?? `${item.size}-${itemNumber}`}`;
                          const itemQr = getItemQrCode(item);

                          const isItemScanning =
                            scanningKey === `item:${itemKey}`;
                          const isAnyScanning = !!scanningKey;

                          return (
                            <div
                              key={item.id ?? itemKey}
                              className={`rounded-md bg-white border px-3 py-2 ${
                                item.scanned
                                  ? "border-green-200"
                                  : "border-gray-200"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                {/* left */}
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-semibold text-sm">
                                    {item.size}-
                                    {String(itemNumber).padStart(3, "0")}
                                  </span>

                                  {subcategoryName && (
                                    <span className="text-xs text-gray-500 px-2 py-0.5 bg-gray-100 rounded">
                                      {subcategoryName}
                                    </span>
                                  )}
                                </div>

                                {/* right */}
                                <div className="flex items-center gap-2">
                                  {/* Manual check button for authorized roles */}
                                  {canManualMark && !item.scanned && (
                                    <Tooltip
                                      title={
                                        itemQr
                                          ? "Mark as scanned (manual)"
                                          : "No QR code value found on this item data"
                                      }
                                    >
                                      <Button
                                        size="small"
                                        type="primary"
                                        loading={isItemScanning}
                                        disabled={!itemQr || isAnyScanning}
                                        onClick={async () => {
                                          if (!itemQr) {
                                            message.error(
                                              "This item has no QR code value to scan. (Check item.qrCode / item.qr_code)",
                                            );
                                            return;
                                          }
                                          await submitScan(
                                            String(itemQr),
                                            `item:${itemKey}`,
                                          );
                                        }}
                                      >
                                        ✓ Check
                                      </Button>
                                    </Tooltip>
                                  )}

                                  <span
                                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                      item.scanned
                                        ? "bg-green-100 text-green-700 border border-green-200"
                                        : "bg-gray-100 text-gray-700 border border-gray-200"
                                    }`}
                                  >
                                    {item.scanned ? "✓ Scanned" : "Pending"}
                                  </span>
                                </div>
                              </div>

                              {item.scanned &&
                                (scannedByName || formattedTime) && (
                                  <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                                    {scannedByName && (
                                      <span className="flex items-center gap-1">
                                        <span className="font-medium">By:</span>
                                        <span>{scannedByName}</span>
                                      </span>
                                    )}
                                    {formattedTime && (
                                      <span className="flex items-center gap-1">
                                        <span className="font-medium">At:</span>
                                        <span>{formattedTime}</span>
                                      </span>
                                    )}
                                  </div>
                                )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                );
              })}
        </div>
      </div>
    </Modal>
  );
};

export default ScanProgressModal;
