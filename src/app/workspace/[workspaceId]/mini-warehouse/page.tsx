"use client";

import {
  cancelStockRequestItem,
  fulfillStockRequestItem,
  getMiniWarehouseCatalog,
  getMiniWarehouseStock,
  getMiniWarehouseStocktake,
  getStockRequestItems,
  reportStockRequestLeftover,
  syncMiniWarehouseCatalog,
  startMiniWarehouseStocktake,
  countMiniWarehouseStocktakeItem,
  completeMiniWarehouseStocktake,
  cancelMiniWarehouseStocktake,
} from "@api/mini-warehouse";
import type { MiniWarehouseStockBalance } from "@api/mini-warehouse";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Card, Form, Input, InputNumber, message, Modal, Select, Space, Table, Tabs, Tag, Typography } from "antd";
import { useMemo, useState } from "react";

import { productKey, stockQuantity as labelQuantity, StockInputDialog, StockMovementDialog, StockScanDialog } from "./stock-dialogs";

type StockRow = Omit<MiniWarehouseStockBalance, "quantity" | "id" | "unitType"> & {
  id?: string;
  quantity: string | null;
  unitType: string | null;
  source?: string;
};

export default function MiniWarehousePage() {
  const queryClient = useQueryClient();
  const [fulfillmentForm] = Form.useForm();
  const [leftoverForm] = Form.useForm();
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [historyRow, setHistoryRow] = useState<Pick<StockRow, "id" | "itemName" | "unitType"> | null>(null);
  const [stockSearch, setStockSearch] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [reportingRequest, setReportingRequest] = useState<any>(null);
  const stockQuery = useQuery({ queryKey: ["mini-warehouse-stock"], queryFn: getMiniWarehouseStock });
  const requestQuery = useQuery({ queryKey: ["mini-warehouse-requests"], queryFn: getStockRequestItems });
  const catalogQuery = useQuery({ queryKey: ["mini-warehouse-accurate-items"], queryFn: () => getMiniWarehouseCatalog() });
  const stocktakeQuery = useQuery({ queryKey: ["mini-warehouse-stocktake"], queryFn: getMiniWarehouseStocktake });
  const catalog = catalogQuery.data ?? [];
  const stockRows = useMemo(() => {
    const rows = new Map<string, StockRow>();
    for (const balance of stockQuery.data ?? []) {
      rows.set(productKey(balance), balance);
    }
    for (const item of catalogQuery.data ?? []) {
      const key = productKey(item);
      const balance = rows.get(key);
      rows.set(key, {
        accurateDbId: item.accurateDbId,
        accurateId: item.accurateId,
        itemName: item.itemName,
        itemCode: item.itemCode ?? balance?.itemCode ?? null,
        id: balance?.id,
        unitType: (balance?.unitType?.toLowerCase() === "unit" ? item.unitType : balance?.unitType) ?? item.unitType,
        source: item.source,
        quantity: balance?.quantity ?? null,
        reservedQuantity: balance?.reservedQuantity ?? 0,
        availableQuantity: balance?.availableQuantity ?? 0,
      });
    }
    return Array.from(rows.values()).sort((a, b) => a.itemName.localeCompare(b.itemName, "id"));
  }, [catalogQuery.data, stockQuery.data]);
  const stockSearchTerm = stockSearch.trim().toLowerCase();
  const visibleStockRows = stockRows.filter((row) =>
    [row.itemName, row.itemCode, row.source].some((value) =>
      value?.toLowerCase().includes(stockSearchTerm),
    ),
  );
  const stocktake = stocktakeQuery.data;
  const locked = Boolean(stocktake?.locked);
  const refreshData = async () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["mini-warehouse-stock"] }),
    queryClient.invalidateQueries({ queryKey: ["mini-warehouse-movements"] }),
    queryClient.invalidateQueries({ queryKey: ["mini-warehouse-request-products"] }),
    queryClient.invalidateQueries({ queryKey: ["mini-warehouse-requests"] }),
    queryClient.invalidateQueries({ queryKey: ["mini-warehouse-stocktake"] }),
  ]);
  const fulfillMutation = useMutation({ mutationFn: (values: any) => fulfillStockRequestItem(selectedRequest.id, values.source, values.quantity), onSuccess: async () => { message.success("Sumber pemenuhan disimpan"); setSelectedRequest(null); await refreshData(); }, onError: (error: any) => message.error(error?.response?.data?.error || "Gagal memproses permintaan") });
  const leftoverMutation = useMutation({ mutationFn: (values: any) => reportStockRequestLeftover(reportingRequest.id, values.leftoverQuantity), onSuccess: async () => { message.success("Sisa bahan dicatat"); setReportingRequest(null); await refreshData(); }, onError: (error: any) => message.error(error?.response?.data?.error || "Gagal mencatat sisa bahan") });
  const cancelMutation = useMutation({ mutationFn: cancelStockRequestItem, onSuccess: async () => { message.success("Permintaan dibatalkan"); await refreshData(); }, onError: (error: any) => message.error(error?.response?.data?.error || "Permintaan tidak dapat dibatalkan") });
  const syncCatalogMutation = useMutation({
    mutationFn: syncMiniWarehouseCatalog,
    onSuccess: async (items) => {
      queryClient.setQueryData(["mini-warehouse-accurate-items"], items);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["mini-warehouse-stock"] }),
        queryClient.invalidateQueries({ queryKey: ["mini-warehouse-request-products"] }),
      ]);
      message.success(`${items.length} barang Non Persediaan dari Accurate tersedia di katalog.`);
    },
    onError: (error: any) => message.error(error?.response?.data?.error || "Gagal menyinkronkan Accurate"),
  });
  const startStocktakeMutation = useMutation({ mutationFn: startMiniWarehouseStocktake, onSuccess: async () => { message.success("Stok opname dimulai. Mutasi stok dikunci."); await refreshData(); }, onError: (error: any) => message.error(error?.response?.data?.error || "Gagal memulai stok opname") });
  const countStocktakeMutation = useMutation({ mutationFn: ({ id, quantity }: any) => countMiniWarehouseStocktakeItem(id, quantity), onSuccess: refreshData, onError: (error: any) => message.error(error?.response?.data?.error || "Gagal menyimpan hasil hitung") });
  const completeStocktakeMutation = useMutation({ mutationFn: completeMiniWarehouseStocktake, onSuccess: async () => { message.success("Stok opname selesai dan saldo disesuaikan"); await refreshData(); }, onError: (error: any) => message.error(error?.response?.data?.error || "Belum semua barang dihitung atau ada stok yang direservasi") });
  const cancelStocktakeMutation = useMutation({ mutationFn: cancelMiniWarehouseStocktake, onSuccess: async () => { message.info("Stok opname dibatalkan tanpa mengubah saldo"); await refreshData(); }, onError: (error: any) => message.error(error?.response?.data?.error || "Gagal membatalkan stok opname") });

  const stockColumns = [
    { title: "Nama barang", dataIndex: "itemName", key: "itemName" },
    { title: "Kode", dataIndex: "itemCode", key: "itemCode", render: (value: string | null) => value || "—" },
    { title: "Satuan", dataIndex: "unitType", key: "unitType", render: (unit: string | null) => unit || "—" },
    {
      title: "Saldo fisik",
      dataIndex: "quantity",
      key: "quantity",
      align: "right" as const,
      render: (quantity: StockRow["quantity"]) => quantity === null
        ? <Typography.Text type="secondary">Belum input stok</Typography.Text>
        : labelQuantity(quantity),
    },
    { title: "Direservasi", dataIndex: "reservedQuantity", key: "reservedQuantity", align: "right" as const, render: labelQuantity },
    { title: "Tersedia", dataIndex: "availableQuantity", key: "availableQuantity", align: "right" as const, render: labelQuantity },
    { title: "Aksi", key: "actions", render: (_: unknown, row: StockRow) => row.id
      ? <Button size="small" onClick={() => setHistoryRow(row)}>Riwayat mutasi</Button>
      : "—" },
  ];
  const requestColumns = [
    { title: "No. DO", dataIndex: "nomorDo", key: "nomorDo" },
    { title: "Tujuan", dataIndex: "tujuan", key: "tujuan" },
    { title: "Barang", dataIndex: "itemName", key: "itemName", render: (value: string | null, row: any) => value || `ID ${row.accurateId}` },
    { title: "Request", key: "request", render: (_: unknown, row: any) => row.request ? <Tag color={row.request.isVerified && !row.request.isRejected ? "green" : row.request.isRejected ? "red" : "orange"}>{row.request.isVerified && !row.request.isRejected ? `Disetujui · #${row.request.shortId}` : row.request.isRejected ? "Ditolak" : "Menunggu persetujuan"}</Tag> : <Tag>Request lama</Tag> },
    { title: "Jumlah", dataIndex: "quantity", key: "quantity", render: (value: string, row: any) => `${labelQuantity(value)} ${row.unitType}` },
    { title: "Sumber", dataIndex: "fulfillmentSource", key: "fulfillmentSource", render: (value: string | null) => value === "mini_warehouse" ? "Mini Warehouse" : value === "purchase" ? "Pembelian" : "—" },
    { title: "Status", dataIndex: "fulfillmentStatus", key: "fulfillmentStatus", render: (value: string) => <Tag color={value === "reported" ? "green" : value === "reserved" ? "blue" : value === "cancelled" ? "default" : "orange"}>{value === "reported" ? "Selesai" : value === "reserved" ? "Menunggu sisa" : value === "cancelled" ? "Dibatalkan" : "Menunggu"}</Tag> },
    { title: "Aksi", key: "actions", render: (_: unknown, row: any) => row.fulfillmentStatus === "pending" ? <Space><Button size="small" disabled={locked || Boolean(row.request && (!row.request.isVerified || row.request.isRejected))} onClick={() => { setSelectedRequest(row); fulfillmentForm.setFieldsValue({ source: row.fulfillmentSource || "mini_warehouse", quantity: Number(row.quantity) }); }}>Penuhi</Button><Button size="small" danger disabled={locked} onClick={() => cancelMutation.mutate(row.id)}>Batalkan</Button></Space> : row.fulfillmentStatus === "reserved" && row.request ? <Typography.Text type="secondary">Selesaikan lewat Send di tab Gudang</Typography.Text> : row.fulfillmentStatus === "reserved" ? <Button size="small" type="primary" disabled={locked} onClick={() => { setReportingRequest(row); leftoverForm.setFieldsValue({ leftoverQuantity: 0 }); }}>Catat sisa</Button> : "—" },
  ];

  return <div style={{ padding: 24, maxWidth: 1440, margin: "0 auto" }}>
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <div><Typography.Title level={3} style={{ marginBottom: 4 }}>Mini Warehouse</Typography.Title><Typography.Text type="secondary">Saldo portal untuk barang Non Persediaan dari Accurate.</Typography.Text></div>
      <Alert type={locked ? "warning" : "info"} showIcon message={locked ? "Stok opname sedang berjalan. Semua mutasi stok dan pemenuhan request dikunci." : "Saldo di halaman ini disimpan di portal dan tidak mengubah stok di Accurate."} />
      <Tabs items={[
        {
          key: "stock",
          label: "Saldo stok",
          children: (
            <Card
              title="Stok Mini Warehouse"
              extra={
                <Space wrap>
                  <Button
                    loading={syncCatalogMutation.isPending}
                    disabled={catalogQuery.isFetching}
                    onClick={() => syncCatalogMutation.mutate()}
                  >
                    Sinkronkan barang Accurate
                  </Button>
                  <Button type="primary" disabled={locked} onClick={() => setStockModalOpen(true)}>
                    Input stok
                  </Button>
                </Space>
              }
            >
              <Space direction="vertical" style={{ width: "100%" }}>
                {catalogQuery.isError && !catalogQuery.data && (
                  <Alert type="error" showIcon message="Katalog barang Accurate belum bisa dimuat." />
                )}
                {stockQuery.isError && !stockQuery.data && (
                  <Alert type="error" showIcon message="Saldo stok belum bisa dimuat." />
                )}
                <Space wrap>
                <Input
                  allowClear
                  aria-label="Cari barang Mini Warehouse"
                  placeholder="Cari nama atau kode barang"
                  value={stockSearch}
                  onChange={(event) => setStockSearch(event.target.value)}
                  style={{ maxWidth: 320 }}
                />
                  <Button onClick={() => setScanOpen(true)}>Scan barcode</Button>
                </Space>
                <Table<StockRow>
                  rowKey={productKey}
                  loading={stockQuery.isLoading || catalogQuery.isLoading}
                  columns={stockColumns}
                  dataSource={stockQuery.data ? visibleStockRows : []}
                  pagination={{ pageSize: 20 }}
                  scroll={{ x: 760 }}
                  locale={{ emptyText: "Barang tidak ditemukan." }}
                />
              </Space>
            </Card>
          ),
        },
        { key: "requests", label: "Permintaan stok", children: <Card title="Permintaan barang" extra={<Typography.Text type="secondary">Request dibuat dari tombol utama “Buat Request”</Typography.Text>}><Table rowKey="id" loading={requestQuery.isLoading} columns={requestColumns as any} dataSource={requestQuery.data || []} pagination={{ pageSize: 20 }} scroll={{ x: 950 }} locale={{ emptyText: "Belum ada permintaan barang Non Persediaan yang terhubung." }} /></Card> },
        { key: "stocktake", label: locked ? "Stok opname · Terkunci" : "Stok opname", children: <Card title="Stok opname Mini Warehouse" extra={locked ? <Space><Button danger loading={cancelStocktakeMutation.isPending} onClick={() => cancelStocktakeMutation.mutate()}>Batalkan tanpa penyesuaian</Button><Button type="primary" danger loading={completeStocktakeMutation.isPending} onClick={() => completeStocktakeMutation.mutate()}>Selesaikan & sesuaikan saldo</Button></Space> : <Button type="primary" onClick={() => startStocktakeMutation.mutate(undefined)}>Mulai stok opname</Button>}>
          <Typography.Paragraph type="secondary">Saat dimulai, saldo dan pemenuhan request dikunci. Hitung fisik tiap barang lalu selesaikan opname untuk mencatat selisih ke ledger.</Typography.Paragraph>
          {locked && <Table rowKey="id" loading={stocktakeQuery.isLoading} dataSource={stocktake?.items || []} pagination={false} columns={[{ title: "Barang", dataIndex: "itemName", render: (_: any, row: any) => row.balance?.itemName || row.itemName || row.balanceId }, { title: "Saldo sistem", dataIndex: "systemQuantity", align: "right" as const, render: labelQuantity }, { title: "Hitung fisik", dataIndex: "countedQuantity", render: (_: any, row: any) => <InputNumber min={0} precision={4} defaultValue={row.countedQuantity == null ? undefined : Number(row.countedQuantity)} onBlur={(event) => { const value = Number((event.target as HTMLInputElement).value); if (Number.isFinite(value) && value >= 0 && value !== Number(row.countedQuantity)) countStocktakeMutation.mutate({ id: row.id, quantity: value }); }} /> }]} scroll={{ x: 650 }} />}
        </Card> },
      ]} />
    </Space>
    {stockModalOpen && (
      <StockInputDialog catalog={catalog} locked={locked} onClose={() => setStockModalOpen(false)} onSave={refreshData} />
    )}
    {historyRow?.id && (
      <StockMovementDialog balanceId={historyRow.id} itemName={historyRow.itemName} unit={historyRow.unitType}
        locked={locked} onClose={() => setHistoryRow(null)} onSave={refreshData} />
    )}
    {scanOpen && (
      <StockScanDialog onClose={() => setScanOpen(false)} onOpenStock={(stock) => {
        setScanOpen(false);
        setHistoryRow(stock);
      }} />
    )}
    <Modal title="Penuhi permintaan" open={Boolean(selectedRequest)} onCancel={() => setSelectedRequest(null)} onOk={() => fulfillmentForm.submit()} confirmLoading={fulfillMutation.isPending} okText="Simpan">
      <Form form={fulfillmentForm} layout="vertical" onFinish={(values) => fulfillMutation.mutate(values)}>
        <Form.Item name="source" label="Sumber barang" rules={[{ required: true }]}><Select options={[{ value: "mini_warehouse", label: "Mini Warehouse" }, { value: "purchase", label: "Pembelian khusus permintaan" }]} /></Form.Item>
        <Form.Item name="quantity" label="Jumlah dikirim" rules={[{ required: true }]}><InputNumber min={0.0001} max={Number(selectedRequest?.quantity || 0)} precision={4} style={{ width: "100%" }} /></Form.Item>
      </Form>
    </Modal>
    <Modal title="Catat sisa bahan" open={Boolean(reportingRequest)} onCancel={() => setReportingRequest(null)} onOk={() => leftoverForm.submit()} confirmLoading={leftoverMutation.isPending} okText="Simpan sisa">
      <Typography.Paragraph>Masukkan sisa dari {labelQuantity(reportingRequest?.reservedQuantity || reportingRequest?.quantity)} {reportingRequest?.unitType}. Pemakaian dihitung otomatis.</Typography.Paragraph>
      <Form form={leftoverForm} layout="vertical" onFinish={(values) => leftoverMutation.mutate(values)}><Form.Item name="leftoverQuantity" label="Sisa bahan" rules={[{ required: true }]}><InputNumber min={0} max={Number(reportingRequest?.reservedQuantity || reportingRequest?.quantity)} precision={4} style={{ width: "100%" }} /></Form.Item></Form>
    </Modal>
  </div>;
}
