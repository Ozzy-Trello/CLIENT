import {
  getMiniWarehouseMovements,
  lookupMiniWarehouseLabel,
  recordMiniWarehouseMovement,
  reverseMiniWarehouseOpening,
} from "@api/mini-warehouse";
import type { MiniWarehouseCatalogItem, MiniWarehouseLabel, MiniWarehouseMovement } from "@api/mini-warehouse";
import { downloadMiniWarehouseLabels, expandLabelQuantities } from "@utils/mini-warehouse-labels";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Scanner } from "@yudiel/react-qr-scanner";
import { Alert, Button, Form, Input, InputNumber, Modal, Select, Space, Table, Typography, message } from "antd";
import { isAxiosError } from "axios";
import { useState } from "react";
import { v4 as uuid } from "uuid";

export const productKey = (row: { accurateDbId: string; accurateId: string }) =>
  `${row.accurateDbId}:${row.accurateId}`;

export const stockQuantity = (value: number | string | null | undefined) =>
  Number(value || 0).toLocaleString("id-ID", { maximumFractionDigits: 4 });

function errorText(error: unknown, fallback: string) {
  if (isAxiosError(error)) return error.response?.data?.error || fallback;
  return error instanceof Error ? error.message : fallback;
}

async function printLabels(labels: MiniWarehouseLabel[]) {
  try {
    await downloadMiniWarehouseLabels(labels);
  } catch {
    message.error("PDF gagal dibuat. Label bisa dicetak ulang.");
  }
}

interface StockFormValues {
  product: string;
  movementType: "opening" | "addition" | "reduction";
  quantity: number;
  packages?: Array<{ quantity: number; count: number }>;
  note?: string;
}

export function StockInputDialog({ catalog, locked, onClose, onSave }: {
  catalog: MiniWarehouseCatalogItem[];
  locked: boolean;
  onClose: () => void;
  onSave: () => Promise<unknown>;
}) {
  const [form] = Form.useForm<StockFormValues>();
  const [operationId, setOperationId] = useState(() => uuid());
  const [labels, setLabels] = useState<MiniWarehouseLabel[] | null>(null);
  const selected = Form.useWatch("product", form);
  const movementType = Form.useWatch("movementType", form);
  const item = catalog.find((entry) => productKey(entry) === selected);
  const reduction = movementType === "reduction";
  const mutation = useMutation({
    mutationFn: recordMiniWarehouseMovement,
    onSuccess: async (result) => {
      setLabels(result.labels);
      message.success("Saldo stok tersimpan");
      await onSave();
    },
    onError: (error) => message.error(errorText(error, "Gagal menyimpan saldo stok")),
  });

  function submit(values: StockFormValues) {
    if (!item?.unitType || locked || mutation.isPending) return;
    let quantities: number[] = [];
    try {
      if (!reduction) {
        const packages = values.packages?.length ? values.packages : [{ quantity: values.quantity, count: 1 }];
        quantities = expandLabelQuantities(values.quantity, packages);
      }
    } catch (error) {
      message.error(errorText(error, "Periksa qty label"));
      return;
    }
    mutation.mutate({
      operationId, accurateDbId: Number(item.accurateDbId), accurateId: Number(item.accurateId),
      quantity: values.quantity, movementType: values.movementType, note: values.note,
      labelQuantities: quantities,
    });
  }

  return (
    <Modal
      open
      title={labels ? "Saldo stok tersimpan" : "Input saldo stok"}
      onCancel={onClose}
      closable={!mutation.isPending}
      maskClosable={!mutation.isPending}
      keyboard={!mutation.isPending}
      footer={labels ? (
        <Space>
          <Button onClick={onClose}>Tutup</Button>
          {labels.length > 0 && <Button type="primary" onClick={() => printLabels(labels)}>Cetak Barcode</Button>}
        </Space>
      ) : undefined}
      onOk={() => form.submit()}
      confirmLoading={mutation.isPending}
      okButtonProps={{ disabled: locked || !item?.unitType }}
      cancelButtonProps={{ disabled: mutation.isPending }}
      okText="Simpan saldo"
    >
      {labels ? (
        labels.length > 0 && <Typography.Text>{labels.length} label siap dicetak.</Typography.Text>
      ) : (
        <Form form={form} layout="vertical" onFinish={submit} disabled={mutation.isPending} onValuesChange={() => setOperationId(uuid())}
          initialValues={{ movementType: "opening" }}>
          <Form.Item name="product" label="Barang Accurate · Non Persediaan" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label" options={catalog.map((entry) => ({
              value: productKey(entry), label: `${entry.itemCode || "Tanpa kode"} · ${entry.itemName} (${entry.source})`,
            }))} />
          </Form.Item>
          {item && (
            <Form.Item label="Satuan Accurate">
              <Input readOnly value={item.unitType ?? ""} placeholder="Satuan belum tersedia. Sinkronkan katalog Accurate." />
            </Form.Item>
          )}
          <Form.Item name="movementType" label="Jenis input" rules={[{ required: true }]}>
            <Select options={[
              { value: "opening", label: "Stok awal" },
              { value: "addition", label: "Penambahan stok" },
              { value: "reduction", label: "Pengurangan stok" },
            ]} />
          </Form.Item>
          <Form.Item name="quantity" label="Jumlah" rules={[{ required: true }, { type: "number", min: 0.0001 }]}>
            <InputNumber min={0.0001} precision={4} style={{ width: "100%" }} />
          </Form.Item>
          {!reduction && (
            <Form.List name="packages">
              {(fields, { add, remove }) => (
                <Space direction="vertical" style={{ width: "100%" }}>
                  <Typography.Text>Rincian label</Typography.Text>
                  {fields.length === 0 && (
                    <Typography.Text type="secondary">Tanpa rincian, sistem membuat satu label untuk seluruh jumlah.</Typography.Text>
                  )}
                  {fields.map(({ key, name }) => (
                    <Space key={key} align="baseline" wrap>
                      <Form.Item name={[name, "quantity"]} label="Qty per kemasan" rules={[{ required: true }]}>
                        <InputNumber min={0.0001} precision={4} />
                      </Form.Item>
                      <Form.Item name={[name, "count"]} label="Jumlah kemasan" rules={[{ required: true }]}>
                        <InputNumber min={1} max={100} precision={0} />
                      </Form.Item>
                      <Button type="link" danger onClick={() => remove(name)}>Hapus</Button>
                    </Space>
                  ))}
                  <Button onClick={() => add({ count: 1 })}>Tambah rincian label</Button>
                </Space>
              )}
            </Form.List>
          )}
          <Form.Item name="note" label={reduction ? "Alasan pengurangan" : "Catatan"}
            rules={reduction ? [{ required: true, whitespace: true }] : []} style={{ marginTop: 16 }}>
            <Input maxLength={500} />
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
}

const movementNames: Record<string, string> = {
  opening: "Stok awal",
  opening_reversal: "Pembatalan stok awal",
  addition: "Penambahan stok",
  reduction: "Pengurangan stok",
  consumption: "Pemakaian bahan",
  purchase_leftover: "Sisa pembelian",
  stocktake_adjustment: "Penyesuaian opname",
};

export function StockMovementDialog({ balanceId, itemName, unit, locked, onClose, onSave }: {
  balanceId: string;
  itemName: string;
  unit: string | null;
  locked: boolean;
  onClose: () => void;
  onSave: () => Promise<unknown>;
}) {
  const [page, setPage] = useState(1);
  const [reversing, setReversing] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const query = useQuery({
    queryKey: ["mini-warehouse-movements", balanceId, page],
    queryFn: () => getMiniWarehouseMovements(balanceId, page),
  });
  const reverse = useMutation({
    mutationFn: (id: string) => reverseMiniWarehouseOpening(id, reason.trim()),
    onSuccess: async () => {
      setReversing(null);
      setReason("");
      message.success("Stok awal dibatalkan.");
      await onSave();
    },
    onError: (error) => message.error(errorText(error, "Stok awal tidak bisa dibatalkan")),
  });

  return (
    <>
      <Modal open title={`Riwayat mutasi · ${itemName}`} onCancel={onClose} footer={null} width={1000}>
        {query.isError && <Alert type="error" message="Riwayat mutasi gagal dimuat." />}
        <Table<MiniWarehouseMovement>
          rowKey="id"
          loading={query.isFetching}
          dataSource={query.data?.movements || []}
          pagination={{ current: page, pageSize: 20, total: query.data?.total, onChange: setPage, showSizeChanger: false }}
          scroll={{ x: 820 }}
          columns={[
            { title: "Waktu", dataIndex: "createdAt", render: (value: string) => new Date(value).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) },
            { title: "Mutasi", dataIndex: "movementType", render: (value: string, row) => `${movementNames[value] || value}${row.voidedAt ? " (dibatalkan)" : ""}` },
            { title: "Jumlah", dataIndex: "quantity", align: "right", render: (value: string) => `${Number(value) > 0 ? "+" : ""}${stockQuantity(value)} ${unit || ""}` },
            { title: "Saldo setelah", dataIndex: "balanceAfter", align: "right", render: stockQuantity },
            { title: "Petugas", dataIndex: "createdByName", render: (value: string | null) => value || "—" },
            { title: "Request", dataIndex: "requestReference", render: (value: string | number | null) => value ?? "—" },
            { title: "Catatan", dataIndex: "note" },
            { title: "Aksi", key: "actions", render: (_, row) => (
              <Space wrap>
                {row.labels.length > 0 && <Button size="small" onClick={() => printLabels(row.labels)}>Cetak ulang</Button>}
                {row.movementType === "opening" && !row.voidedAt && (
                  <Button size="small" danger disabled={locked} onClick={() => setReversing(row.id)}>Batalkan stok awal</Button>
                )}
              </Space>
            ) },
          ]}
        />
      </Modal>
      <Modal open={Boolean(reversing)} title="Batalkan stok awal" onCancel={() => { setReversing(null); setReason(""); }}
        onOk={() => { if (reversing) reverse.mutate(reversing); }} okText="Batalkan stok awal" cancelText="Kembali"
        okButtonProps={{ danger: true, disabled: !reason.trim() || locked }}
        confirmLoading={reverse.isPending}>
        <Typography.Paragraph>Saldo awal akan dikembalikan ke nol dan label terkait dibatalkan.</Typography.Paragraph>
        <Input aria-label="Alasan pembatalan" placeholder="Alasan pembatalan" value={reason}
          maxLength={500} onChange={(event) => setReason(event.target.value)} />
      </Modal>
    </>
  );
}

export function StockScanDialog({ onClose, onOpenStock }: {
  onClose: () => void;
  onOpenStock: (stock: { id: string; itemName: string; unitType: string }) => void;
}) {
  const [camera, setCamera] = useState(false);
  const [scan, setScan] = useState("");
  const lookup = useMutation({ mutationFn: lookupMiniWarehouseLabel });
  function search(code: string) {
    const cleaned = code.trim();
    if (!cleaned || lookup.isPending) return;
    setScan(cleaned);
    setCamera(false);
    lookup.mutate(cleaned);
  }
  return (
    <Modal open title="Scan barcode barang" onCancel={onClose} footer={null}>
      <Space direction="vertical" style={{ width: "100%" }}>
        <Input.Search autoFocus value={scan} placeholder="Scan atau masukkan kode barcode" aria-label="Kode barcode"
          onChange={(event) => setScan(event.target.value)} onSearch={search} enterButton="Cari" loading={lookup.isPending} />
        <Button onClick={() => setCamera(!camera)}>{camera ? "Tutup kamera" : "Gunakan kamera"}</Button>
        {camera && <Scanner formats={["qr_code"]} onScan={(codes) => search(codes[0]?.rawValue || "")}
          onError={() => { setCamera(false); message.error("Kamera tidak bisa dibuka."); }} />}
        {lookup.isError && <Alert type="error" message={errorText(lookup.error, "Barcode gagal dibaca.")} />}
        {lookup.data && (
          <Space direction="vertical">
            <Typography.Text strong>{lookup.data.itemName}</Typography.Text>
            <Typography.Text>Kode barang {lookup.data.itemCode || "—"}</Typography.Text>
            <Typography.Text>Qty pada label {stockQuantity(lookup.data.quantity)} {lookup.data.unitType}</Typography.Text>
            <Typography.Text>Saldo tersedia {stockQuantity(lookup.data.availableQuantity)} {lookup.data.unitType}</Typography.Text>
            {lookup.data.returnPending && <Typography.Text type="secondary">Saldo pengembalian diperbarui saat Send.</Typography.Text>}
            {lookup.data.balanceId && (
              <Button onClick={() => {
                const stock = lookup.data;
                if (stock?.balanceId) onOpenStock({ id: stock.balanceId, itemName: stock.itemName, unitType: stock.unitType });
              }}>Lihat riwayat mutasi</Button>
            )}
          </Space>
        )}
      </Space>
    </Modal>
  );
}
