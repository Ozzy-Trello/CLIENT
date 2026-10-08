import React, { useEffect, useRef, useState } from "react";
import { Alert, Button, message, Modal, Progress } from "antd";
import { scanPackDelivery, scanPackReceived } from "@api/barcode-packing";

type ScanStage = "delivery" | "received";

interface ScanPackModalProps {
  isOpen: boolean;
  onClose: () => void;
  stage: ScanStage;
}

const STAGE_LABEL: Record<ScanStage, string> = {
  delivery: "Scan Kurir (Delivery)",
  received: "Scan PA (Diterima Outlet)",
};

const ScanPackModal: React.FC<ScanPackModalProps> = ({ isOpen, onClose, stage }) => {
  const [scannerInput, setScannerInput] = useState("");
  const [progress, setProgress] = useState<{ total: number; done: number } | null>(
    null,
  );
  const [scanning, setScanning] = useState(false);
  const [queuedCount, setQueuedCount] = useState(0);

  const scannerRef = useRef<HTMLInputElement>(null);
  const queueRef = useRef<string[]>([]);
  const inFlightRef = useRef(new Set<string>());
  const processingRef = useRef(false);

  useEffect(() => {
    if (!isOpen || !scannerRef.current) return;

    scannerRef.current.focus();
    const interval = setInterval(() => scannerRef.current?.focus(), 100);
    return () => clearInterval(interval);
  }, [isOpen]);

  /**
   * Scanner gun mengirim barcode berikutnya sebelum request sebelumnya selesai,
   * jadi scan diantrikan alih-alih dibuang.
   */
  const processQueue = async () => {
    if (processingRef.current) return;

    processingRef.current = true;
    try {
      while (queueRef.current.length > 0) {
        const value = queueRef.current.shift();
        if (!value) continue;
        setQueuedCount(queueRef.current.length);
        setScanning(true);

        try {
          const scan = stage === "delivery" ? scanPackDelivery : scanPackReceived;
          const response = await scan(value);
          const result = response.data;
          if (result) {
            setProgress({
              total: result.progress.total,
              done:
                stage === "delivery"
                  ? result.progress.delivered
                  : result.progress.received,
            });
          }
        } catch (error) {
          message.open({
            key: "pack-scan-error",
            type: "error",
            content:
              (error as any)?.response?.data?.message || "Gagal memproses scan",
            duration: 2,
          });
        } finally {
          inFlightRef.current.delete(value);
          setScanning(false);
        }
      }
    } finally {
      processingRef.current = false;
      scannerRef.current?.focus();
    }
  };

  const handleScannerKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();

    const value = scannerInput.trim();
    setScannerInput("");
    if (!value || inFlightRef.current.has(value)) return;

    inFlightRef.current.add(value);
    queueRef.current.push(value);
    setQueuedCount(queueRef.current.length);
    void processQueue();
  };

  const handleClose = () => {
    if (scanning || queuedCount > 0) {
      message.warning("Masih memproses scan. Tunggu sampai selesai.");
      scannerRef.current?.focus();
      return;
    }
    setProgress(null);
    onClose();
  };

  const percent = progress?.total
    ? Math.round((progress.done / progress.total) * 100)
    : 0;

  return (
    <Modal
      title={STAGE_LABEL[stage]}
      open={isOpen}
      onCancel={handleClose}
      footer={[
        <Button key="close" onClick={handleClose}>
          Tutup
        </Button>,
      ]}
      width={520}
    >
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

      <div onClick={() => scannerRef.current?.focus()} className="space-y-4">
        {(scanning || queuedCount > 0) && (
          <Alert
            type="info"
            showIcon
            message="Scan masih diproses"
            description={
              queuedCount > 0
                ? `${queuedCount} scan menunggu diproses.`
                : "Tunggu sampai scan selesai sebelum menutup modal."
            }
          />
        )}

        {progress ? (
          <div className="p-4 rounded-lg border bg-white shadow-sm">
            <div className="flex items-center justify-between text-sm font-medium text-gray-700">
              <span>Progress pack</span>
              <span className="text-gray-500">
                {progress.done}/{progress.total} ({percent}%)
              </span>
            </div>
            <div className="mt-2">
              <Progress percent={percent} size="small" strokeWidth={10} showInfo={false} />
            </div>
          </div>
        ) : (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
            Arahkan scanner ke barcode packing untuk mulai.
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ScanPackModal;
