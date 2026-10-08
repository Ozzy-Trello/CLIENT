import React, { useEffect, useMemo, useState } from "react";
import { Alert, Button, InputNumber, message, Modal, Table } from "antd";
import {
  BarcodePacking,
  getBarcodePacking,
  issueBarcodePacking,
  printBarcodePacking,
} from "@api/barcode-packing";

interface IssueBarcodePackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardId: string;
  cardName?: string;
  /** CF "Jml Pesanan"; total qty seluruh pack harus sama persis dengan ini. */
  jmlPesanan: number;
}

const downloadPdf = (blob: Blob, cardName?: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `barcode-packing-${cardName || "card"}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
};

const IssueBarcodePackingModal: React.FC<IssueBarcodePackingModalProps> = ({
  isOpen,
  onClose,
  cardId,
  cardName,
  jmlPesanan,
}) => {
  const [quantities, setQuantities] = useState<number[]>([]);
  const [packCount, setPackCount] = useState(1);
  const [existing, setExisting] = useState<BarcodePacking[] | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !cardId) return;

    let cancelled = false;
    getBarcodePacking(cardId)
      .then((response) => {
        if (cancelled) return;
        const packs = response.data ?? [];
        setExisting(packs.length > 0 ? packs : null);
        setPackCount(packs.length || 1);
        setQuantities(packs.length > 0 ? [] : [jmlPesanan]);
      })
      .catch(() => {
        if (!cancelled) {
          setPackCount(1);
          setQuantities([jmlPesanan]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, cardId, jmlPesanan]);

  const total = useMemo(
    () => quantities.reduce((sum, qty) => sum + (Number(qty) || 0), 0),
    [quantities],
  );
  const matches = total === jmlPesanan && jmlPesanan > 0;

  const setQty = (index: number, value: number | null) => {
    setQuantities((prev) =>
      prev.map((qty, idx) => (idx === index ? Number(value) || 0 : qty)),
    );
  };

  const setPackTotal = (value: number | null) => {
    const nextCount = Math.max(1, Number(value) || 1);
    setPackCount(nextCount);
    setQuantities((previous) =>
      Array.from({ length: nextCount }, (_, index) => previous[index] ?? 1),
    );
  };

  const handleIssue = async () => {
    setSubmitting(true);
    try {
      await issueBarcodePacking(
        cardId,
        quantities.map((qty) => ({ qty })),
      );
      const { data: blob } = await printBarcodePacking(cardId);
      downloadPdf(blob, cardName);
      message.success("Barcode packing diterbitkan");
      onClose();
    } catch (error) {
      message.error(
        (error as any)?.response?.data?.message || "Gagal menerbitkan barcode",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleReprint = async () => {
    try {
      const { data: blob } = await printBarcodePacking(cardId);
      downloadPdf(blob, cardName);
    } catch {
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
    >
      {jmlPesanan > 0 ? (
        <div className="space-y-3">
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-5 py-4">
            <div className="text-sm text-gray-500">Nama PO</div>
            <div className="mt-1 text-xl font-bold text-gray-900">{cardName || "-"}</div>
            <div className="mt-1 text-sm text-gray-500">Card ID: {cardId}</div>
            <div className="mt-3 text-sm text-gray-500">Jml Pesanan</div>
            <div className="text-xl font-bold text-gray-900">{jmlPesanan} pcs</div>
          </div>

          <div className="pt-3 text-sm font-semibold text-gray-700">Split menjadi berapa pack?</div>
          <InputNumber
            min={1}
            value={packCount}
            onChange={setPackTotal}
            className="w-full"
          />

          {quantities.map((qty, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="w-28 text-sm font-semibold text-gray-700">
                PACK {index + 1} / {packCount} · PCS
              </span>
              <InputNumber
                min={1}
                value={qty}
                onChange={(value) => setQty(index, value)}
                className="flex-1"
              />
            </div>
          ))}

          <div className={`pt-2 text-sm font-medium ${matches ? "text-green-700" : "text-red-600"}`}>
            Total isi: {total} / {jmlPesanan} pcs — {matches ? "Sesuai" : "Belum sesuai"}
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
