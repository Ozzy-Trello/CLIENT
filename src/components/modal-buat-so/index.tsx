import React, { useState, useMemo } from "react";
import { Modal, Button, Select, Input, Table, InputNumber, DatePicker, AutoComplete, message } from "antd";
import { Trash2 } from "lucide-react";
import dayjs from "dayjs";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getOzzyCustomers, createOzzySalesOrder, CreateSalesOrderPayload, getOzzyProducts } from "@api/ozzy-warehouse";

const { Option } = Select;
const { TextArea } = Input;

interface SelectedProduct {
  id: string;
  name: string;
  no: string;
  source?: string;
  unit1Name?: string;
  quantity: number;
}

interface ModalBuatSOProps {
  open: boolean;
  onClose: () => void;
  cardId?: string;
  noFaktur?: string | null;
}

const ModalBuatSO: React.FC<ModalBuatSOProps> = ({
  open,
  onClose,
  cardId,
  noFaktur,
}) => {
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [tanggal, setTanggal] = useState<any>(dayjs());
  const [alamatPengiriman, setAlamatPengiriman] = useState<string>("");
  const [keterangan, setKeterangan] = useState<string>("");
  const [productSearch, setProductSearch] = useState<string>("");
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);

  // Fetch customers
  const { data: customers, isLoading: customersLoading } = useQuery({
    queryKey: ["ozzy-customers", "1880451"],
    queryFn: () => getOzzyCustomers("1880451"),
    enabled: open,
  });

  // Fetch products
  const { data: itemsResponse, isLoading: itemsLoading, error: itemsError } = useQuery({
    queryKey: ["ozzy-products", "1880451"],
    queryFn: () => getOzzyProducts("1880451"),
    enabled: open,
  });

  // Extract items from the response - getOzzyProducts returns the array directly
  const items = itemsResponse || [];

  // Process customer options
  const customerOptions = useMemo(() => {
    if (!customers || !Array.isArray(customers)) return [];
    return customers.map((customer: any) => ({
      value: customer.id,
      label: customer.name,
    }));
  }, [customers]);

  // Process product options for AutoComplete
  const productOptions = useMemo(() => {
    if (!items || !Array.isArray(items)) return [];

    const filteredItems = productSearch
      ? items.filter(
          (item: any) =>
            item.name.toLowerCase().includes(productSearch.toLowerCase()) ||
            item.sku.toLowerCase().includes(productSearch.toLowerCase()) ||
            (item.barcode &&
              item.barcode
                .toLowerCase()
                .includes(productSearch.toLowerCase()))
        )
      : items;

    return filteredItems.map((item: any) => ({
      value: item.sku,
      label: `${item.name} (${item.sku})`,
      item: item,
    }));
  }, [items, productSearch]);

  const handleProductSelect = (value: string, option: any) => {
    const item = option.item;
    if (item && !selectedProducts.find(sp => sp.no === item.sku)) {
      setSelectedProducts([...selectedProducts, { 
        id: item.id || item.sku,
        name: item.name,
        no: item.sku,
        source: item.sku, // Using SKU as source for consistency
        unit1Name: item.unitType,
        quantity: 6 
      }]);
      setProductSearch("");
    }
  };

  const handleQuantityChange = (productId: string, quantity: number) => {
    setSelectedProducts(selectedProducts.map(product =>
      product.id === productId ? { ...product, quantity } : product
    ));
  };

  const handleRemoveProduct = (productId: string) => {
    setSelectedProducts(selectedProducts.filter(product => product.id !== productId));
  };

  // Mutation for creating sales order
  const createSalesOrderMutation = useMutation({
    mutationFn: createOzzySalesOrder,
    onSuccess: (data) => {
      console.log(data,'<< ini isi data')
      message.success(`Sales Order berhasil dibuat dengan nomor: ${data.data.soNumber}`);
      // Reset form
      setSelectedCustomer("");
      setTanggal(dayjs());
      setAlamatPengiriman("");
      setKeterangan("");
      setSelectedProducts([]);
      onClose();
    },
    onError: (error: any) => {
      message.error(`Gagal membuat Sales Order: ${error.response?.data?.message || error.message}`);
    },
  });

  const handleSubmit = () => {
    // Prevent double submission
    if (createSalesOrderMutation.isPending) return;

    // Validation
    if (noFaktur && noFaktur.toString().trim()) {
      message.error("No Faktur sudah terisi, tidak bisa buat SO");
      return;
    }
    if (!selectedCustomer) {
      message.error("Silakan pilih customer");
      return;
    }
    if (!tanggal) {
      message.error("Silakan pilih tanggal");
      return;
    }
    if (selectedProducts.length === 0) {
      message.error("Silakan pilih minimal satu produk");
      return;
    }

    const invalidQty = selectedProducts.find(
      (p) => !Number.isFinite(p.quantity) || p.quantity % 6 !== 0
    );
    if (invalidQty) {
      message.error("Qty SO harus kelipatan 6 (tiap baris produk)");
      return;
    }

    // Prepare payload
    const payload: CreateSalesOrderPayload = {
      wh_customer_id: selectedCustomer,
      date: tanggal.format('YYYY-MM-DD'),
      shipping_address: alamatPengiriman || "",
      note: keterangan || "",
      product_id: selectedProducts.map(product => product.id),
      quantity: selectedProducts.reduce((acc, product) => {
        acc[product.id] = product.quantity.toString();
        return acc;
      }, {} as Record<string, string>),
    };

    // Add cardId if available
    if (cardId) {
      payload.cardId = cardId;
    }

    createSalesOrderMutation.mutate(payload);
  };

  const handleCancel = () => {
    setSelectedCustomer("");
    setTanggal(dayjs());
    setAlamatPengiriman("");
    setKeterangan("");
    setProductSearch("");
    setSelectedProducts([]);
    onClose();
  };

  const columns = [
    {
      title: "Nama Barang",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "No. Item",
      dataIndex: "no",
      key: "no",
      width: 120,
    },
    {
      title: "Source",
      dataIndex: "source",
      key: "source",
      width: 100,
      render: (source: string) => source || "Unknown",
    },
    {
      title: "Kuantitas",
      key: "quantity",
      width: 120,
      render: (_: any, record: SelectedProduct) => (
        <InputNumber
          min={6}
          step={6}
          value={record.quantity}
          onChange={(value) => handleQuantityChange(record.id, value || 6)}
          size="small"
        />
      ),
    },
    {
      title: "Satuan",
      dataIndex: "unit1Name",
      key: "unit1Name",
      width: 80,
      align: "center" as const,
    },
    {
      title: "Aksi",
      key: "action",
      width: 80,
      align: "center" as const,
      render: (_: any, record: SelectedProduct) => (
        <Button
          type="text"
          danger
          size="small"
          icon={<Trash2 size={14} />}
          onClick={() => handleRemoveProduct(record.id)}
        />
      ),
    },
  ];

  return (
    <Modal
      title="Buat SO"
      open={open}
      onCancel={handleCancel}
      width={800}
      footer={[
        <Button key="cancel" onClick={handleCancel} disabled={createSalesOrderMutation.isPending}>
          Kembali
        </Button>,
        <Button 
          key="submit" 
          type="primary" 
          onClick={handleSubmit}
          loading={createSalesOrderMutation.isPending}
          disabled={createSalesOrderMutation.isPending}
        >
          Simpan
        </Button>,
      ]}
    >
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Customer Selection */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Customer <span className="text-red-500">*</span>
          </label>
          <Select
            placeholder="Pilih Customer"
            value={selectedCustomer}
            onChange={setSelectedCustomer}
            className="w-full"
            showSearch
            loading={customersLoading}
            filterOption={(input, option) =>
              (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
            }
          >
            {customerOptions.map(customer => (
              <Option key={customer.value} value={customer.value}>
                {customer.label}
              </Option>
            ))}
          </Select>
        </div>

        {/* Tanggal */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Tanggal <span className="text-red-500">*</span>
          </label>
          <DatePicker
            value={tanggal}
            onChange={setTanggal}
            className="w-full"
            format="DD/MM/YYYY"
            placeholder="25/10/2025"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Alamat Pengiriman */}
        <div>
          <label className="block text-sm font-medium mb-1">Alamat Pengiriman</label>
          <TextArea
            placeholder="Masukkan alamat"
            value={alamatPengiriman}
            onChange={(e) => setAlamatPengiriman(e.target.value)}
            rows={3}
          />
        </div>

        {/* Keterangan */}
        <div>
          <label className="block text-sm font-medium mb-1">Keterangan</label>
          <TextArea
            placeholder="Masukkan catatan"
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            rows={3}
          />
        </div>
      </div>

      {/* Cari Produk */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-1">Cari Produk</label>
        {itemsError && (
          <div className="mb-2 p-2 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
            Error loading products: {itemsError.message}
          </div>
        )}
        <AutoComplete
          value={productSearch}
          onChange={setProductSearch}
          onSelect={handleProductSelect}
          options={productOptions}
          className="w-full"
          placeholder="Ketik untuk mencari produk"
          notFoundContent={itemsLoading ? "Loading..." : itemsError ? "Error loading products" : "Produk tidak ditemukan"}
        />

      </div>

      {/* Detail Item */}
      <div>
        <label className="block text-sm font-medium mb-2">Detail Item</label>
        {selectedProducts.length === 0 ? (
          <div className="text-center py-8 text-gray-500 border border-gray-200 rounded">
            Tidak ada produk yang dipilih
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={selectedProducts}
            rowKey="id"
            pagination={false}
            size="small"
            className="border border-gray-200 rounded"
          />
        )}
      </div>
    </Modal>
  );
};

export default ModalBuatSO;
