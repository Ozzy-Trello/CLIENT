import React, { useEffect, useRef, useState } from "react";
import { Alert, AutoComplete, Button, Modal, Progress, Typography, message } from "antd";
import { Camera, Keyboard } from "lucide-react";
import { Scanner } from "@yudiel/react-qr-scanner";
import QRGuideOverlay from "@components/qr-overlay";
import { getCardByShortId } from "@api/card";
import {
  getBarcodePacking,
  getReceivingCards,
  scanPackReceived,
  startReceiving,
} from "@api/barcode-packing";
import type { BarcodePacking, ReceivingCardOption } from "@api/barcode-packing";
import { resolveCardIdFromScan } from "@utils/resolve-card-scan";

interface ModalReceivingProps {
  open: boolean;
  onClose: () => void;
}

interface ReceivingCard {
  id: string;
  name: string;
}

const resolveCardId = (scanned: string): Promise<string | null> =>
  resolveCardIdFromScan(scanned, async (shortId) => {
    const response = await getCardByShortId(Number(shortId));
    return response.data?.id ?? null;
  });

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
  const [packs, setPacks] = useState<BarcodePacking[]>([]);
  const [cameraActive, setCameraActive] = useState(false);
  const [cardSearch, setCardSearch] = useState("");
  const [receivingCards, setReceivingCards] = useState<ReceivingCardOption[]>([]);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [cardOptionsOpen, setCardOptionsOpen] = useState(false);

  const poRef = useRef<any>(null);
  const packRef = useRef<HTMLInputElement>(null);
  const queueRef = useRef<string[]>([]);
  const inFlightRef = useRef(new Set<string>());
  const processingRef = useRef(false);
  const cardIdRef = useRef("");
  const lastCameraScanRef = useRef<{ value: string; at: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    setPoInput("");
    setCard(null);
    setProgress(null);
    setPackInput("");
    setPacks([]);
    setCameraActive(false);
    setCardSearch("");
    setReceivingCards([]);
    setQueuedCount(0);
    queueRef.current = [];
    inFlightRef.current.clear();
    cardIdRef.current = "";
    const timer = window.setTimeout(() => poRef.current?.focus(), 100);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open || card) return;
    let active = true;
    setCardsLoading(true);
    const timer = window.setTimeout(() => {
      getReceivingCards(cardSearch.trim() || undefined)
        .then((response) => {
          if (active) setReceivingCards(response.data ?? []);
        })
        .catch(() => {
          if (active) setReceivingCards([]);
        })
        .finally(() => {
          if (active) setCardsLoading(false);
        });
    }, cardSearch ? 300 : 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [open, card, cardSearch]);

  useEffect(() => {
    if (!card || cameraActive || !packRef.current) return;
    packRef.current.focus();
    const interval = setInterval(() => packRef.current?.focus(), 100);
    return () => clearInterval(interval);
  }, [card, cameraActive]);

  const handleStartReceiving = async (cardId: string) => {
    setResolving(true);
    try {
      const response = await startReceiving(cardId);
      const result = response.data;
      if (!result) throw new Error("PO tidak ditemukan");

      cardIdRef.current = result.card.id;
      setCard({ id: result.card.id, name: result.card.name });
      setProgress({
        total: result.progress.total,
        received: result.progress.received,
      });
      const packsResponse = await getBarcodePacking(cardId);
      setPacks(packsResponse.data ?? []);
    } catch (error: any) {
      message.error(
        error?.response?.data?.message || error?.message || "PO tidak dapat diterima",
      );
    } finally {
      setResolving(false);
    }
  };

  const handlePoScan = async () => {
    const scanned = poInput.trim();
    if (!scanned) return;

    try {
      const cardId = await resolveCardId(scanned);
      if (!cardId) {
        message.error("Card ID tidak terbaca dari hasil scan");
        return;
      }
      await handleStartReceiving(cardId);
    } catch (error: any) {
      message.error(
        error?.response?.data?.message || error?.message || "PO tidak dapat diterima",
      );
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
            setPacks((current) =>
              current.map((pack) =>
                pack.id === result.pack.id ? result.pack : pack,
              ),
            );
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
      if (!cameraActive) packRef.current?.focus();
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

  const enqueueCameraScan = (value: string) => {
    const now = Date.now();
    if (
      lastCameraScanRef.current?.value === value &&
      now - lastCameraScanRef.current.at < 1200
    ) {
      return;
    }
    lastCameraScanRef.current = { value, at: now };
    if (!value || inFlightRef.current.has(value)) return;
    inFlightRef.current.add(value);
    queueRef.current.push(value);
    setQueuedCount(queueRef.current.length);
    void processQueue();
  };

  const handleClose = () => {
    if (scanning || queuedCount > 0) {
      message.warning("Masih memproses scan. Tunggu sampai selesai.");
      if (!cameraActive) packRef.current?.focus();
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
      title="Terima PO"
      open={open}
      onCancel={handleClose}
      onOk={card ? handleClose : handlePoScan}
      okText={card ? "Selesai" : "Lanjut"}
      confirmLoading={resolving}
      width={560}
    >
      {!card ? (
        <>
          <Typography.Text strong>Scan atau cari PO/card</Typography.Text>
          <AutoComplete
            ref={poRef}
            value={poInput}
            placeholder="Scan QR atau ketik nama/ID card..."
            onChange={(value) => {
              setPoInput(value);
              setCardSearch(value);
            }}
            onSelect={(cardId) => {
              setPoInput("");
              void handleStartReceiving(cardId);
            }}
            onInputKeyDown={(e) => {
              const scannedCardId =
                /\/qr\//i.test(poInput) ||
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(poInput.trim()) ||
                /^\d+$/.test(poInput.trim());
              if (e.key === "Enter" && (scannedCardId || !cardOptionsOpen)) {
                e.preventDefault();
                void handlePoScan();
              }
            }}
            onOpenChange={setCardOptionsOpen}
            options={receivingCards.map((item) => ({
              value: item.id,
              label: `${item.name} · ${item.receivedPacks}/${item.totalPacks} pack diterima`,
            }))}
            filterOption={false}
            allowClear
            notFoundContent={cardsLoading ? "Memuat card..." : "Tidak ada card yang bisa diterima"}
            className="mt-2"
            style={{ width: "100%" }}
          />
          <Alert
            className="mt-4"
            type="info"
            showIcon
            message="Pilih card dari hasil pencarian atau scan QR card di field yang sama."
          />
        </>
      ) : (
        <div onClick={() => !cameraActive && packRef.current?.focus()} className="space-y-4">
          {!cameraActive && (
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
          )}

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

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Typography.Text strong>Detail barcode pack</Typography.Text>
              <Button
                size="small"
                icon={cameraActive ? <Keyboard size={16} /> : <Camera size={16} />}
                onClick={() => setCameraActive((active) => !active)}
              >
                {cameraActive ? "Pakai scanner barcode" : "Scan via kamera"}
              </Button>
            </div>
            {cameraActive && (
              <div className="relative h-[320px] overflow-hidden rounded-lg border bg-black">
                <Scanner
                  constraints={{
                    facingMode: { ideal: "environment" },
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                  }}
                  formats={["qr_code", "code_128", "code_39", "ean_13", "ean_8"]}
                  scanDelay={100}
                  onScan={(results) => {
                    const value = results.find((result) => result.rawValue)?.rawValue?.trim();
                    if (value) enqueueCameraScan(value);
                  }}
                  onError={() => message.error("Kamera tidak dapat digunakan")}
                  styles={{
                    container: { width: "100%", height: "100%" },
                    video: { width: "100%", height: "100%", objectFit: "cover" },
                  }}
                />
                <QRGuideOverlay imageClassName="h-20 w-auto max-w-[120px] opacity-70" />
              </div>
            )}
            <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border p-2">
              {packs.map((pack) => (
                <div key={pack.id} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                  <span>PACK {pack.packNumber} · {pack.qty} pcs</span>
                  <span className={pack.receivedAt ? "font-medium text-green-700" : "text-gray-500"}>
                    {pack.receivedAt ? "✓ Diterima" : "Pending"}
                  </span>
                </div>
              ))}
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

          <Button
            onClick={() => {
              setCard(null);
              setProgress(null);
              setPackInput("");
              setPacks([]);
              setCameraActive(false);
              setPoInput("");
              cardIdRef.current = "";
            }}
            disabled={scanning || queuedCount > 0}
          >
            Scan PO lain
          </Button>
        </div>
      )}
    </Modal>
  );
};

export default ModalReceiving;
