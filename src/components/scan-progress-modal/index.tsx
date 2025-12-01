import React, { useEffect, useRef, useState, useMemo } from "react";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { Button, message, Modal, Progress } from "antd";
import {
  getPOsByCardId,
  getPOScanProgress,
  scanPOItem,
  PO,
  ScanProgressResponse,
} from "@api/po";
import { cardDetails } from "@api/card";
import { Card } from "@myTypes/card";
import { LookupCache } from "@utils/lookup-cache";

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
  const [scanProgress, setScanProgress] = useState<
    Record<string, ScanProgressResponse>
  >({});
  const [scannerInput, setScannerInput] = useState("");
  const [card, setCard] = useState<Card | null>(null);
  const [pos, setPOs] = useState<PO[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Fetch card details and POs when cardId and boardId are provided
  useEffect(() => {
    if (cardId && boardId && isOpen) {
      // Fetch card details
      cardDetails(cardId, boardId)
        .then((response) => {
          if (response.data) {
            setCard(response.data);
          }
        })
        .catch((error) => {
          console.error("Failed to fetch card details:", error);
          message.error("Failed to fetch card details");
        });

      // Fetch POs for the card
      getPOsByCardId(cardId)
        .then((response) => {
          if (response.data) {
            setPOs(response.data);
          }
        })
        .catch((error) => {
          console.error("Failed to fetch POs:", error);
          message.error("Failed to fetch POs");
        });
    }
  }, [cardId, boardId, isOpen]);

  // Create queries for scan progress of each PO
  const scanProgressQueries = useQueries({
    queries: pos.map((po) => ({
      queryKey: ["scanProgress", po.id],
      queryFn: () => getPOScanProgress(po.id),
      enabled: !!po.id && isOpen,
      refetchInterval: 2000, // Refetch every 2 seconds when modal is open
    })),
  });

  // Memoize the progress data to avoid infinite re-renders
  const currentProgress = useMemo(() => {
    const newProgress: Record<string, ScanProgressResponse> = {};
    scanProgressQueries.forEach((q, idx) => {
      const po = pos[idx];
      if (po && q.data && q.data.data) {
        // API returns { status_code, message, data: ScanProgressResponse }
        newProgress[po.id] = q.data.data as ScanProgressResponse;
      }
    });
    return newProgress;
  }, [
    // Stabilize dependencies by using data content instead of query array reference
    scanProgressQueries.map((q) => q.data?.data).join(","),
    pos.map((po) => po.id).join(","),
  ]);

  // Update progress state only when the actual data changes
  useEffect(() => {
    // Only update if the progress data has actually changed
    const currentProgressKeys = Object.keys(currentProgress).sort();
    const scanProgressKeys = Object.keys(scanProgress).sort();

    const hasChanged =
      currentProgressKeys.length !== scanProgressKeys.length ||
      currentProgressKeys.some(
        (key) =>
          JSON.stringify(currentProgress[key]) !==
          JSON.stringify(scanProgress[key])
      );

    if (hasChanged) {
      setScanProgress(currentProgress);
    }
  }, [currentProgress, scanProgress]);

  const overallProgress = useMemo(() => {
    let scanned = 0;
    let total = 0;
    Object.values(scanProgress).forEach((progress) => {
      scanned += progress?.scanned ?? 0;
      total += progress?.total ?? 0;
    });
    return {
      scanned,
      total,
      percentage: total > 0 ? Math.round((scanned / total) * 100) : 0,
    };
  }, [scanProgress]);

  // Focus scanner input when modal opens
  useEffect(() => {
    if (isOpen && scannerRef.current) {
      scannerRef.current.focus();
      const refocusInput = () => {
        if (scannerRef.current) scannerRef.current.focus();
      };
      const focusInterval = setInterval(refocusInput, 100);
      return () => clearInterval(focusInterval);
    }
  }, [isOpen]);

  // Handle scanner input
  const handleScannerKeyPress = async (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key !== "Enter") return;

    e.preventDefault();
    const value = scannerInput.trim();
    setScannerInput("");

    if (!value || isScanning) {
      return;
    }

    setIsScanning(true);
    try {
      const response = await scanPOItem({ qrCode: value });
      message.success(response?.message || `Scanned: ${value}`);

      // Refresh scan progress for every PO in this card so UI reflects the latest data
      pos.forEach((poItem) => {
        queryClient.invalidateQueries({ queryKey: ["scanProgress", poItem.id] });
      });
    } catch (error) {
      const errorMessage =
        (error as any)?.response?.data?.message ||
        (error as Error)?.message ||
        "Failed to process scan. Please try again.";
      message.error(errorMessage);
    } finally {
      setIsScanning(false);
      scannerRef.current?.focus();
    }
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
      styles={{
        body: {
          padding: "1rem",
        },
      }}
    >
      {/* Scanner input */}
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
                const progressData = query?.data?.data as ScanProgressResponse;
                const scanned = progressData?.scanned ?? 0;
                const total = progressData?.total ?? 0;
                const percentage =
                  total > 0 ? Math.round((scanned / total) * 100) : 0;
                return (
                  <div key={po.id} className="p-4 rounded-lg border bg-gray-50">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">PO: {idx + 1} </span>
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
                          // Stable sort by size then itemNumber ascending
                          const sizeCmp = String(a.size).localeCompare(
                            String(b.size)
                          );
                          if (sizeCmp !== 0) return sizeCmp;
                          const aNum =
                            typeof a.itemNumber === "number"
                              ? a.itemNumber
                              : a.item_number ?? 0;
                          const bNum =
                            typeof b.itemNumber === "number"
                              ? b.itemNumber
                              : b.item_number ?? 0;
                          return aNum - bNum;
                        })
                        .map((item: any) => {
                          const scannedAt = item.scannedAt || item.scanned_at;
                          const scannedByUserId =
                            item.scannedBy || item.scanned_by;
                          // Prefer backend-provided name, fallback to lookup cache, then UUID
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

                          return (
                            <div
                              key={item.id}
                              className={`rounded-md bg-white border px-3 py-2 ${
                                item.scanned
                                  ? "border-green-200"
                                  : "border-gray-200"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-semibold text-sm">
                                    {item.size}-
                                    {String(
                                      item.itemNumber ?? item.item_number
                                    ).padStart(3, "0")}
                                  </span>
                                  {subcategoryName && (
                                    <span className="text-xs text-gray-500 px-2 py-0.5 bg-gray-100 rounded">
                                      {subcategoryName}
                                    </span>
                                  )}
                                </div>
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
