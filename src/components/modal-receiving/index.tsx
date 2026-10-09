import React, { useEffect, useRef, useState } from "react";
import { Alert, Button, Input, Modal, Progress, Typography, message } from "antd";
import type { InputRef } from "antd";
import { getCardByShortId } from "@api/card";
import { scanPackReceived, startReceiving } from "@api/barcode-packing";
import URLShortener from "@utils/url-shortener";

interface ModalReceivingProps {
  open: boolean;
  onClose: () => void;
}

interface ReceivingCard {
  id: string;
  name: string;
}

const resolveCardId = async (scanned: string): Promise<string | null> => {
  const trimmed = scanned.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(
      trimmed.startsWith("http") ? trimmed : `https://example.com${trimmed}`,
    );
    const parts = url.pathname.split("/");
    if (parts.length >= 3 && parts[1] === "qr") {
      const shortId = parseInt(parts[2]);
      if (!Number.isNaN(shortId)) {
        const response = await getCardByShortId(shortId);
        if (response.data) return response.data.id;
      }
    }
  } catch {
    // Bukan URL; lanjut ke parser berikutnya.
  }

  return URLShortener.extractCardIdFromUrl(trimmed) || trimmed;
};

const ModalReceiving: React.FC<ModalReceivingProps> = ({ open, onClose }) => {
  const [poInput, setPoInput] = useState("");
  const [card, setCard] = useState<ReceivingCard | null>(null);
  const [progress, setProgress] = useState<{ total: number; received: number } | null>(
    null,
  );
  const [resolving, setResolving] = useState(false);
  const [packInput, setPackInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [queuedCount, setQueuedCount] = useState(0);

  const poRef = useRef<InputRef>(null);
  const packRef = useRef<HTMLInputElement>(null);
  const queueRef = useRef<string[]>([]);
  const inFlightRef = useRef(new Set<string>());
  const processingRef = useRef(false);
  const cardIdRef = useRef("");

  useEffect(() => {
    if (!open) return;
    setPoInput("");
    setCard(null);
    setProgress(null);
    setPackInput("");
    setQueuedCount(0);
    queueRef.current = [];
    inFlightRef.current.clear();
    cardIdRef.current = "";
    const timer = window.setTimeout(() => poRef.current?.focus(), 100);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!card || !packRef.current) return;
    packRef.current.focus();
    const interval = setInterval(() => packRef.current?.focus(), 100);
    return () => clearInterval(interval);
  }, [card]);

  const handlePoScan = async () => {
    const scanned = poInput.trim();
    if (!scanned) return;

    setResolving(true);
    try {
      const cardId = await resolveCardId(scanned);
      if (!cardId) {
        message.error("Card ID tidak terbaca dari hasil scan");
        return;
      }

      const response = await startReceiving(cardId);
      const result = response.data;
      if (!result) throw new Error("PO tidak ditemukan");

      cardIdRef.current = result.card.id;
      setCard({ id: result.card.id, name: result.card.name });
      setProgress({
        total: result.progress.total,
        received: result.progress.received,
      });
    } catch (error: any) {
      message.error(
        error?.response?.data?.message || error?.message || "PO tidak dapat diterima",
      );
    } finally {
      setResolving(false);
    }
  };

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
          const response = await scanPackReceived(value, cardIdRef.current);
          const result = response.data;
          if (result) {
            setProgress({
              total: result.progress.total,
              received: result.progress.received,
            });
          }
        } catch (error: any) {
          message.open({
            key: "receiving-scan-error",
            type: "error",
            content: error?.response?.data?.message || "Gagal memproses scan",
            duration: 2,
          });
        } finally {
          inFlightRef.current.delete(value);
          setScanning(false);
        }
      }
    } finally {
      processingRef.current = false;
      packRef.current?.focus();
    }
  };

  const handlePackKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();

    const value = packInput.trim();
    setPackInput("");
    if (!value || inFlightRef.current.has(value)) return;

    inFlightRef.current.add(value);
    queueRef.current.push(value);
    setQueuedCount(queueRef.current.length);
    void processQueue();
  };

  const handleClose = () => {
    if (scanning || queuedCount > 0) {
      message.warning("Masih memproses scan. Tunggu sampai selesai.");
      packRef.current?.focus();
      return;
    }
    onClose();
  };

  const percent = progress?.total
    ? Math.round((progress.received / progress.total) * 100)
    : 0;
  const done = Boolean(progress && progress.received === progress.total);

  return (
    <Modal
      title="Receiving (Diterima Outlet)"
      open={open}
      onCancel={handleClose}
      onOk={card ? handleClose : handlePoScan}
      okText={card ? "Selesai" : "Lanjut"}
      confirmLoading={resolving}
      width={560}
    >
      {!card ? (
        <>
          <Typography.Text strong>Scan PO</Typography.Text>
          <Input
            ref={poRef}
            value={poInput}
            placeholder="Scan QR PO atau ketik Card ID..."
            onChange={(e) => setPoInput(e.target.value)}
            onPressEnter={handlePoScan}
            className="mt-2"
          />
          <Alert
            className="mt-4"
            type="info"
            showIcon
            message="Hanya PO di list PO Terkirim (PA) yang dapat diterima."
          />
        </>
      ) : (
        <div onClick={() => packRef.current?.focus()} className="space-y-4">
          <input
            ref={packRef}
            type="text"
            value={packInput}
            onChange={(e) => setPackInput(e.target.value)}
            onKeyDown={handlePackKeyDown}
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

          <div className="p-4 rounded-lg border bg-white shadow-sm">
            <Typography.Text strong>{card.name}</Typography.Text>
            <div className="mt-3 flex items-center justify-between text-sm font-medium text-gray-700">
              <span>Pack diterima</span>
              <span className="text-gray-500">
                {progress?.received ?? 0}/{progress?.total ?? 0} ({percent}%)
              </span>
            </div>
            <div className="mt-2">
              <Progress percent={percent} size="small" strokeWidth={10} showInfo={false} />
            </div>
          </div>

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

          {done ? (
            <Alert
              type="success"
              showIcon
              message="Seluruh pack diterima"
              description="Custom field Diterima Outlet sudah dicentang."
            />
          ) : (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
              Arahkan scanner ke barcode pack untuk menandai diterima.
            </div>
          )}

          <Button onClick={() => setCard(null)} disabled={scanning || queuedCount > 0}>
            Scan PO lain
          </Button>
        </div>
      )}
    </Modal>
  );
};

export default ModalReceiving;
