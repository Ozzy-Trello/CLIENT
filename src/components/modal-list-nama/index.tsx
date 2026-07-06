import React, { useState, useRef, useCallback } from "react";
import { Modal, Button, Table, Input, Space, Popconfirm, message, Tag, Row, Col, Divider } from "antd";
import { DeleteOutlined, PlusOutlined, UploadOutlined, DownloadOutlined, PrinterOutlined, EditOutlined, CheckOutlined, CloseOutlined } from "@ant-design/icons";
import * as XLSX from "xlsx";
import {
  useListNama,
  useListNamaSummary,
  useCreateListNama,
  useBulkImportListNama,
  useUpdateListNama,
  useDeleteListNama,
} from "../../hooks/useListNama";
import { ListNama } from "../../api/card-list-nama";

interface ModalListNamaProps {
  open: boolean;
  onClose: () => void;
  card: any;
}

const ModalListNama: React.FC<ModalListNamaProps> = ({ open, onClose, card }) => {
  const cardId = card?.id;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { listNama, isLoading } = useListNama(cardId ?? "");
  const { summary } = useListNamaSummary(cardId ?? "");
  const createMutation = useCreateListNama(cardId ?? "");
  const bulkMutation = useBulkImportListNama(cardId ?? "");
  const updateMutation = useUpdateListNama(cardId ?? "");
  const deleteMutation = useDeleteListNama(cardId ?? "");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ nama: string; ukuran: string; jenisLengan: string; catatan: string }>({ nama: "", ukuran: "", jenisLengan: "", catatan: "" });

  const [addNama, setAddNama] = useState("");
  const [addUkuran, setAddUkuran] = useState("");
  const [addJenisLengan, setAddJenisLengan] = useState("");
  const [addCatatan, setAddCatatan] = useState("");

  const resetAddForm = () => {
    setAddNama("");
    setAddUkuran("");
    setAddJenisLengan("");
    setAddCatatan("");
  };

  const handleAdd = async () => {
    const nama = addNama.trim();
    const ukuran = addUkuran.trim();
    if (!nama || !ukuran) {
      message.warning("Nama dan Ukuran wajib diisi");
      return;
    }
    try {
      await createMutation.mutateAsync({
        nama,
        ukuran,
        jenisLengan: addJenisLengan.trim() || null,
        catatan: addCatatan.trim() || null,
        order: listNama.length,
      });
      resetAddForm();
      message.success("Berhasil ditambahkan");
    } catch (err) {
      message.error("Gagal menambahkan data");
    }
  };

  const startEdit = (record: ListNama) => {
    setEditingId(record.id);
    setEditValues({
      nama: record.nama,
      ukuran: record.ukuran,
      jenisLengan: record.jenisLengan ?? "",
      catatan: record.catatan ?? "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const nama = editValues.nama.trim();
    const ukuran = editValues.ukuran.trim();
    if (!nama || !ukuran) {
      message.warning("Nama dan Ukuran wajib diisi");
      return;
    }
    try {
      await updateMutation.mutateAsync({
        id: editingId,
        data: {
          nama,
          ukuran,
          jenisLengan: editValues.jenisLengan.trim() || null,
          catatan: editValues.catatan.trim() || null,
        },
      });
      setEditingId(null);
      message.success("Berhasil diupdate");
    } catch {
      message.error("Gagal mengupdate data");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      message.success("Berhasil dihapus");
    } catch {
      message.error("Gagal menghapus data");
    }
  };

  const handleImport = useCallback(
    async (file: File) => {
      try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);

        const rows = jsonData
          .map((row: any) => ({
            nama: (row.nama ?? row.Nama ?? "").toString().trim(),
            ukuran: (row.ukuran ?? row.Ukuran ?? "").toString().trim(),
            jenisLengan: (row["jenis lengan"] ?? row["Jenis Lengan"] ?? row.jenisLengan ?? "").toString().trim() || null,
            catatan: (row.catatan ?? row.Catatan ?? "").toString().trim() || null,
          }))
          .filter((r) => r.nama && r.ukuran);

        if (rows.length === 0) {
          message.warning("Tidak ada data valid untuk diimport");
          return;
        }

        await bulkMutation.mutateAsync({ rows });
        message.success(`Berhasil import ${rows.length} data`);
      } catch {
        message.error("Gagal membaca file");
      }
    },
    [bulkMutation]
  );

  const handleExport = useCallback(() => {
    if (listNama.length === 0) {
      message.warning("Tidak ada data untuk diexport");
      return;
    }

    const exportData = listNama.map((item) => ({
      nama: item.nama,
      ukuran: item.ukuran,
      "jenis lengan": item.jenisLengan ?? "",
      catatan: item.catatan ?? "",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "List Nama");
    XLSX.writeFile(wb, `list-nama-${card?.name ?? "card"}.xlsx`);
  }, [listNama, card]);

  const handlePrint = useCallback(() => {
    if (listNama.length === 0) {
      message.warning("Tidak ada data untuk dicetak");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const tableRows = listNama
      .map(
        (item, i) => `
        <tr>
          <td style="border:1px solid #ddd;padding:6px">${i + 1}</td>
          <td style="border:1px solid #ddd;padding:6px">${item.nama}</td>
          <td style="border:1px solid #ddd;padding:6px">${item.ukuran}</td>
          <td style="border:1px solid #ddd;padding:6px">${item.jenisLengan ?? "-"}</td>
          <td style="border:1px solid #ddd;padding:6px">${item.catatan ?? "-"}</td>
        </tr>`
      )
      .join("");

    printWindow.document.write(`
      <html>
        <head><title>List Nama - ${card?.name ?? ""}</title></head>
        <body>
          <h2>List Nama - ${card?.name ?? ""}</h2>
          <table style="border-collapse:collapse;width:100%">
            <thead>
              <tr>
                <th style="border:1px solid #ddd;padding:6px;background:#f5f5f5">No</th>
                <th style="border:1px solid #ddd;padding:6px;background:#f5f5f5">Nama</th>
                <th style="border:1px solid #ddd;padding:6px;background:#f5f5f5">Ukuran</th>
                <th style="border:1px solid #ddd;padding:6px;background:#f5f5f5">Jenis Lengan</th>
                <th style="border:1px solid #ddd;padding:6px;background:#f5f5f5">Catatan</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }, [listNama, card]);

  const columns = [
    {
      title: "No",
      width: 50,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: "Nama",
      dataIndex: "nama",
      key: "nama",
      render: (text: string, record: ListNama) =>
        editingId === record.id ? (
          <Input
            size="small"
            value={editValues.nama}
            onChange={(e) => setEditValues({ ...editValues, nama: e.target.value })}
          />
        ) : (
          text
        ),
    },
    {
      title: "Ukuran",
      dataIndex: "ukuran",
      key: "ukuran",
      width: 90,
      render: (text: string, record: ListNama) =>
        editingId === record.id ? (
          <Input
            size="small"
            value={editValues.ukuran}
            onChange={(e) => setEditValues({ ...editValues, ukuran: e.target.value })}
          />
        ) : (
          text
        ),
    },
    {
      title: "Jenis Lengan",
      dataIndex: "jenisLengan",
      key: "jenisLengan",
      width: 120,
      render: (text: string | null, record: ListNama) =>
        editingId === record.id ? (
          <Input
            size="small"
            value={editValues.jenisLengan}
            onChange={(e) => setEditValues({ ...editValues, jenisLengan: e.target.value })}
          />
        ) : (
          text ?? "-"
        ),
    },
    {
      title: "Catatan",
      dataIndex: "catatan",
      key: "catatan",
      render: (text: string | null, record: ListNama) =>
        editingId === record.id ? (
          <Input
            size="small"
            value={editValues.catatan}
            onChange={(e) => setEditValues({ ...editValues, catatan: e.target.value })}
          />
        ) : (
          text ?? "-"
        ),
    },
    {
      title: "",
      width: 80,
      render: (_: any, record: ListNama) =>
        editingId === record.id ? (
          <Space size={4}>
            <Button size="small" type="primary" icon={<CheckOutlined />} onClick={handleSaveEdit} />
            <Button size="small" icon={<CloseOutlined />} onClick={() => setEditingId(null)} />
          </Space>
        ) : (
          <Space size={4}>
            <Button size="small" icon={<EditOutlined />} onClick={() => startEdit(record)} />
            <Popconfirm title="Hapus item ini?" onConfirm={() => handleDelete(record.id)}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        ),
    },
  ];

  return (
    <Modal
      title={`List Nama - ${card?.name ?? ""}`}
      open={open}
      onCancel={onClose}
      width={900}
      footer={
        <Space>
          <Button onClick={handlePrint} icon={<PrinterOutlined />} disabled={listNama.length === 0}>
            Print
          </Button>
          <Button onClick={() => fileInputRef.current?.click()} icon={<UploadOutlined />}>
            Import XLS
          </Button>
          <Button onClick={handleExport} icon={<DownloadOutlined />} disabled={listNama.length === 0}>
            Export
          </Button>
          <Button onClick={onClose}>Tutup</Button>
        </Space>
      }
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImport(file);
          e.target.value = "";
        }}
      />

      {/* Summary */}
      {summary.length > 0 && (
        <div style={{ marginBottom: 16, padding: "8px 12px", background: "#f0f5ff", borderRadius: 6, border: "1px solid #d6e4ff" }}>
          {summary.map((group, i) => (
            <div key={i} style={{ marginBottom: 2 }}>
              <Tag color="blue" style={{ marginRight: 4 }}>{group.jenisLengan ?? "Umum"}</Tag>
              <span style={{ fontWeight: 600, marginRight: 8 }}>({group.total})</span>
              {group.sizes.map((s) => (
                <span key={s.ukuran} style={{ marginRight: 8, fontSize: 13 }}>
                  {s.ukuran} <strong>{s.count}</strong>
                </span>
              ))}
            </div>
          ))}
          <div style={{ borderTop: "1px solid #d6e4ff", marginTop: 4, paddingTop: 4 }}>
            <Tag color="green" style={{ marginRight: 4 }}>Grand Total</Tag>
            <span style={{ fontWeight: 700, fontSize: 14 }}>{summary.reduce((acc, g) => acc + g.total, 0)}</span>
          </div>
        </div>
      )}

      {/* Add new row form */}
      <div style={{ padding: "12px", border: "1px dashed #d9d9d9", borderRadius: 6, marginBottom: 16, background: "#fafafa" }}>
        <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>Tambah Baru</div>
        <Row gutter={[8, 8]}>
          <Col span={6}>
            <Input
              size="small"
              placeholder="Nama *"
              value={addNama}
              onChange={(e) => setAddNama(e.target.value)}
              onPressEnter={handleAdd}
            />
          </Col>
          <Col span={4}>
            <Input
              size="small"
              placeholder="Ukuran *"
              value={addUkuran}
              onChange={(e) => setAddUkuran(e.target.value)}
              onPressEnter={handleAdd}
            />
          </Col>
          <Col span={5}>
            <Input
              size="small"
              placeholder="Jenis Lengan"
              value={addJenisLengan}
              onChange={(e) => setAddJenisLengan(e.target.value)}
              onPressEnter={handleAdd}
            />
          </Col>
          <Col span={5}>
            <Input
              size="small"
              placeholder="Catatan"
              value={addCatatan}
              onChange={(e) => setAddCatatan(e.target.value)}
              onPressEnter={handleAdd}
            />
          </Col>
          <Col span={4}>
            <Button
              size="small"
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAdd}
              loading={createMutation.isPending}
              block
            >
              Tambah
            </Button>
          </Col>
        </Row>
      </div>

      {/* Table */}
      <Table
        dataSource={listNama}
        columns={columns}
        rowKey="id"
        size="small"
        loading={isLoading}
        pagination={false}
        scroll={{ y: 350 }}
        locale={{ emptyText: "Belum ada data" }}
      />
    </Modal>
  );
};

export default ModalListNama;
