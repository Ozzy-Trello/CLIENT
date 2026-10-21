import React, { useEffect, useMemo, useState } from "react";
import { Alert, Button, InputNumber, message, Modal, Table } from "antd";
import {
  BarcodePacking,
  getBarcodePacking,
  issueBarcodePacking,
  printBarcodePacking,
} from "@api/barcode-packing";
import { addCardLabel, getCardLabels } from "@api/card";
import { getAllLabels } from "@api/label";

interface IssueBarcodePackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardId: string;
  cardName?: string;
  workspaceId: string;
  /** CF "Jml Pesanan"; total qty seluruh pack harus sama persis dengan ini. */
  jmlPesanan: number;
}

const previewPdf = (blob: Blob, previewWindow: Window | null, cardName?: string) => {
  const url = URL.createObjectURL(blob);
  if (!previewWindow) {
    URL.revokeObjectURL(url);
    message.warning("Izinkan pop-up untuk melihat barcode packing.");
    return;
  }
  previewWindow.document.title = `Barcode Packing - ${cardName || "card"}`;
  previewWindow.location.href = url;
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

const IssueBarcodePackingModal: React.FC<IssueBarcodePackingModalProps> = ({
  isOpen,
  onClose,
  cardId,
  cardName,
  workspaceId,
  jmlPesanan,
}) => {
  const [quantities, setQuantities] = useState<Array<number | null>>([]);
  const [packCount, setPackCount] = useState(1);
  const [existing, setExisting] = useState<BarcodePacking[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);

  useEffect(() => {
    if (!isOpen || !cardId) return;

    let cancelled = false;
    setLoadingExisting(true);
    getBarcodePacking(cardId)
      .then((response) => {
        if (cancelled) return;
        const packs = response.data ?? [];
        setExisting(packs.length > 0 ? packs : null);
        setPackCount(packs.length || 1);
        setQuantities(packs.length > 0 ? [] : [null]);
      })
      .catch(() => {
        if (!cancelled) {
          setPackCount(1);
          setQuantities([null]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingExisting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, cardId, jmlPesanan]);

  const total = useMemo(
    () => quantities.reduce<number>((sum, qty) => sum + (Number(qty) || 0), 0),
    [quantities],
  );
  const matches =
    quantities.length > 0 &&
    quantities.every((qty) => Number.isInteger(qty) && Number(qty) > 0) &&
    total === jmlPesanan &&
    jmlPesanan > 0;

  const setQty = (index: number, value: number | null) => {
    setQuantities((prev) =>
      prev.map((qty, idx) => (idx === index ? value : qty)),
    );
  };

  const setPackTotal = (value: number | null) => {
    const nextCount = Math.max(1, Number(value) || 1);
    setPackCount(nextCount);
    setQuantities((previous) =>
      Array.from({ length: nextCount }, (_, index) => previous[index] ?? null),
    );
  };

  const addQrPackingLabel = async () => {
    const [labelsResponse, cardLabelsResponse] = await Promise.all([
      getAllLabels(workspaceId),
      getCardLabels(workspaceId, cardId),
    ]);
    const qrPackingLabel = labelsResponse.data?.find(
      (label) => label.name.trim().toLowerCase() === "qr packing",
    );
    if (!qrPackingLabel) throw new Error("Label QR Packing tidak ditemukan");

    const isAssigned = (cardLabelsResponse.data ?? []).some(
      (label: any) => (label.labelId ?? label.label_id ?? label.id) === qrPackingLabel.id,
    );
    if (!isAssigned) {
      await addCardLabel(workspaceId, qrPackingLabel.id, cardId);
    }
  };

  const handleIssue = async () => {
    if (!matches) return;
    const previewWindow = window.open("about:blank", "_blank");
    setSubmitting(true);
    try {
      await issueBarcodePacking(
        cardId,
        quantities.map((qty) => ({ qty: Number(qty) })),
      );
      try {
        await addQrPackingLabel();
      } catch {
        message.warning("Barcode terbit, tetapi label QR Packing gagal ditambahkan.");
      }
      const { data: blob } = await printBarcodePacking(cardId);
      previewPdf(blob, previewWindow, cardName);
      message.success("Barcode packing diterbitkan");
      onClose();
    } catch (error) {
      previewWindow?.close();
      message.error(
        (error as any)?.response?.data?.message || "Gagal menerbitkan barcode",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleReprint = async () => {
    const previewWindow = window.open("about:blank", "_blank");
    try {
      const { data: blob } = await printBarcodePacking(cardId);
      previewPdf(blob, previewWindow, cardName);
    } catch {
      previewWindow?.close();
      message.error("Gagal mencetak ulang barcode");
    }
  };

  if (existing) {
    return (
      <Modal
        title="Barcode Packing"
        open={isOpen}
        onCancel={onClose}
        footer={[
          <Button key="print" type="primary" onClick={handleReprint}>
            Cetak Ulang
          </Button>,
          <Button key="close" onClick={onClose}>
            Tutup
          </Button>,
        ]}
        width={640}
        styles={{ body: { padding: "24px 28px 20px" } }}
      >
        <Table
          size="small"
          rowKey="id"
          pagination={false}
          dataSource={existing}
          columns={[
            { title: "Pack", dataIndex: "packNumber", width: 70 },
            { title: "Qty", dataIndex: "qty", width: 80 },
            {
              title: "Kurir",
              dataIndex: "deliveredAt",
              render: (value: string | null) => (value ? "Terkirim" : "-"),
            },
            {
              title: "Outlet",
              dataIndex: "receivedAt",
              render: (value: string | null) => (value ? "Diterima" : "-"),
            },
          ]}
        />
      </Modal>
    );
  }

  return (
    <Modal
      title="Generate QR PACK"
      open={isOpen}
      onCancel={onClose}
      footer={[
        <Button
          key="issue"
          type="primary"
          loading={submitting}
          disabled={!matches}
          onClick={handleIssue}
        >
          Terbitkan &amp; Cetak
        </Button>,
        <Button key="close" onClick={onClose}>
          Batal
        </Button>,
      ]}
      width={520}
      styles={{ body: { padding: "24px 28px 20px" } }}
    >
      {loadingExisting ? (
        <div className="py-10 text-center text-sm text-gray-600" role="status">
          Memeriksa barcode packing...
        </div>
      ) : jmlPesanan > 0 ? (
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
            <div className="flex items-start justify-between gap-5">
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">Nama PO</div>
                <div className="mt-2 truncate text-xl font-bold text-slate-900">{cardName || "-"}</div>
                <div className="mt-1 truncate text-xs text-slate-600">Card ID: {cardId}</div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">Jml Pesanan</div>
                <div className="mt-2 text-xl font-bold text-slate-900">{jmlPesanan} pcs</div>
              </div>
            </div>
          </div>

          <div className="pt-3 text-sm font-semibold text-slate-900">Split menjadi berapa pack?</div>
          <InputNumber
            min={1}
            value={packCount}
            onChange={setPackTotal}
            disabled={submitting}
            className="w-full"
          />

          {quantities.map((qty, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="w-28 text-sm font-semibold text-slate-700">
                PACK {index + 1} / {packCount} · PCS
              </span>
              <InputNumber
                min={1}
                value={qty}
                onChange={(value) => setQty(index, value)}
                disabled={submitting}
                className="flex-1"
              />
            </div>
          ))}

          <div className={`rounded-lg px-3 py-2 text-sm font-medium ${matches ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
            Total isi: {total} / {jmlPesanan} pcs. {matches ? "Sesuai." : "Sesuaikan jumlah sebelum generate."}
          </div>

        </div>
      ) : (
        <Alert
          type="error"
          showIcon
          message="Jml Pesanan belum terisi"
          description="Isi custom field Jml Pesanan sebelum menerbitkan barcode packing."
        />
      )}
    </Modal>
  );
};

export default IssueBarcodePackingModal;
