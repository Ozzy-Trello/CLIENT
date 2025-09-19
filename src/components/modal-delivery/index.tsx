import React, { useState } from "react";
import {
  Modal,
  Form,
  DatePicker,
  Select,
  Input,
  Button,
  AutoComplete,
  message,
  Table,
  Typography,
  Space,
} from "antd";
import { CalendarOutlined, TruckOutlined, DeleteOutlined } from "@ant-design/icons";

interface ModalDeliveryProps {
  open: boolean;
  onClose: () => void;
}

interface SOItem {
  id: string;
  sku: string;
  namaBarang: string;
  kuantitasReal: number;
  kuantitasScan: number;
  satuan: string;
  aksi?: string;
}

interface ValidationModalData {
  soNumber: string;
  items: SOItem[];
}

const { Option } = Select;
const { TextArea } = Input;

const ModalDelivery: React.FC<ModalDeliveryProps> = ({ open, onClose }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [soSearchValue, setSOSearchValue] = useState("");
  const [validationModalOpen, setValidationModalOpen] = useState(false);
  const [currentValidationData, setCurrentValidationData] = useState<ValidationModalData | null>(null);
  const [selectedItems, setSelectedItems] = useState<SOItem[]>([]);

  // Mock data for dropdowns - replace with actual data later
  const cabangOptions = [
    { value: "jakarta", label: "Jakarta" },
    { value: "bandung", label: "Bandung" },
    { value: "surabaya", label: "Surabaya" },
    { value: "medan", label: "Medan" },
    { value: "semarang", label: "Semarang" },
  ];

  const kirimKeOptions = [
    { value: "customer", label: "Customer" },
    { value: "warehouse", label: "Warehouse" },
    { value: "distributor", label: "Distributor" },
    { value: "retail", label: "Retail Store" },
  ];

  // Mock SO data for autocomplete - replace with actual API call later
  const soOptions = [
    { value: "SO-2024-001", label: "SO-2024-001 - Order Kaos Polo" },
    { value: "SO-2024-002", label: "SO-2024-002 - Order Kemeja Formal" },
    { value: "SO-2024-003", label: "SO-2024-003 - Order Jaket Denim" },
    { value: "SO-2024-004", label: "SO-2024-004 - Order Celana Chino" },
  ].filter((option) =>
    option.label.toLowerCase().includes(soSearchValue.toLowerCase())
  );

  // Mock SO item data - replace with actual API call later
  const mockSOData: Record<string, ValidationModalData> = {
    "SO-2024-001": {
      soNumber: "SO-2024-001",
      items: [
        {
          id: "1",
          sku: "M-CT-20XL",
          namaBarang: "Makloon Comfy T-Shirt Biru Benihur 24x, XL",
          kuantitasReal: 12,
          kuantitasScan: 0,
          satuan: "Pcs",
        },
      ],
    },
    "SO-2024-002": {
      soNumber: "SO-2024-002",
      items: [
        {
          id: "2",
          sku: "KF-001",
          namaBarang: "Kemeja Formal Putih Size M",
          kuantitasReal: 8,
          kuantitasScan: 0,
          satuan: "Pcs",
        },
      ],
    },
  };

  const handleSubmit = async (values: any) => {
    if (selectedItems.length === 0) {
      message.warning("Silakan pilih minimal satu item untuk dikirim!");
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement actual submission logic here
      const submissionData = {
        ...values,
        items: selectedItems,
        totalItems: selectedItems.length,
      };
      console.log("Delivery form values:", submissionData);
      message.success("Data pengiriman berhasil disimpan!");
      form.resetFields();
      setSelectedItems([]);
      setSOSearchValue("");
      onClose();
    } catch (error) {
      message.error("Gagal menyimpan data pengiriman!");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setSOSearchValue("");
    setSelectedItems([]);
    onClose();
  };

  const handleSOSelect = (value: string) => {
    const soData = mockSOData[value];
    if (soData) {
      setCurrentValidationData(soData);
      setValidationModalOpen(true);
    } else {
      message.error("Data SO tidak ditemukan!");
    }
  };

  const handleValidationSubmit = () => {
    if (currentValidationData) {
      // Add validated items to the selected items list
      const newItems = currentValidationData.items.map(item => ({
        ...item,
        kuantitasScan: item.kuantitasReal, // For demo, set scan quantity equal to real quantity
      }));
      
      setSelectedItems(prev => [...prev, ...newItems]);
      setValidationModalOpen(false);
      setCurrentValidationData(null);
      message.success("Item berhasil ditambahkan!");
    }
  };

  const handleRemoveItem = (itemId: string) => {
    setSelectedItems(prev => prev.filter(item => item.id !== itemId));
    message.success("Item berhasil dihapus!");
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <TruckOutlined className="text-blue-500" />
          <span>Form Pengiriman</span>
        </div>
      }
      open={open}
      onCancel={handleCancel}
      footer={null}
      width={600}
      destroyOnClose
    >
      <div style={{ padding: "1rem" }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          className="mt-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tanggal - Required */}
            <Form.Item
              name="tanggal"
              label="Tanggal"
              rules={[{ required: true, message: "Tanggal harus diisi!" }]}
            >
              <DatePicker
                className="w-full"
                placeholder="Pilih tanggal"
                format="DD/MM/YYYY"
                suffixIcon={<CalendarOutlined />}
              />
            </Form.Item>

            {/* Cabang - Dropdown */}
            <Form.Item name="cabang" label="Cabang">
              <Select placeholder="Pilih Cabang" allowClear>
                {cabangOptions.map((option) => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </div>

          {/* Kirim ke - Required Dropdown */}
          <Form.Item
            name="kirimKe"
            label="Kirim ke"
            rules={[
              { required: true, message: "Tujuan pengiriman harus dipilih!" },
            ]}
          >
            <Select placeholder="Pilih tujuan pengiriman" allowClear>
              {kirimKeOptions.map((option) => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {/* Keterangan - Text Area */}
          <Form.Item name="keterangan" label="Keterangan">
            <TextArea
              rows={3}
              placeholder="Masukkan catatan atau keterangan tambahan..."
              maxLength={500}
              showCount
            />
          </Form.Item>

          {/* Alamat Pengiriman - Required Text Area */}
          <Form.Item
            name="alamatPengiriman"
            label="Alamat Pengiriman"
            rules={[
              { required: true, message: "Alamat pengiriman harus diisi!" },
            ]}
          >
            <TextArea
              rows={4}
              placeholder="Masukkan alamat lengkap pengiriman..."
              maxLength={1000}
              showCount
            />
          </Form.Item>

          {/* Cari atau Scan Nomor SO - AutoComplete */}
          <Form.Item name="nomorSO" label="Cari atau Scan Nomor SO">
            <AutoComplete
              value={soSearchValue}
              onChange={setSOSearchValue}
              onSelect={handleSOSelect}
              placeholder="Ketik nomor SO atau scan barcode..."
              options={soOptions}
              filterOption={false}
              notFoundContent={
                soSearchValue
                  ? "Nomor SO tidak ditemukan"
                  : "Ketik untuk mencari..."
              }
            />
          </Form.Item>

          {/* Selected Items Table */}
          {selectedItems.length > 0 && (
            <div className="mt-6">
              <Typography.Title level={5}>Detail Item</Typography.Title>
              <Table
                dataSource={selectedItems}
                rowKey="id"
                pagination={false}
                size="small"
                columns={[
                  {
                    title: "Nama Barang",
                    dataIndex: "namaBarang",
                    key: "namaBarang",
                  },
                  {
                    title: "SKU",
                    dataIndex: "sku",
                    key: "sku",
                  },
                  {
                    title: "Kuantitas Real",
                    dataIndex: "kuantitasReal",
                    key: "kuantitasReal",
                    align: "center",
                  },
                  {
                    title: "Kuantitas Scan",
                    dataIndex: "kuantitasScan",
                    key: "kuantitasScan",
                    align: "center",
                  },
                  {
                    title: "Satuan",
                    dataIndex: "satuan",
                    key: "satuan",
                    align: "center",
                  },
                  {
                    title: "Aksi",
                    key: "aksi",
                    align: "center",
                    render: (_, record) => (
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => handleRemoveItem(record.id)}
                      />
                    ),
                  },
                ]}
              />
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end gap-2 mt-6">
            <Button onClick={handleCancel}>Batal</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              icon={<TruckOutlined />}
            >
              Simpan Pengiriman
            </Button>
          </div>
        </Form>
      </div>

      {/* Validation Modal */}
      <Modal
        title="Detail Item"
        open={validationModalOpen}
        onCancel={() => setValidationModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setValidationModalOpen(false)}>
            Tutup
          </Button>,
          <Button key="add" type="primary" onClick={handleValidationSubmit}>
            Tambahkan
          </Button>,
        ]}
        width={800}
      >
        {currentValidationData && (
          <div>
            <Typography.Text strong>
              Scan Barcode Produk (Lusin/Pcs)
            </Typography.Text>
            <div className="mt-4">
              <Input
                placeholder="Scan Barcode"
                suffix={<span className="text-orange-500">Validasi</span>}
                className="mb-4"
              />
              <Table
                dataSource={currentValidationData.items}
                rowKey="id"
                pagination={false}
                size="small"
                columns={[
                  {
                    title: "Sesuai",
                    key: "sesuai",
                    width: 60,
                    render: () => (
                      <input type="checkbox" className="w-4 h-4" />
                    ),
                  },
                  {
                    title: "Nama Barang",
                    dataIndex: "namaBarang",
                    key: "namaBarang",
                  },
                  {
                    title: "SKU",
                    dataIndex: "sku",
                    key: "sku",
                  },
                  {
                    title: "Kuantitas Real",
                    dataIndex: "kuantitasReal",
                    key: "kuantitasReal",
                    align: "center",
                  },
                  {
                    title: "Kuantitas Scan",
                    dataIndex: "kuantitasScan",
                    key: "kuantitasScan",
                    align: "center",
                  },
                  {
                    title: "Satuan",
                    dataIndex: "satuan",
                    key: "satuan",
                    align: "center",
                  },
                ]}
              />
            </div>
          </div>
        )}
      </Modal>
    </Modal>
  );
};

export default ModalDelivery;
