import React, { useState, useEffect, useMemo } from "react";
import {
  Modal,
  Form,
  Button,
  message,
  Typography,
  Space,
  Input,
  Table,
  AutoComplete,
  Spin,
  InputNumber,
} from "antd";
import { Package, Search, Scan } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  getOzzySalesOrders,
  getOzzySalesOrderById,
  getOzzyProducts,
  type OzzySalesOrder,
  type OzzyProduct,
  type OzzySalesOrderItem,
} from "@api/ozzy-warehouse";

interface ModalPackingProps {
  open: boolean;
  onClose: () => void;
}

interface PackingItem {
  id: string;
  namaBarang: string;
  sku: string;
  kuantitas: number;
  satuan: string;
  soNumber?: string;
}

interface ValidationItem {
  id: string;
  sesuai: boolean;
  namaBarang: string;
  sku: string;
  kuantitasReal: number;
  kuantitasScan: number;
  satuan: string;
  originalItem: OzzySalesOrderItem;
}

const { Title, Text } = Typography;

const ModalPacking: React.FC<ModalPackingProps> = ({ open, onClose }) => {
  const [form] = Form.useForm();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [soSearchValue, setSOSearchValue] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [packingItems, setPackingItems] = useState<PackingItem[]>([]);
  const [loadingSODetails, setLoadingSODetails] = useState(false);
  const [selectedSalesOrders, setSelectedSalesOrders] = useState<string[]>([]);
  const [showSOValidationModal, setShowSOValidationModal] = useState(false);
  const [currentSOForValidation, setCurrentSOForValidation] = useState<OzzySalesOrder | null>(null);
  const [validationItems, setValidationItems] = useState<ValidationItem[]>([]);

  // Fetch data using React Query
  const { data: salesOrders = [], isLoading: salesOrdersLoading } = useQuery({
    queryKey: ["ozzy-sales-orders"],
    queryFn: () => getOzzySalesOrders(100),
    enabled: open,
  });

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["ozzy-products"],
    queryFn: () => getOzzyProducts(),
    enabled: open,
  });

  // Memoize products to prevent unnecessary re-renders
  const memoizedProducts = useMemo(() => products, [products.length, products.map(p => p.id).join(',')]);

  // Filter sales orders based on search
  const filteredSalesOrders = salesOrders?.filter((so) =>
    so?.soNumber?.toLowerCase().includes(soSearchValue.toLowerCase()) ||
    so?.supplierName?.toLowerCase().includes(soSearchValue.toLowerCase())
  ) || [];

  // Prepare SO options for AutoComplete
  const soOptions = filteredSalesOrders.map((so) => ({
    value: so.soNumber,
    label: `${so.soNumber} - ${so.supplierName || 'Unknown Supplier'}`,
  }));

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      form.resetFields();
      setPackingItems([]);
      setSOSearchValue("");
      setBarcodeInput("");
      setSelectedSalesOrders([]);
      setShowSOValidationModal(false);
      setCurrentSOForValidation(null);
      setValidationItems([]);
    }
  }, [open, form]);

  // Initialize validation items when SO is selected
  const initValidationItems = (soData: OzzySalesOrder) => {
    if (soData?.purchaseOrderItems && memoizedProducts.length > 0) {
      const items: ValidationItem[] = soData.purchaseOrderItems.map((item, index) => {
        const productData = memoizedProducts.find(p => p.id === item.whProductId);
        return {
          id: item.id?.toString() || index.toString(),
          sesuai: false,
          namaBarang: productData?.name || `Product ${item.whProductId}`,
          sku: productData?.sku || `SKU-${item.whProductId}`,
          kuantitasReal: item.quantity || 0,
          kuantitasScan: 0,
          satuan: item.unitType || productData?.unitType || 'Pcs',
          originalItem: item,
        };
      });
      setValidationItems(items);
    } else {
      setValidationItems([]);
    }
  };

  const handleSOSelect = async (soNumber: string) => {
    if (!soNumber) return;
    setLoadingSODetails(true);
    try {
      const soData = await getOzzySalesOrderById(soNumber);
      if (soData && soData.purchaseOrderItems) {
        setCurrentSOForValidation(soData);
        initValidationItems(soData);
        setShowSOValidationModal(true);
        setSOSearchValue("");
      } else {
        message.error("Sales Order tidak ditemukan!");
      }
    } catch (error) {
      console.error("Error fetching SO details:", error);
      message.error("Gagal mengambil detail Sales Order!");
    } finally {
      setLoadingSODetails(false);
    }
  };

  // Update: barcode validation within validation modal, not main modal
  const handleBarcodeValidation = () => {
    if (!barcodeInput.trim()) {
      message.warning("Silakan masukkan barcode atau SKU!");
      return;
    }
    const foundProduct = memoizedProducts.find(
      (p) => p.barcode === barcodeInput.trim() || p.sku === barcodeInput.trim()
    );
    if (foundProduct) {
      setValidationItems(prev => {
        const idx = prev.findIndex(v => v.sku === foundProduct.sku);
        if (idx === -1) {
          message.warning("Produk tidak ada dalam SO ini!");
          return prev;
        }
        const updated = [...prev];
        const target = updated[idx];
        const newScan = (target.kuantitasScan || 0) + 1;
        updated[idx] = { ...target, kuantitasScan: newScan, sesuai: newScan >= (target.kuantitasReal || 0) };
        return updated;
      });
      setBarcodeInput("");
      message.success(`Produk ${foundProduct.name} tervalidasi!`);
    } else {
      message.warning("Produk dengan barcode/SKU tersebut tidak ditemukan!");
    }
  };

  const handleValidationCheckboxChange = (id: string, checked: boolean) => {
    setValidationItems(prev => prev.map(item => item.id === id ? { ...item, sesuai: checked } : item));
  };

  const handleValidationQuantityChange = (id: string, field: 'kuantitasReal' | 'kuantitasScan', value: number) => {
    setValidationItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleConfirmSO = () => {
    if (!currentSOForValidation) return;
    const selected = validationItems.filter(v => v.sesuai || v.kuantitasScan > 0);
    if (selected.length === 0) {
      message.warning("Tidak ada item yang dipilih untuk ditambahkan!");
      return;
    }
    const soNumber = currentSOForValidation.soNumber;
    const newItems: PackingItem[] = selected.map(v => ({
      id: `so-${soNumber}-${v.id}`,
      namaBarang: v.namaBarang,
      sku: v.sku,
      kuantitas: v.kuantitasScan || v.kuantitasReal,
      satuan: v.satuan,
      soNumber,
    }));
    setPackingItems(prev => [...prev, ...newItems]);
    setSelectedSalesOrders(prev => prev.includes(soNumber) ? prev : [...prev, soNumber]);
    setShowSOValidationModal(false);
    setCurrentSOForValidation(null);
    setValidationItems([]);
    message.success(`Item dari SO ${soNumber} berhasil ditambahkan!`);
  };

  const handleRemoveItem = (id: string) => {
    setPackingItems(prev => prev.filter(item => item.id !== id));
    message.success("Item berhasil dihapus!");
  };

  const handleRemoveSalesOrder = (soNumber: string) => {
    setPackingItems(prev => prev.filter(item => item.soNumber !== soNumber));
    setSelectedSalesOrders(prev => prev.filter(so => so !== soNumber));
    message.success(`SO ${soNumber} berhasil dihapus!`);
  };

  const handleQuantityChange = (id: string, newQuantity: number) => {
    setPackingItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, kuantitas: newQuantity } : item
      )
    );
  };

  const handleSubmit = async () => {
    if (packingItems.length === 0) {
      message.warning("Silakan tambahkan minimal satu item untuk packing!");
      return;
    }
    try {
      setIsLoading(true);
      // TODO: Implement packing functionality
      message.success("Packing berhasil disimpan!");
      onClose();
    } catch (error) {
      console.error("Error in packing:", error);
      message.error("Gagal menyimpan packing!");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setPackingItems([]);
    setSOSearchValue("");
    setBarcodeInput("");
    setSelectedSalesOrders([]);
    setShowSOValidationModal(false);
    setCurrentSOForValidation(null);
    setValidationItems([]);
    onClose();
  };

  // Table columns for packing items
  const columns = [
    {
      title: "Nama Barang",
      dataIndex: "namaBarang",
      key: "namaBarang",
      width: 300,
    },
    {
      title: "SKU",
      dataIndex: "sku",
      key: "sku",
      width: 150,
    },
    {
      title: "Kuantitas",
      dataIndex: "kuantitas",
      key: "kuantitas",
      width: 120,
      align: "center" as const,
      render: (value: number, record: PackingItem) => (
        <InputNumber
          min={0}
          value={value}
          onChange={(newValue) => handleQuantityChange(record.id, newValue || 0)}
          className="w-full"
        />
      ),
    },
    {
      title: "Satuan",
      dataIndex: "satuan",
      key: "satuan",
      width: 100,
      align: "center" as const,
    },
    {
      title: "Aksi",
      key: "aksi",
      width: 100,
      align: "center" as const,
      render: (_: any, record: PackingItem) => (
        <Button
          type="link"
          danger
          size="small"
          onClick={() => handleRemoveItem(record.id)}
        >
          Hapus
        </Button>
      ),
    },
  ];

  const validationColumns = [
    {
      title: "Sesuai",
      dataIndex: "sesuai",
      key: "sesuai",
      width: 80,
      align: "center" as const,
      render: (_: boolean, record: ValidationItem) => (
        <input
          type="checkbox"
          checked={record.sesuai}
          onChange={(e) => handleValidationCheckboxChange(record.id, e.target.checked)}
        />
      ),
    },
    {
      title: "Nama Barang",
      dataIndex: "namaBarang",
      key: "namaBarang",
      width: 300,
    },
    {
      title: "SKU",
      dataIndex: "sku",
      key: "sku",
      width: 120,
    },
    {
      title: "Kuantitas Real",
      dataIndex: "kuantitasReal",
      key: "kuantitasReal",
      width: 120,
      align: "center" as const,
      render: (value: number, record: ValidationItem) => (
        <InputNumber
          min={0}
          value={value}
          onChange={(val) => handleValidationQuantityChange(record.id, 'kuantitasReal', val || 0)}
          className="w-full"
        />
      ),
    },
    {
      title: "Kuantitas Scan",
      dataIndex: "kuantitasScan",
      key: "kuantitasScan",
      width: 120,
      align: "center" as const,
      render: (value: number, record: ValidationItem) => (
        <InputNumber
          min={0}
          value={value}
          onChange={(val) => handleValidationQuantityChange(record.id, 'kuantitasScan', val || 0)}
          className="w-full"
        />
      ),
    },
    {
      title: "Satuan",
      dataIndex: "satuan",
      key: "satuan",
      width: 100,
      align: "center" as const,
    },
  ];

  return (
    <>
      <Modal
        title="Cari atau Scan Nomor SO"
        open={open}
        onCancel={handleCancel}
        footer={null}
        width={900}
        destroyOnClose
      >
        <div className="p-4">
          {/* Search/Scan Input Section */}
          <div className="mb-6">
            <div className="flex gap-3 mb-4">
              <AutoComplete
                value={soSearchValue}
                onChange={setSOSearchValue}
                onSelect={handleSOSelect}
                placeholder="Ketik Nomor SO atau Scan Barcode"
                options={soOptions}
                filterOption={false}
                className="flex-1"
                size="large"
                notFoundContent={
                  salesOrdersLoading ? <Spin size="small" /> : 
                  soSearchValue ? "Sales Order tidak ditemukan" : "Ketik untuk mencari..."
                }
              />
            </div>
          </div>

          {/* SO list section */}
          {selectedSalesOrders.length > 0 && (
            <div className="mb-6">
              <Title level={5} className="mb-2">SO</Title>
              {selectedSalesOrders.map((so) => (
                <div key={so} className="grid grid-cols-12 gap-2 items-center bg-gray-50 border rounded p-3 mb-2">
                  <div className="col-span-10">
                    <div className="text-xs text-gray-500">Nomor SO</div>
                    <div className="font-medium">{so}</div>
                  </div>
                  <div className="col-span-2 text-right">
                    <Button danger onClick={() => handleRemoveSalesOrder(so)}>Hapus</Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Detail Item Section */}
          <div className="mb-6">
            <Title level={5} className="mb-4">Detail Item</Title>
            {packingItems.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <Package size={48} className="mx-auto text-gray-400 mb-3" />
                <Text type="secondary" className="text-lg">
                  Tidak ada produk yang dipilih
                </Text>
              </div>
            ) : (
              <Table
                dataSource={packingItems}
                columns={columns}
                rowKey="id"
                pagination={false}
                size="middle"
                className="border rounded-lg"
                scroll={{ x: 800 }}
              />
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end">
            <Space>
              <Button size="large" onClick={handleCancel} disabled={isLoading}>
                Batal
              </Button>
              <Button
                type="primary"
                size="large"
                onClick={handleSubmit}
                loading={isLoading}
                className="bg-green-600 hover:bg-green-700 border-green-600"
                disabled={packingItems.length === 0}
              >
                Simpan
              </Button>
            </Space>
          </div>
        </div>
      </Modal>

      {/* Validation Modal */}
      <Modal
        title="Detail Item"
        open={showSOValidationModal}
        onCancel={() => { setShowSOValidationModal(false); setCurrentSOForValidation(null); setValidationItems([]); }}
        footer={null}
        width={720}
        destroyOnClose
      >
        <div className="p-4">
          <div className="flex gap-3 mb-4">
            <Input
              placeholder="Scan Barcode"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onPressEnter={handleBarcodeValidation}
              size="large"
              prefix={<Scan size={16} />}
            />
            <Button 
              type="primary" 
              size="large"
              onClick={handleBarcodeValidation}
              loading={productsLoading}
              className="bg-yellow-500 hover:bg-yellow-600"
            >
              Validasi
            </Button>
          </div>

          <Table
            dataSource={validationItems}
            columns={validationColumns}
            rowKey="id"
            pagination={false}
            size="small"
            className="border rounded-lg"
          />

          <div className="flex justify-end mt-4">
            <Space>
              <Button onClick={() => { setShowSOValidationModal(false); setCurrentSOForValidation(null); setValidationItems([]); }}>
                Tutup
              </Button>
              <Button type="primary" onClick={handleConfirmSO} className="bg-blue-600 hover:bg-blue-700">
                Tambahkan
              </Button>
            </Space>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default ModalPacking;