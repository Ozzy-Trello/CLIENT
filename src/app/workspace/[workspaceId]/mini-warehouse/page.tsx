"use client";

import { getAllItemList } from "@api/accurate";
import {
  createMiniWarehouseStockRequest,
  cancelStockRequestItem,
  fulfillStockRequestItem,
  getMiniWarehouseStock,
  getStockRequestItems,
  recordMiniWarehouseMovement,
  reportStockRequestLeftover,
} from "@api/mini-warehouse";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Card, Form, Input, InputNumber, message, Modal, Select, Space, Table, Tabs, Tag, Typography } from "antd";
import { useMemo, useState } from "react";

const sourceDbIds: Record<string, number> = { MPI: 1880451, Hikmat: 1880365, KUI: 1954066 };
const labelQuantity = (value: number | string | null | undefined) => Number(value || 0).toLocaleString("id-ID", { maximumFractionDigits: 4 });

export default function MiniWarehousePage() {
  const queryClient = useQueryClient();
  const [stockForm] = Form.useForm();
  const [fulfillmentForm] = Form.useForm();
  const [leftoverForm] = Form.useForm();
  const [requestForm] = Form.useForm();
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [reportingRequest, setReportingRequest] = useState<any>(null);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const stockQuery = useQuery({ queryKey: ["mini-warehouse-stock"], queryFn: getMiniWarehouseStock });
  const requestQuery = useQuery({ queryKey: ["mini-warehouse-requests"], queryFn: getStockRequestItems });
  const catalogQuery = useQuery({ queryKey: ["mini-warehouse-accurate-items"], queryFn: getAllItemList });
  const catalog = useMemo(() => {
    const rows = Array.isArray(catalogQuery.data?.data) ? catalogQuery.data.data : [];
    return rows.filter((item: any) => String(item.itemTypeName || "").toLowerCase() === "non persediaan");
  }, [catalogQuery.data]);
  const refreshData = async () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["mini-warehouse-stock"] }),
    queryClient.invalidateQueries({ queryKey: ["mini-warehouse-requests"] }),
  ]);
  const movementMutation = useMutation({ mutationFn: recordMiniWarehouseMovement, onSuccess: async () => { message.success("Saldo stok tersimpan"); setStockModalOpen(false); stockForm.resetFields(); await refreshData(); }, onError: (error: any) => message.error(error?.response?.data?.error || "Gagal menyimpan saldo stok") });
  const requestMutation = useMutation({ mutationFn: createMiniWarehouseStockRequest, onSuccess: async () => { message.success("Permintaan barang dibuat"); setRequestModalOpen(false); requestForm.resetFields(); await refreshData(); }, onError: (error: any) => message.error(error?.response?.data?.error || "Gagal membuat permintaan") });
  const fulfillMutation = useMutation({ mutationFn: (values: any) => fulfillStockRequestItem(selectedRequest.id, values.source, values.quantity), onSuccess: async () => { message.success("Sumber pemenuhan disimpan"); setSelectedRequest(null); await refreshData(); }, onError: (error: any) => message.error(error?.response?.data?.error || "Gagal memproses permintaan") });
  const leftoverMutation = useMutation({ mutationFn: (values: any) => reportStockRequestLeftover(reportingRequest.id, values.leftoverQuantity), onSuccess: async () => { message.success("Sisa bahan dicatat"); setReportingRequest(null); await refreshData(); }, onError: (error: any) => message.error(error?.response?.data?.error || "Gagal mencatat sisa bahan") });
  const cancelMutation = useMutation({ mutationFn: cancelStockRequestItem, onSuccess: async () => { message.success("Permintaan dibatalkan"); await refreshData(); }, onError: (error: any) => message.error(error?.response?.data?.error || "Permintaan tidak dapat dibatalkan") });

  const stockColumns = [
    { title: "Nama barang", dataIndex: "itemName", key: "itemName" },
    { title: "Kode", dataIndex: "itemCode", key: "itemCode", render: (value: string | null) => value || "—" },
    { title: "Unit", dataIndex: "unitType", key: "unitType" },
    { title: "Saldo fisik", dataIndex: "quantity", key: "quantity", align: "right" as const, render: labelQuantity },
    { title: "Direservasi", dataIndex: "reservedQuantity", key: "reservedQuantity", align: "right" as const, render: labelQuantity },
    { title: "Tersedia", dataIndex: "availableQuantity", key: "availableQuantity", align: "right" as const, render: labelQuantity },
  ];
  const requestColumns = [
    { title: "No. DO", dataIndex: "nomorDo", key: "nomorDo" },
    { title: "Tujuan", dataIndex: "tujuan", key: "tujuan" },
    { title: "Barang", dataIndex: "itemName", key: "itemName", render: (value: string | null, row: any) => value || `ID ${row.accurateId}` },
    { title: "Jumlah", dataIndex: "quantity", key: "quantity", render: (value: string, row: any) => `${labelQuantity(value)} ${row.unitType}` },
    { title: "Sumber", dataIndex: "fulfillmentSource", key: "fulfillmentSource", render: (value: string | null) => value === "mini_warehouse" ? "Mini Warehouse" : value === "purchase" ? "Pembelian" : "—" },
    { title: "Status", dataIndex: "fulfillmentStatus", key: "fulfillmentStatus", render: (value: string) => <Tag color={value === "reported" ? "green" : value === "reserved" ? "blue" : value === "cancelled" ? "default" : "orange"}>{value === "reported" ? "Selesai" : value === "reserved" ? "Menunggu sisa" : value === "cancelled" ? "Dibatalkan" : "Menunggu"}</Tag> },
    { title: "Aksi", key: "actions", render: (_: unknown, row: any) => row.fulfillmentStatus === "pending" ? <Space><Button size="small" onClick={() => { setSelectedRequest(row); fulfillmentForm.setFieldsValue({ source: "mini_warehouse", quantity: Number(row.quantity) }); }}>Penuhi</Button><Button size="small" danger onClick={() => cancelMutation.mutate(row.id)}>Batalkan</Button></Space> : row.fulfillmentStatus === "reserved" ? <Button size="small" type="primary" onClick={() => { setReportingRequest(row); leftoverForm.setFieldsValue({ leftoverQuantity: 0 }); }}>Catat sisa</Button> : "—" },
  ];

  return <div style={{ padding: 24, maxWidth: 1440, margin: "0 auto" }}>
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <div><Typography.Title level={3} style={{ marginBottom: 4 }}>Mini Warehouse</Typography.Title><Typography.Text type="secondary">Saldo portal untuk barang Non Persediaan dari Accurate.</Typography.Text></div>
      <Alert type="info" showIcon message="Saldo di halaman ini disimpan di portal dan tidak mengubah stok di Accurate." />
      <Tabs items={[
        { key: "stock", label: "Saldo stok", children: <Card title="Stok Mini Warehouse" extra={<Button type="primary" onClick={() => { stockForm.resetFields(); setStockModalOpen(true); }}>Input stok</Button>}><Table rowKey={(row: any) => `${row.accurateDbId}:${row.accurateId}`} loading={stockQuery.isLoading} columns={stockColumns as any} dataSource={stockQuery.data || []} pagination={{ pageSize: 20 }} scroll={{ x: 760 }} /></Card> },
        { key: "requests", label: "Permintaan stok", children: <Card title="Permintaan barang" extra={<Button type="primary" onClick={() => { requestForm.resetFields(); requestForm.setFieldsValue({ items: [{}] }); setRequestModalOpen(true); }}>Buat permintaan</Button>}><Table rowKey="id" loading={requestQuery.isLoading} columns={requestColumns as any} dataSource={requestQuery.data || []} pagination={{ pageSize: 20 }} scroll={{ x: 950 }} locale={{ emptyText: "Belum ada permintaan dengan baris barang. Permintaan lama tetap dapat diproses melalui alur sebelumnya." }} /></Card> },
      ]} />
    </Space>
    <Modal title="Input saldo stok" open={stockModalOpen} onCancel={() => setStockModalOpen(false)} onOk={() => stockForm.submit()} confirmLoading={movementMutation.isPending} okText="Simpan saldo">
      <Form form={stockForm} layout="vertical" onFinish={(values) => {
        const item = catalog.find((entry: any) => `${sourceDbIds[entry.source]}:${entry.id}` === values.productKey);
        if (!item) return message.error("Pilih barang Accurate yang valid");
        movementMutation.mutate({ accurateDbId: sourceDbIds[item.source], accurateId: Number(item.id), itemName: item.name, itemCode: item.no || undefined, unitType: item.itemUnit?.name || item.satuan || "unit", quantity: values.quantity, movementType: values.movementType, note: values.note });
      }}>
        <Form.Item name="productKey" label="Barang Accurate · Non Persediaan" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" loading={catalogQuery.isLoading} options={catalog.map((item: any) => ({ value: `${sourceDbIds[item.source]}:${item.id}`, label: `${item.no || "Tanpa kode"} · ${item.name} (${item.source})`, disabled: !sourceDbIds[item.source] }))} /></Form.Item>
        <Form.Item name="movementType" label="Jenis input" initialValue="opening" rules={[{ required: true }]}><Select options={[{ value: "opening", label: "Stok awal" }, { value: "addition", label: "Penambahan stok" }]} /></Form.Item>
        <Form.Item name="quantity" label="Jumlah" rules={[{ required: true }]}><InputNumber min={0.0001} precision={4} style={{ width: "100%" }} /></Form.Item>
        <Form.Item name="note" label="Catatan"><Input maxLength={500} /></Form.Item>
      </Form>
    </Modal>
    <Modal title="Buat permintaan stok" open={requestModalOpen} onCancel={() => setRequestModalOpen(false)} onOk={() => requestForm.submit()} confirmLoading={requestMutation.isPending} okText="Kirim permintaan" width={720}>
      <Form form={requestForm} layout="vertical" onFinish={(values) => {
        const items = (values.items || []).map((row: any) => {
          const item = catalog.find((entry: any) => `${sourceDbIds[entry.source]}:${entry.id}` === row.productKey);
          return item ? { accurateDbId: sourceDbIds[item.source], accurateId: Number(item.id), itemName: item.name, itemCode: item.no || undefined, quantity: row.quantity, unitType: row.unitType || item.itemUnit?.name || item.satuan || "unit" } : null;
        }).filter(Boolean);
        requestMutation.mutate({ nomorDo: values.nomorDo, asal: values.asal, tujuan: values.tujuan, description: values.description, items });
      }}>
        <Space style={{ width: "100%" }} align="start">
          <Form.Item name="nomorDo" label="Nomor DO" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="asal" label="Asal" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="tujuan" label="Tujuan" rules={[{ required: true }]}><Input /></Form.Item>
        </Space>
        <Form.Item name="description" label="Keterangan"><Input /></Form.Item>
        <Form.List name="items" rules={[{ validator: async (_, items) => { if (!items?.length) throw new Error("Tambahkan minimal satu barang"); } }]}>
          {(fields, { add, remove }, { errors }) => <Space direction="vertical" style={{ width: "100%" }}>
            {fields.map((field) => <Space key={field.key} align="start" style={{ display: "flex" }}>
              <Form.Item name={[field.name, "productKey"]} label="Barang" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" loading={catalogQuery.isLoading} style={{ width: 330 }} options={catalog.map((item: any) => ({ value: `${sourceDbIds[item.source]}:${item.id}`, label: `${item.no || "Tanpa kode"} · ${item.name} (${item.source})`, disabled: !sourceDbIds[item.source] }))} /></Form.Item>
              <Form.Item name={[field.name, "quantity"]} label="Jumlah" rules={[{ required: true }]}><InputNumber min={0.0001} precision={4} /></Form.Item>
              <Button danger type="text" onClick={() => remove(field.name)}>Hapus</Button>
            </Space>)}
            <Button onClick={() => add({})}>Tambah barang</Button><Form.ErrorList errors={errors} />
          </Space>}
        </Form.List>
      </Form>
    </Modal>
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
