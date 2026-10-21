import React, { useEffect, useMemo, useState } from "react";
import { Alert, Button, InputNumber, message, Modal, Popconfirm, Table } from "antd";
import {
  BarcodePacking,
  deleteBarcodePacking,
  getBarcodePacking,
  issueBarcodePacking,
  printBarcodePacking,
  updateBarcodePacking,
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
  const [editingExisting, setEditingExisting] = useState(false);
  const [editingQuantities, setEditingQuantities] = useState<Record<string, number | null>>({});
  const [savingExisting, setSavingExisting] = useState(false);
  const [deletingPackId, setDeletingPackId] = useState<string | null>(null);

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

  const beginEditExisting = () => {
    if (!existing || existing.some((pack) => pack.deliveredAt || pack.receivedAt)) return;
    setEditingQuantities(Object.fromEntries(existing.map((pack) => [pack.id, pack.qty])));
    setEditingExisting(true);
  };

  const saveExistingChanges = async () => {
    if (!existing) return;
    const updates = existing.map((pack) => ({
      id: pack.id,
      qty: Number(editingQuantities[pack.id]),
    }));
    const total = updates.reduce((sum, pack) => sum + pack.qty, 0);
    if (
      updates.some((pack) => !Number.isInteger(pack.qty) || pack.qty < 1) ||
      total !== jmlPesanan
    ) {
      message.error(`Total qty harus sama dengan Jml Pesanan (${jmlPesanan} pcs)`);
      return;
    }

    setSavingExisting(true);
    try {
      const response = await updateBarcodePacking(cardId, updates);
      setExisting(response.data ?? []);
      setEditingExisting(false);
      message.success("Qty pack diperbarui. Cetak ulang semua barcode.");
    } catch (error) {
      message.error((error as any)?.response?.data?.message || "Gagal mengubah qty pack");
    } finally {
      setSavingExisting(false);
    }
  };

  const handleDeletePack = async (packId: string) => {
    setDeletingPackId(packId);
    try {
      const response = await deleteBarcodePacking(cardId, packId);
      const packs = response.data ?? [];
      if (packs.length) {
        setExisting(packs);
      } else {
        setExisting(null);
        setPackCount(1);
        setQuantities([null]);
      }
      setEditingExisting(false);
      message.success("Pack dihapus. Cetak ulang barcode yang tersisa.");
    } catch (error) {
      message.error((error as any)?.response?.data?.message || "Gagal menghapus pack");
    } finally {
      setDeletingPackId(null);
    }
  };

  if (existing) {
    const hasScans = existing.some((pack) => pack.deliveredAt || pack.receivedAt);
    const editingTotal = existing.reduce(
      (sum, pack) => sum + (Number(editingQuantities[pack.id]) || 0),
      0,
    );
    return (
      <Modal
        title="Barcode Packing"
        open={isOpen}
        onCancel={onClose}
        footer={[
          editingExisting ? (
            <Button
              key="save"
              type="primary"
              loading={savingExisting}
              disabled={editingTotal !== jmlPesanan || Object.values(editingQuantities).some((qty) => !Number.isInteger(qty) || Number(qty) < 1)}
              onClick={saveExistingChanges}
            >
              Simpan Qty
            </Button>
          ) : (
            <Button key="print" type="primary" onClick={handleReprint}>
            Cetak Ulang
            </Button>
          ),
          editingExisting ? (
            <Button key="cancel-edit" onClick={() => setEditingExisting(false)} disabled={savingExisting}>
              Batal Edit
            </Button>
          ) : (
            <Button key="edit" onClick={beginEditExisting} disabled={hasScans}>
              Edit Qty
            </Button>
          ),
          <Button key="close" onClick={onClose}>
            Tutup
          </Button>,
        ]}
        width={640}
        styles={{ body: { padding: "24px 28px 20px" } }}
      >
        {hasScans ? (
          <Alert
            className="mb-3"
            type="warning"
            showIcon
            message="Barcode tidak bisa diubah atau dihapus setelah ada pack discan."
          />
        ) : editingExisting ? (
          <Alert
            className="mb-3"
            type="info"
            showIcon
            message={`Total qty harus tetap ${jmlPesanan} pcs. Setelah disimpan, cetak ulang semua label.`}
          />
        ) : null}
        <Table
          size="small"
          rowKey="id"
          pagination={false}
          dataSource={existing}
          columns={[
            { title: "Pack", dataIndex: "packNumber", width: 70 },
            {
              title: "Qty",
              dataIndex: "qty",
              width: 110,
              render: (value: number, pack: BarcodePacking) => editingExisting ? (
                <InputNumber
                  min={1}
                  value={editingQuantities[pack.id]}
                  onChange={(qty) => setEditingQuantities((current) => ({ ...current, [pack.id]: qty }))}
                  disabled={savingExisting}
                  size="small"
                />
              ) : value,
            },
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
            {
              title: "",
              key: "actions",
              width: 90,
              render: (_: unknown, pack: BarcodePacking) => (
                <Popconfirm
                  title="Hapus pack ini?"
                  description="Qty akan digabung ke pack terdekat. Barcode yang tersisa harus dicetak ulang."
                  okText="Hapus"
                  cancelText="Batal"
                  onConfirm={() => handleDeletePack(pack.id)}
                  disabled={hasScans || editingExisting || deletingPackId !== null}
                >
                  <Button
                    size="small"
                    danger
                    loading={deletingPackId === pack.id}
                    disabled={hasScans || editingExisting || deletingPackId !== null}
                  >
                    Hapus
                  </Button>
                </Popconfirm>
              ),
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
