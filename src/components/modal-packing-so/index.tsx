import React, { useState, useEffect, useMemo } from "react";
import {
  Modal,
  Form,
  Button,
  Input,
  Table,
  Typography,
  Space,
  message,
  Select,
  Spin,
} from "antd";
import { Package, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getOzzySalesOrders, type OzzyPackingData } from "@api/ozzy-warehouse";

interface ModalPackingSOProps {
  open: boolean;
  onClose: () => void;
}

const { Title, Text } = Typography;
const { Option } = Select;

const ModalPackingSO: React.FC<ModalPackingSOProps> = ({ open, onClose }) => {
  const [form] = Form.useForm();
  const [searchValue, setSearchValue] = useState<string>("");
  const [selectedSO, setSelectedSO] = useState<OzzyPackingData | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);

  // Fetch SO list with packing=0 filter
  const { data: salesOrders = [], isLoading: isLoadingSO } = useQuery({
    queryKey: ["sales-orders-packing", 0],
    queryFn: () => getOzzySalesOrders(1000, 0),
    enabled: open,
  });

  // Filter SOs based on search value
  const filteredSalesOrders = useMemo(() => {
    if (!searchValue) return salesOrders;
    return salesOrders.filter((so) =>
      so.purchaseOrder?.soNumber
        ?.toLowerCase()
        .includes(searchValue.toLowerCase())
    );
  }, [salesOrders, searchValue]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      form.resetFields();
      setSearchValue("");
      setSelectedSO(null);
      setSelectedProducts([]);
    }
  }, [open, form]);

  const handleSOSearch = (value: string) => {
    setSearchValue(value);
    // Auto-select if exact match found
    const exactMatch = salesOrders.find(
      (so) => so.purchaseOrder?.soNumber?.toLowerCase() === value.toLowerCase()
    );
    if (exactMatch) {
      handleSOSelect(exactMatch);
    } else {
      setSelectedSO(null);
      setSelectedProducts([]);
    }
  };

  const handleSOSelect = (so: OzzyPackingData) => {
    setSelectedSO(so);
    setSearchValue(so.purchaseOrder?.soNumber || "");
    // Extract products from SO items
    const products =
      so.items?.map((item) => ({
        key: item.id,
        id: item.id,
        namaBarang: item.product?.name || "",
        sku: item.product?.sku || "",
        kuantitas: item.quantityPacked || 0,
        satuan: item.unitType || "",
        product: item.product,
      })) || [];
    setSelectedProducts(products);
  };

  const handleSubmit = async () => {
    try {
      if (!selectedSO || selectedProducts.length === 0) {
        message.warning("Silakan pilih SO dan produk terlebih dahulu");
        return;
      }

      // TODO: Implement SO packing functionality
      message.success("SO packing berhasil disimpan");
      onClose();
    } catch (error) {
      console.error("Error in SO packing:", error);
      message.error("Gagal menyimpan SO packing");
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setSearchValue("");
    setSelectedSO(null);
    setSelectedProducts([]);
    onClose();
  };

  const columns = [
    {
      title: "Nama Barang",
      dataIndex: "namaBarang",
      key: "namaBarang",
      render: (text: string) => text || "-",
    },
    {
      title: "SKU",
      dataIndex: "sku",
      key: "sku",
      render: (text: string) => text || "-",
    },
    {
      title: "Kuantitas",
      dataIndex: "kuantitas",
      key: "kuantitas",
      render: (value: number) => value || 0,
    },
    {
      title: "Satuan",
      dataIndex: "satuan",
      key: "satuan",
      render: (text: string) => text || "-",
    },
    {
      title: "Aksi",
      key: "aksi",
      render: () => (
        <Button size="small" type="link" className="text-red-500">
          Hapus
        </Button>
      ),
    },
  ];

  return (
    <Modal
      title="Cari atau Scan Nomor SO"
      open={open}
      onCancel={handleCancel}
      footer={null}
      width={900}
      destroyOnHidden
    >
      <div className="py-4 space-y-6">
        {/* Search Input */}
        <div className="space-y-2">
          <Input
            placeholder="Ketik Nomor SO atau Scan Barcode"
            value={searchValue}
            onChange={(e) => handleSOSearch(e.target.value)}
            prefix={<Search size={16} className="text-gray-400" />}
            size="large"
            className="w-full"
          />

          {/* SO Selection Dropdown */}
          {searchValue && filteredSalesOrders.length > 0 && (
            <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto bg-white shadow-sm">
              {isLoadingSO ? (
                <div className="p-4 text-center">
                  <Spin size="small" />
                  <Text className="ml-2">Loading SOs...</Text>
                </div>
              ) : (
                filteredSalesOrders.map((so) => (
                  <div
                    key={so.id}
                    className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    onClick={() => handleSOSelect(so)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <Text strong>{so.purchaseOrder?.soNumber}</Text>
                        <br />
                        <Text type="secondary" className="text-sm">
                          {so.purchaseOrder?.supplierName} •{" "}
                          {so.purchaseOrder?.date}
                        </Text>
                      </div>
                      <div className="text-right">
                        <Text className="text-sm">
                          {so.items?.length || 0} items
                        </Text>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Detail Item Section */}
        <div>
          <Title level={4} className="mb-4">
            Detail Item
          </Title>

          <Table
            columns={columns}
            dataSource={selectedProducts}
            pagination={false}
            locale={{
              emptyText: (
                <div className="py-8 text-center">
                  <Text type="secondary" className="text-base">
                    Tidak ada produk yang dipilih
                  </Text>
                </div>
              ),
            }}
            className="border border-gray-200 rounded-lg"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end">
          <Button
            type="primary"
            onClick={handleSubmit}
            className="bg-green-600 hover:bg-green-700 border-green-600 hover:border-green-700"
            size="large"
            disabled={selectedProducts.length === 0}
          >
            Simpan
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ModalPackingSO;
