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
import { ShoppingCart } from "lucide-react";
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
  type OzzySalesOrder,
  type OzzySalesOrderItem,
  type CreateDeliveryOrderPayload,
} from "@api/ozzy-warehouse";
import dayjs from "dayjs";

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
  const [selectedSalesOrders, setSelectedSalesOrders] = useState<SelectedSalesOrder[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);

  // Queries
  const { data: branches = [], isLoading: branchesLoading } = useQuery<OzzyBranch[]>({
    queryKey: ["ozzy-branches"],
    queryFn: () => getOzzyBranches(),
    enabled: open,
  });

  const { data: customers = [], isLoading: customersLoading } = useQuery<OzzyCustomer[]>({
    queryKey: ["ozzy-customers"],
    queryFn: () => getOzzyCustomers(),
    enabled: open,
  });

  const { data: products = [], isLoading: productsLoading } = useQuery<OzzyProduct[]>({
    queryKey: ["ozzy-products"],
    queryFn: () => getOzzyProducts(),
    enabled: open,
  });

  const { data: salesOrders = [], isLoading: salesOrdersLoading } = useQuery<OzzySalesOrder[]>({
    queryKey: ["ozzy-sales-orders"],
    queryFn: () => getOzzySalesOrders(100),
    enabled: open,
  });

  const memoizedProducts = useMemo(() => products, [products.length, products.map(p => p.id).join(",")]);

  useEffect(() => {
    if (open) {
      form.resetFields();
      setSOSearchValue("");
      setSelectedSalesOrders([]);
      setSelectedProducts([]);
    }
  }, [open, form]);

  const filteredSalesOrders = (salesOrders || []).filter(
    (so) =>
      so?.soNumber?.toLowerCase().includes(soSearchValue.toLowerCase()) ||
      so?.supplierName?.toLowerCase().includes(soSearchValue.toLowerCase())
  );

  const soOptions = filteredSalesOrders.map((so) => ({
    value: so?.soNumber || "",
    label: `${so?.soNumber || ""} - ${so?.supplierName || ""}`,
  }));

  const mapSOItemsToProducts = (so: OzzySalesOrder): SelectedProduct[] => {
    const items: OzzySalesOrderItem[] = so?.purchaseOrderItems || [];
    return items.map((item, idx) => {
      const productData = memoizedProducts.find((p) => p.id === item.whProductId);
      return {
        id: `so_${so.soNumber}_item_${item.id ?? idx}`,
        productId: item.whProductId?.toString() || "",
        name: productData?.name || `Product ${item.whProductId}`,
        sku: productData?.sku || `SKU-${item.whProductId}`,
        quantity: item.quantity || 0,
        unitType: item.unitType || productData?.unitType || "Pcs",
        unitPrice: productData?.unitPrice || "0",
      } as SelectedProduct;
    });
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
        soNumber: soDetails.soNumber || "",
        customerName: soDetails.supplierName || "",
        shippingAddress: soDetails.shippingAddress || "",
        date: soDetails.date || "",
        products: productsFromSO,
      };

      setSelectedSalesOrders((prev) => [...prev, newSelectedSO]);
      setSelectedProducts((prev) => [...prev, ...productsFromSO]);
      message.success("Sales Order berhasil ditambahkan");
    } catch (error) {
      console.error("Error fetching SO details:", error);
      message.error("Gagal mengambil detail Sales Order");
    } finally {
      setSOSearchValue("");
      setLoading(false);
    }
  };

  const handleRemoveSalesOrder = (soNumber: string) => {
    setSelectedSalesOrders((prev) => prev.filter((so) => so.soNumber !== soNumber));
    setSelectedProducts((prev) => prev.filter((p) => !p.id.startsWith(`so_${soNumber}_`)));
    message.success("Sales Order berhasil dihapus");
  };

  const handleClearAllSO = () => {
    setSelectedSalesOrders([]);
    setSelectedProducts([]);
    message.success("Semua SO telah dibersihkan");
  };

  const handleQuantityChange = (productId: string, value: number) => {
    setSelectedProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, quantity: value || 0 } : p)));
    // also update in selectedSalesOrders
    setSelectedSalesOrders((prev) =>
      prev.map((so) => ({
        ...so,
        products: so.products.map((p) => (p.id === productId ? { ...p, quantity: value || 0 } : p)),
      }))
    );
  };

  const handleRemoveItem = (productId: string) => {
    setSelectedProducts((prev) => prev.filter((p) => p.id !== productId));
    setSelectedSalesOrders((prev) =>
      prev.map((so) => ({ ...so, products: so.products.filter((p) => p.id !== productId) }))
    );
    message.success("Item berhasil dihapus");
  };

  const handleSubmit = async (values: any) => {
    if (selectedSalesOrders.length === 0 && selectedProducts.length === 0) {
      message.warning("Silakan pilih minimal satu Sales Order atau produk untuk dikirim!");
      return;
    }

    if (!values.deliveryDate || !values.branchId || !values.shippingName || !values.shippingAddress) {
      message.warning("Silakan lengkapi semua field yang wajib diisi!");
      return;
    }

    setLoading(true);
    try {
      const soNumbers = selectedSalesOrders.map((so) => so.soNumber);
      const productQuantities = selectedProducts.map((p) => ({ productId: p.productId, quantity: p.quantity }));

      const payload: CreateDeliveryOrderPayload = {
        deliveryDate: dayjs(values.deliveryDate).format("YYYY-MM-DD"),
        branchId: values.branchId,
        shippingName: values.shippingName,
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
      destroyOnClose
    >
      <div className="p-4">
        <Form form={form} layout="vertical" onFinish={handleSubmit} className="mt-2">
          {/* Pilih Sales Order */}
          <div className="mb-6">
            <Typography.Title level={5}>Pilih Sales Order</Typography.Title>
            <Form.Item label="Cari atau Scan Nomor SO">
              <AutoComplete
                value={soSearchValue}
                onChange={setSOSearchValue}
                onSelect={handleSOSelect}
                placeholder="Ketik nomor SO atau nama customer..."
                options={soOptions}
                filterOption={false}
                notFoundContent={salesOrdersLoading ? <Spin size="small" /> : soSearchValue ? "Sales Order tidak ditemukan" : "Ketik untuk mencari..."}
              />
            </Form.Item>

            {/* List SO */}
            {selectedSalesOrders.length > 0 && (
              <div className="mb-2">
                <Typography.Title level={5}>List SO</Typography.Title>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex flex-wrap gap-2">
                    {selectedSalesOrders.map((so) => (
                      <div key={so.soNumber} className="flex items-center gap-1 bg-blue-100 px-3 py-1 rounded">
                        <span className="text-blue-700 font-medium">{so.soNumber}</span>
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
                  <Button onClick={handleClearAllSO} size="small" danger className="ml-auto">Bersihkan Semua</Button>
                </div>
              </div>
            )}
          </div>

          <Divider>Detail Pengiriman</Divider>

          {/* Grid fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item name="deliveryDate" label="Tanggal" rules={[{ required: true, message: "Tanggal pengiriman harus diisi!" }]}> 
              <DatePicker className="w-full" placeholder="Pilih tanggal pengiriman" format="DD/MM/YYYY" suffixIcon={<CalendarOutlined />} />
            </Form.Item>

            <Form.Item name="branchId" label="Cabang" rules={[{ required: true, message: "Cabang harus dipilih!" }]}> 
              <Select placeholder="Pilih Cabang" allowClear loading={branchesLoading} showSearch filterOption={(input, option) => String(option?.label ?? option?.value ?? "").toLowerCase().includes(input.toLowerCase())}>
                {branches.map((branch) => (
                  <Option key={branch?.id} value={branch?.whBranchId?.toString() || branch?.id?.toString()}>{branch?.name}</Option>
                ))}
              </Select>
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item name="shippingName" label="Kirim ke" rules={[{ required: true, message: "Nama penerima harus diisi!" }]}> 
              <Select placeholder="Pilih Customer" allowClear loading={customersLoading} showSearch>
                {customers.map((c) => (
                  <Option key={c.id} value={c.name}>{c.name}</Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="shippingAddress" label="Alamat Pengiriman" rules={[{ required: true, message: "Alamat pengiriman harus diisi!" }]}> 
              <Input placeholder="Masukkan alamat pengiriman" />
            </Form.Item>
          </div>

          <Form.Item name="note" label="Keterangan">
            <TextArea rows={2} placeholder="Masukkan catatan tambahan (opsional)..." maxLength={500} showCount />
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
                    <InputNumber min={0} value={record.quantity} onChange={(val) => handleQuantityChange(record.id, Number(val))} />
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
                    <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => handleRemoveItem(record.id)} />
                  ),
                },
              ]}
            />
          </div>

          {/* Footer */}
          <Form.Item className="mb-0 flex justify-end">
            <Space>
              <Button onClick={handleCancel} disabled={loading}>Kembali</Button>
              <Button type="primary" htmlType="submit" loading={loading} className="bg-green-600 hover:bg-green-700">Simpan</Button>
            </Space>
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
};

export default ModalPengiriman;