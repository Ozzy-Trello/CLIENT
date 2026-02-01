import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Form,
  DatePicker,
  Select,
  Input,
  Button,
  AutoComplete,
  Table,
  Typography,
  Space,
  Divider,
  InputNumber,
  message,
  Spin,
} from "antd";
import { CalendarOutlined, DeleteOutlined } from "@ant-design/icons";
import { ShoppingCart, Camera } from "lucide-react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { useQuery } from "@tanstack/react-query";
import {
  getOzzyBranches,
  getOzzyCustomers,
  getOzzyProducts,
  getOzzySalesOrders,
  getOzzySalesOrderById,
  createOzzyDeliveryOrder,
  type OzzyBranch,
  type OzzyCustomer,
  type OzzyProduct,
  type OzzyPackingData,
  type OzzyPackingItem,
  type CreateDeliveryOrderPayload,
} from "@api/ozzy-warehouse";
import dayjs from "dayjs";
import QRGuideOverlay from "@components/qr-overlay";

interface ModalPengirimanProps {
  open: boolean;
  onClose: () => void;
}

interface SelectedProduct {
  id: string;
  productId: string;
  name: string;
  sku: string;
  quantity: number;
  unitType: string;
  unitPrice?: string;
}

interface SelectedSalesOrder {
  soNumber: string;
  customerName: string;
  shippingAddress: string;
  date: string;
  products: SelectedProduct[];
}

const { Option } = Select;
const { TextArea } = Input;

const ModalPengiriman: React.FC<ModalPengirimanProps> = ({ open, onClose }) => {
  const [form] = Form.useForm();

  // UI and data states
  const [loading, setLoading] = useState(false);
  const [soSearchValue, setSOSearchValue] = useState("");
  const [selectedSalesOrders, setSelectedSalesOrders] = useState<
    SelectedSalesOrder[]
  >([]);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>(
    []
  );
  const [showCameraScanner, setShowCameraScanner] = useState(false);

  // Queries
  const { data: branches = [], isLoading: branchesLoading } = useQuery<
    OzzyBranch[]
  >({
    queryKey: ["ozzy-branches"],
    queryFn: () => getOzzyBranches(),
    enabled: open,
  });

  const { data: customers = [], isLoading: customersLoading } = useQuery<
    OzzyCustomer[]
  >({
    queryKey: ["ozzy-customers", "1880451"],
    queryFn: () => getOzzyCustomers("1880451"),
    enabled: open,
  });

  const { data: products = [], isLoading: productsLoading } = useQuery<
    OzzyProduct[]
  >({
    queryKey: ["ozzy-products"],
    queryFn: () => getOzzyProducts(),
    enabled: open,
  });

  const { data: salesOrders = [], isLoading: salesOrdersLoading } = useQuery<
    OzzyPackingData[]
  >({
    queryKey: ["ozzy-sales-orders", "pengiriman"],
    queryFn: () => getOzzySalesOrders(50, 1),
    enabled: open,
  });

  const memoizedProducts = useMemo(() => products, [products]);

  useEffect(() => {
    if (open) {
      form.resetFields();
      setSOSearchValue("");
      setSelectedSalesOrders([]);
      setSelectedProducts([]);
      setShowCameraScanner(false);
    }
  }, [open, form]);

  const filteredSalesOrders = useMemo(() => {
    if (!salesOrders) return [];

    // If no search value, return all sales orders
    if (!soSearchValue) return salesOrders;

    return salesOrders.filter((so) => {
      const soNumber = so.purchaseOrder?.soNumber || "";
      const supplierName = so.purchaseOrder?.supplierName || "";

      return (
        soNumber.toLowerCase().includes(soSearchValue.toLowerCase()) ||
        supplierName.toLowerCase().includes(soSearchValue.toLowerCase())
      );
    });
  }, [salesOrders, soSearchValue]);

  const soOptions = useMemo(
    () =>
      filteredSalesOrders.map((so) => ({
        value: so?.purchaseOrder?.soNumber || "",
        label: `${so?.purchaseOrder?.soNumber || ""} - ${
          so?.purchaseOrder?.supplierName || ""
        }`,
      })),
    [filteredSalesOrders]
  );

  const mapSOItemsToProducts = (so: OzzyPackingData): SelectedProduct[] => {
    const items: OzzyPackingItem[] = so?.items || [];
    return items.map((item, idx) => {
      const productData = item.product;
      return {
        id: `so_${so.purchaseOrder?.soNumber}_item_${item.id ?? idx}`,
        productId: item.whProductId?.toString() || "",
        name: productData?.name || `Product ${item.whProductId}`,
        sku: productData?.sku || `SKU-${item.whProductId}`,
        quantity: item.quantityPacked || 0,
        unitType: item.unitType || productData?.unitType || "Pcs",
        unitPrice: productData?.unitPrice || "0",
      } as SelectedProduct;
    });
  };

  // Extract SO number from scanned data
  const extractSOFromScan = (scannedData: string): string | null => {
    // Look for SO pattern with dots: SO.2025.10.00105
    const soWithDotsMatch = scannedData.match(/SO\.[\d\.]+/i);
    if (soWithDotsMatch) {
      return soWithDotsMatch[0].toUpperCase();
    }

    // Look for SO pattern: SO followed by numbers (original format)
    const soMatch = scannedData.match(/SO\d+/i);
    if (soMatch) {
      return soMatch[0].toUpperCase();
    }

    // If no SO pattern found, check if the entire string looks like an SO number with dots
    if (/^SO\.[\d\.]+$/i.test(scannedData.trim())) {
      return scannedData.trim().toUpperCase();
    }

    // Check if the entire string looks like an SO number (original format)
    if (/^SO\d+$/i.test(scannedData.trim())) {
      return scannedData.trim().toUpperCase();
    }

    return null;
  };

  const handleSOSelect = async (soNumber: string) => {
    if (selectedSalesOrders.some((s) => s.soNumber === soNumber)) {
      message.info("SO sudah ditambahkan");
      setSOSearchValue("");
      return;
    }

    try {
      setLoading(true);
      const soDetails = await getOzzySalesOrderById(soNumber);
      if (!soDetails) {
        message.error("Sales Order tidak ditemukan!");
        return;
      }

      const productsFromSO = mapSOItemsToProducts(soDetails);

      const newSelectedSO: SelectedSalesOrder = {
        soNumber: soDetails.purchaseOrder.soNumber || "",
        customerName: soDetails.purchaseOrder.supplierName || "",
        shippingAddress: soDetails.purchaseOrder.shippingAddress || "",
        date: soDetails.purchaseOrder.date || "",
        products: productsFromSO,
      };

      setSelectedSalesOrders((prev) => [...prev, newSelectedSO]);
      setSelectedProducts((prev) => [...prev, ...productsFromSO]);

      // Auto-fill form fields from the first selected SO
      if (selectedSalesOrders.length === 0) {
        form.setFieldsValue({
          deliveryDate: dayjs(), // Use today's date instead of SO creation date
          branchId: soDetails.purchaseOrder.whBranchId ?? undefined,
          customerId: soDetails.purchaseOrder.whCustomerId ?? undefined,
          shippingAddress: soDetails.purchaseOrder.shippingAddress,
        });
      }

      message.success("Sales Order berhasil ditambahkan");
    } catch (error) {
      console.error("Error fetching SO details:", error);
      message.error("Gagal mengambil detail Sales Order");
    } finally {
      setSOSearchValue("");
      setLoading(false);
    }
  };

  const handleCameraScan = (scannedData: string) => {
    setShowCameraScanner(false);

    const extractedSO = extractSOFromScan(scannedData);

    if (extractedSO) {
      setSOSearchValue(extractedSO);
      handleSOSelect(extractedSO);
      message.success(`SO berhasil discan: ${extractedSO}`);
    } else {
      message.error("Tidak dapat mengekstrak nomor SO dari data yang discan");
      setSOSearchValue(scannedData); // Still set the raw value for manual correction
    }
  };

  const handleRemoveSalesOrder = (soNumber: string) => {
    setSelectedSalesOrders((prev) =>
      prev.filter((so) => so.soNumber !== soNumber)
    );
    setSelectedProducts((prev) =>
      prev.filter((p) => !p.id.startsWith(`so_${soNumber}_`))
    );
    message.success("Sales Order berhasil dihapus");
  };

  const handleClearAllSO = () => {
    setSelectedSalesOrders([]);
    setSelectedProducts([]);
    message.success("Semua SO telah dibersihkan");
  };

  const handleQuantityChange = (productId: string, value: number) => {
    setSelectedProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, quantity: value || 0 } : p))
    );
    // also update in selectedSalesOrders
    setSelectedSalesOrders((prev) =>
      prev.map((so) => ({
        ...so,
        products: so.products.map((p) =>
          p.id === productId ? { ...p, quantity: value || 0 } : p
        ),
      }))
    );
  };

  const handleRemoveItem = (productId: string) => {
    setSelectedProducts((prev) => prev.filter((p) => p.id !== productId));
    setSelectedSalesOrders((prev) =>
      prev.map((so) => ({
        ...so,
        products: so.products.filter((p) => p.id !== productId),
      }))
    );
    message.success("Item berhasil dihapus");
  };

  const handleSubmit = async (values: any) => {
    if (selectedSalesOrders.length === 0 && selectedProducts.length === 0) {
      message.warning(
        "Silakan pilih minimal satu Sales Order atau produk untuk dikirim!"
      );
      return;
    }

    if (
      !values.deliveryDate ||
      !values.branchId ||
      !values.customerId ||
      !values.shippingAddress
    ) {
      message.warning("Silakan lengkapi semua field yang wajib diisi!");
      return;
    }

    setLoading(true);
    try {
      const soNumbers = selectedSalesOrders.map((so) => so.soNumber);
      const productQuantities = selectedProducts.map((p) => ({
        productId: p.productId,
        quantity: p.quantity,
      }));

      const payload: CreateDeliveryOrderPayload = {
        deliveryDate: dayjs(values.deliveryDate).format("YYYY-MM-DD"),
        branchId: Number(values.branchId),
        customerId: Number(values.customerId),
        shippingAddress: values.shippingAddress,
        note: values.note || null,
        soNumbers,
        productQuantities,
      };

      const result = await createOzzyDeliveryOrder(payload);
      if (result) {
        message.success("Delivery Order berhasil dibuat!");
        handleCancel();
      } else {
        message.error("Gagal membuat Delivery Order!");
      }
    } catch (error) {
      console.error("Error creating delivery order:", error);
      message.error("Gagal membuat Delivery Order!");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setSOSearchValue("");
    setSelectedSalesOrders([]);
    setSelectedProducts([]);
    onClose();
  };

  return (
    <>
      <Modal
        title={
          <div className="flex items-center gap-2">
            <ShoppingCart size={20} className="text-blue-600" />
            <span>Pengiriman</span>
          </div>
        }
        open={open}
        onCancel={handleCancel}
        footer={null}
        width={900}
        destroyOnHidden
      >
        <div style={{ padding: "1rem" }}>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            className="mt-2"
          >
            {/* Pilih Sales Order */}
            <div className="mb-6">
              <Typography.Title level={5}>Pilih Sales Order</Typography.Title>
              <Form.Item label="Cari atau Scan Nomor SO">
                <div className="flex gap-2">
                  <AutoComplete
                    value={soSearchValue}
                    onChange={setSOSearchValue}
                    onSelect={handleSOSelect}
                    placeholder="Ketik nomor SO atau nama customer..."
                    options={soOptions}
                    filterOption={false}
                    notFoundContent={
                      salesOrdersLoading ? (
                        <Spin size="small" />
                      ) : (
                        "Sales Order tidak ditemukan"
                      )
                    }
                    className="flex-1"
                  />
                  <Button
                    type="default"
                    icon={<Camera size={16} />}
                    onClick={() => setShowCameraScanner(true)}
                    className="flex items-center gap-2"
                  >
                    Scan QR
                  </Button>
                </div>
              </Form.Item>

              {/* List SO */}
              {selectedSalesOrders.length > 0 && (
                <div className="mb-2">
                  <Typography.Title level={5}>List SO</Typography.Title>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex flex-wrap gap-2">
                      {selectedSalesOrders.map((so) => (
                        <div
                          key={so.soNumber}
                          className="flex items-center gap-1 bg-blue-100 px-3 py-1 rounded"
                        >
                          <span className="text-blue-700 font-medium">
                            {so.soNumber}
                          </span>
                          <Button
                            type="text"
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            className="h-auto p-0 ml-1"
                            onClick={() => handleRemoveSalesOrder(so.soNumber)}
                          />
                        </div>
                      ))}
                    </div>
                    <Button
                      onClick={handleClearAllSO}
                      size="small"
                      danger
                      className="ml-auto"
                    >
                      Bersihkan Semua
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <Divider>Detail Pengiriman</Divider>

            {/* Grid fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Form.Item
                name="deliveryDate"
                label="Tanggal"
                rules={[
                  {
                    required: true,
                    message: "Tanggal pengiriman harus diisi!",
                  },
                ]}
              >
                <DatePicker
                  className="w-full"
                  placeholder="Pilih tanggal pengiriman"
                  format="DD/MM/YYYY"
                  suffixIcon={<CalendarOutlined />}
                />
              </Form.Item>

              <Form.Item
                name="branchId"
                label="Cabang"
                rules={[{ required: true, message: "Cabang harus dipilih!" }]}
              >
                <Select
                  placeholder="Pilih Cabang"
                  allowClear
                  loading={branchesLoading}
                  showSearch
                  filterOption={(input, option) =>
                    String(option?.label ?? option?.value ?? "")
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                >
                  {branches.map((branch) => (
                    <Option
                      key={branch?.id}
                      value={branch?.whBranchId ?? branch?.id}
                    >
                      {branch?.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Form.Item
                name="customerId"
                label="Kirim ke"
                rules={[{ required: true, message: "Customer harus dipilih!" }]}
              >
                <Select
                  placeholder="Pilih Customer"
                  allowClear
                  loading={customersLoading}
                  showSearch
                >
                  {customers.map((c) => (
                    <Option key={c.id} value={c.id}>
                      {c.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="shippingAddress"
                label="Alamat Pengiriman"
                rules={[
                  { required: true, message: "Alamat pengiriman harus diisi!" },
                ]}
              >
                <Input placeholder="Masukkan alamat pengiriman" />
              </Form.Item>
            </div>

            <Form.Item name="note" label="Keterangan">
              <TextArea
                rows={2}
                placeholder="Masukkan catatan tambahan (opsional)..."
                maxLength={500}
                showCount
              />
            </Form.Item>

            {/* Detail Item */}
            <div className="mb-6">
              <Typography.Title level={5}>Detail Item</Typography.Title>
              <Table
                dataSource={selectedProducts}
                rowKey="id"
                pagination={false}
                size="small"
                locale={{ emptyText: "Tidak ada produk yang dipilih" }}
                columns={[
                  {
                    title: "Nama Barang",
                    dataIndex: "name",
                    key: "name",
                  },
                  {
                    title: "SKU",
                    dataIndex: "sku",
                    key: "sku",
                    width: 140,
                  },
                  {
                    title: "Kuantitas",
                    dataIndex: "quantity",
                    key: "quantity",
                    width: 120,
                    align: "center",
                    render: (text: number, record: SelectedProduct) => (
                      <InputNumber
                        min={0}
                        value={record.quantity}
                        onChange={(val) =>
                          handleQuantityChange(record.id, Number(val))
                        }
                      />
                    ),
                  },
                  {
                    title: "Satuan",
                    dataIndex: "unitType",
                    key: "unitType",
                    width: 100,
                    align: "center",
                  },
                  {
                    title: "Aksi",
                    key: "action",
                    width: 60,
                    render: (_: any, record: SelectedProduct) => (
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

            {/* Footer */}
            <Form.Item className="mb-0 flex justify-end">
              <Space>
                <Button onClick={handleCancel} disabled={loading}>
                  Kembali
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Simpan
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </div>
      </Modal>

      {/* Camera Scanner Modal */}
      <Modal
        title="Scan QR Code untuk SO"
        open={showCameraScanner}
        onCancel={() => setShowCameraScanner(false)}
        footer={[
          <Button key="cancel" onClick={() => setShowCameraScanner(false)}>
            Cancel
          </Button>,
        ]}
        width={400}
        centered
        zIndex={2000}
        styles={{
          mask: { zIndex: 1999 },
        }}
      >
        <div className="flex flex-col items-center">
          <div className="w-full max-w-sm">
            <div className="relative w-full h-[320px]">
              <Scanner
                onScan={(result) => {
                  if (result && result.length > 0) {
                    handleCameraScan(result[0].rawValue);
                  }
                }}
                onError={(error) => {
                  console.error("Scanner error:", error);
                  message.error("Camera scanning failed. Please try again.");
                }}
                styles={{
                  container: { width: "100%", height: "100%" },
                  video: { width: "100%", height: "100%" },
                }}
              />
              <QRGuideOverlay imageClassName="h-24 w-auto max-w-[140px] opacity-70" />
            </div>
          </div>
          <Typography.Text type="secondary" className="mt-4 text-center">
            Position the QR code within the camera frame
          </Typography.Text>
        </div>
      </Modal>
    </>
  );
};

export default ModalPengiriman;
