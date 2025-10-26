import React, { useState, useEffect, useMemo } from "react";
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
  InputNumber,
  Spin,
  Card,
  Divider,
} from "antd";
import { CalendarOutlined, TruckOutlined, DeleteOutlined, SearchOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import {
  getOzzyBranches,
  getOzzyProducts,
  getOzzyCustomers,
  getOzzySalesOrders,
  getOzzySalesOrderById,
  createOzzyDeliveryOrder,
  type OzzyBranch,
  type OzzyProduct,
  type OzzyCustomer,
  type OzzyPackingData,
  type OzzyPackingItem,
  type CreateDeliveryOrderPayload,
} from "@api/ozzy-warehouse";
import dayjs from "dayjs";

interface ModalDeliveryProps {
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
  unitPrice: string;
}

interface SelectedSalesOrder {
  soNumber: string;
  customerName: string;
  shippingAddress: string;
  date: string;
  products: SelectedProduct[];
}

interface ValidationItem {
  id: string;
  sesuai: boolean;
  namaBarang: string;
  sku: string;
  kuantitasReal: number;
  kuantitasScan: number;
  satuan: string;
  originalItem: OzzyPackingItem;
}

const { Option } = Select;
const { TextArea } = Input;

const ModalDelivery: React.FC<ModalDeliveryProps> = ({ open, onClose }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [soSearchValue, setSOSearchValue] = useState("");
  const [selectedSalesOrders, setSelectedSalesOrders] = useState<SelectedSalesOrder[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [showSOValidationModal, setShowSOValidationModal] = useState(false);
  const [currentSOForValidation, setCurrentSOForValidation] = useState<OzzyPackingData | null>(null);
  const [loadingSODetails, setLoadingSODetails] = useState(false);
  
  // State for SO detail modal (simple view)
  const [showSODetailModal, setShowSODetailModal] = useState(false);
  const [currentSOForDetail, setCurrentSOForDetail] = useState<SelectedSalesOrder | null>(null);
  
  const [validationItems, setValidationItems] = useState<ValidationItem[]>([]);
  const [barcodeInput, setBarcodeInput] = useState("");

  // Fetch data using React Query
  const { data: branches = [], isLoading: branchesLoading } = useQuery({
    queryKey: ["ozzy-branches"],
    queryFn: () => getOzzyBranches(),
    enabled: open,
  });

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["ozzy-products"],
    queryFn: () => getOzzyProducts(),
    enabled: open,
  });

  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ["ozzy-customers", "1880365"],
    queryFn: () => getOzzyCustomers("1880365"),
    enabled: open,
  });

  const { data: salesOrders = [], isLoading: salesOrdersLoading } = useQuery({
    queryKey: ["ozzy-sales-orders", "delivery"],
    queryFn: () => getOzzySalesOrders(50, 1),
    enabled: open,
  });

  // Memoize products to prevent unnecessary re-renders
  const memoizedProducts = useMemo(() => {
    return products || [];
  }, [products?.length, products?.[0]?.id]); // Only re-memoize when length or first item changes

  // Initialize validation items when SO is selected
  useEffect(() => {
    if (currentSOForValidation?.items && memoizedProducts.length > 0) {
      const items: ValidationItem[] = currentSOForValidation.items.map((item, index) => {
        // Find the actual product data
        const productData = memoizedProducts.find(p => p.id === item.whProductId);
        
        return {
          id: item.id?.toString() || index.toString(),
          sesuai: false,
          namaBarang: productData?.name || item.product?.name || `Product ${item.whProductId}`,
          sku: productData?.sku || item.product?.sku || `SKU-${item.whProductId}`,
          kuantitasReal: item.quantityPacked || 0,
          kuantitasScan: 0,
          satuan: item.unitType || productData?.unitType || 'Pcs',
          originalItem: item
        };
      });
      
      // Only update if the items are actually different
      setValidationItems(prevItems => {
        if (prevItems.length !== items.length) return items;
        
        const hasChanges = items.some((item, index) => {
          const prevItem = prevItems[index];
          return !prevItem || 
                 prevItem.id !== item.id || 
                 prevItem.namaBarang !== item.namaBarang ||
                 prevItem.sku !== item.sku ||
                 prevItem.kuantitasReal !== item.kuantitasReal;
        });
        
        return hasChanges ? items : prevItems;
      });
    } else if (validationItems.length > 0) {
      // Only clear if there are items to clear
      setValidationItems([]);
    }
  }, [currentSOForValidation?.items, currentSOForValidation?.purchaseOrder?.soNumber, memoizedProducts.length]);

  // Filter sales orders based on search
  const filteredSalesOrders = useMemo(() => {
    if (!salesOrders) return [];
    
    // If no search value, return all sales orders
    if (!soSearchValue) return salesOrders;
    
    return salesOrders.filter((so) =>
      so?.purchaseOrder?.soNumber?.toLowerCase().includes(soSearchValue.toLowerCase()) ||
      so?.purchaseOrder?.supplierName?.toLowerCase().includes(soSearchValue.toLowerCase())
    );
  }, [salesOrders, soSearchValue]);



  const handleSubmit = async (values: any) => {
    if (selectedSalesOrders.length === 0 && selectedProducts.length === 0) {
      message.warning("Silakan pilih minimal satu Sales Order atau produk untuk dikirim!");
      return;
    }

    if (!values.deliveryDate || !values.branchId || !values.customerId || !values.shippingAddress) {
      message.warning("Silakan lengkapi semua field yang wajib diisi!");
      return;
    }

    setLoading(true);
    try {
      // Prepare payload for delivery order creation
      const soNumbers = selectedSalesOrders.map(so => so.soNumber);
      
      // Combine products from selected sales orders and manually selected products
      const allProducts: Array<{ productId: string; quantity: number }> = [];
      
      // Add products from selected sales orders
      selectedSalesOrders.forEach(so => {
        so.products.forEach(product => {
          allProducts.push({
            productId: product.productId,
            quantity: product.quantity,
          });
        });
      });

      // Add manually selected products
      selectedProducts.forEach(product => {
        allProducts.push({
          productId: product.productId,
          quantity: product.quantity,
        });
      });

      const payload: CreateDeliveryOrderPayload = {
        deliveryDate: dayjs(values.deliveryDate).format("YYYY-MM-DD"),
        branchId: values.branchId,
        customerId: values.customerId,
        shippingAddress: values.shippingAddress,
        note: values.note || null,
        soNumbers,
        productQuantities: allProducts,

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

  const handleSOSelect = async (soNumber: string) => {
    try {
      setLoadingSODetails(true);
      
      // Fetch full SO details with items
      const soDetails = await getOzzySalesOrderById(soNumber);
      
      if (soDetails) {
        setCurrentSOForValidation(soDetails);
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

  const handleRemoveSalesOrder = (soNumber: string) => {
    setSelectedSalesOrders(prev => prev.filter(so => so.soNumber !== soNumber));
    message.success("Sales Order berhasil dihapus!");
  };

  // Handle showing SO details
  const handleShowSODetail = (so: SelectedSalesOrder) => {
    setCurrentSOForDetail(so);
    setShowSODetailModal(true);
  };

  // Handler functions for validation
  const handleValidationCheckboxChange = (itemId: string, checked: boolean) => {
    setValidationItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, sesuai: checked } : item
      )
    );
  };

  const handleValidationQuantityChange = (itemId: string, field: 'kuantitasReal' | 'kuantitasScan', value: number) => {
    setValidationItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, [field]: value || 0 } : item
      )
    );
  };

  const handleBarcodeValidation = () => {
    if (!barcodeInput.trim()) {
      message.warning("Silakan masukkan barcode!");
      return;
    }
    
    // Find product by barcode
    const scannedProduct = memoizedProducts.find(p => 
      p.barcode === barcodeInput.trim() || 
      p.sku === barcodeInput.trim()
    );
    
    if (scannedProduct) {
      // Find the validation item that matches this product
      const validationItemIndex = validationItems.findIndex(item => 
        item.originalItem.whProductId === scannedProduct.id
      );
      
      if (validationItemIndex !== -1) {
        // Update the scan quantity for this item
        const updatedItems = [...validationItems];
        updatedItems[validationItemIndex] = {
          ...updatedItems[validationItemIndex],
          kuantitasScan: updatedItems[validationItemIndex].kuantitasScan + 1
        };
        setValidationItems(updatedItems);
        
        // Show success message
        message.success(`Berhasil scan: ${scannedProduct.name}`);
      } else {
        // Product found but not in current SO
        message.warning(`Produk "${scannedProduct.name}" tidak ada dalam SO ini`);
      }
    } else {
      // Barcode not found
      message.error('Barcode tidak ditemukan');
    }
    
    // Clear input after validation
    setBarcodeInput("");
  };

  const handleConfirmSO = () => {
    if (!currentSOForValidation) return;

    // Use validation items data instead of original items
    const soProducts: SelectedProduct[] = validationItems.map((item, index) => ({
      id: `so_${currentSOForValidation.purchaseOrder.soNumber}_item_${item.id}`,
      productId: item.originalItem.whProductId?.toString() || "",
      name: item.namaBarang,
      sku: item.sku,
      quantity: item.kuantitasReal, // Use the validated quantity
      unitType: item.satuan,
      unitPrice: "0",
    }));

    // Add SO to selected sales orders
    const newSelectedSO: SelectedSalesOrder = {
      soNumber: currentSOForValidation.purchaseOrder.soNumber || "",
      customerName: currentSOForValidation.purchaseOrder.supplierName || "",
      shippingAddress: currentSOForValidation.purchaseOrder.shippingAddress || "",
      date: currentSOForValidation.purchaseOrder.date || "",
      products: soProducts,
    };

    setSelectedSalesOrders(prev => [...prev, newSelectedSO]);
    
    // Also add products to selectedProducts so they appear in Detail Item section
    setSelectedProducts(prev => [...prev, ...soProducts]);
    
    // Auto-fill form fields from the first selected SO
    if (selectedSalesOrders.length === 0) {
      form.setFieldsValue({
        deliveryDate: dayjs(), // Use today's date instead of SO creation date
        branchId: currentSOForValidation.purchaseOrder.whBranchId?.toString(),
        customerId: currentSOForValidation.purchaseOrder.whCustomerId?.toString(),
        shippingAddress: currentSOForValidation.purchaseOrder.shippingAddress,
      });
    }
    
    setShowSOValidationModal(false);
    setCurrentSOForValidation(null);
    setValidationItems([]);
    setBarcodeInput("");
    message.success("Sales Order berhasil ditambahkan!");
  };



  const handleSOProductAdd = (soNumber: string, product: OzzyProduct, quantity: number = 1) => {
    setSelectedSalesOrders(prev =>
      prev.map(so => {
        if (so.soNumber === soNumber) {
          // Check if product already exists in this SO
          const existingProductIndex = so?.products?.findIndex(p => p.productId === product?.id?.toString()) ?? -1;
          
          if (existingProductIndex >= 0) {
            // Update quantity
            const updatedProducts = [...(so?.products || [])];
            updatedProducts[existingProductIndex].quantity = quantity;
            return { ...so, products: updatedProducts };
          } else {
            // Add new product
            const newProduct: SelectedProduct = {
              id: `so_${soNumber}_product_${product?.id}`,
              productId: product?.id?.toString() || "",
              name: product?.name || "",
              sku: product?.sku || "",
              quantity,
              unitType: product?.unitType || "",
              unitPrice: product?.unitPrice || "0",
            };
            return { ...so, products: [...(so?.products || []), newProduct] };
          }
        }
        return so;
      })
    );
  };

  const handleSOProductRemove = (soNumber: string, productId: string) => {
    setSelectedSalesOrders(prev =>
      prev.map(so => {
        if (so.soNumber === soNumber) {
          return { ...so, products: so?.products?.filter(p => p.id !== productId) || [] };
        }
        return so;
      })
    );
  };

  const soOptions = filteredSalesOrders.map(so => ({
    value: so?.purchaseOrder?.soNumber || "",
    label: `${so?.purchaseOrder?.soNumber || ""} - ${so?.purchaseOrder?.supplierName || ""}`,
  }));



  return (
    <>
    <Modal
      title={
        <div className="flex items-center gap-2">
          <TruckOutlined className="text-blue-500" />
          <span>Form Delivery Order</span>
        </div>
      }
      open={open}
      onCancel={handleCancel}
      footer={null}
      width={900}
      destroyOnClose
    >
      <div style={{ padding: "1rem" }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          className="mt-4"
        >
          {/* Sales Order Search - Moved to Top */}
          <div className="mb-6">
            <Typography.Title level={5}>Pilih Sales Order</Typography.Title>
            <Form.Item label="Cari Sales Order">
              <AutoComplete
                value={soSearchValue}
                onChange={setSOSearchValue}
                onSelect={handleSOSelect}
                placeholder="Ketik nomor SO atau nama customer..."
                options={soOptions}
                filterOption={false}
                notFoundContent={
                  salesOrdersLoading ? <Spin size="small" /> : "Sales Order tidak ditemukan"
                }
              />
            </Form.Item>

            {/* List SO */}
            {selectedSalesOrders.length > 0 && (
              <div className="mb-4">
                <Typography.Title level={5}>List SO</Typography.Title>
                <div className="flex flex-wrap gap-2">
                  {selectedSalesOrders.map((so) => (
                    <div key={so.soNumber} className="flex items-center gap-1 bg-blue-100 px-3 py-1 rounded">
                      <Button
                        type="link"
                        size="small"
                        className="p-0 h-auto text-blue-600 font-medium"
                        onClick={() => handleShowSODetail(so)}
                      >
                        {so.soNumber}
                      </Button>
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
              </div>
            )}
          </div>

          <Divider>Detail Pengiriman</Divider>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Delivery Date - Required */}
            <Form.Item
              name="deliveryDate"
              label="Tanggal Pengiriman"
              rules={[{ required: true, message: "Tanggal pengiriman harus diisi!" }]}
            >
              <DatePicker
                className="w-full"
                placeholder="Pilih tanggal pengiriman"
                format="DD/MM/YYYY"
                suffixIcon={<CalendarOutlined />}
              />
            </Form.Item>

            {/* Branch - Required Dropdown */}
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
                   option?.children?.toString().toLowerCase().includes(input.toLowerCase()) ?? false
                 }
              >
                {branches.map((branch) => (
                  <Option key={branch?.id} value={branch?.whBranchId?.toString() || branch?.id?.toString()}>
                    {branch?.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Shipping Name - Required */}
            <Form.Item
              name="customerId"
              label="Customer"
              rules={[{ required: true, message: "Customer harus dipilih!" }]}
            >
              <Select
                placeholder="Pilih Customer"
                allowClear
                loading={customersLoading}
                showSearch
                filterOption={(input, option) =>
                  (option?.children as unknown as string)
                    ?.toLowerCase()
                    .includes(input.toLowerCase())
                }
              >
                {customers?.map((customer) => (
                  <Option key={customer.id} value={customer.id.toString()}>
                    {customer.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>


          </div>

          {/* Shipping Address - Required */}
          <Form.Item
            name="shippingAddress"
            label="Alamat Pengiriman"
            rules={[{ required: true, message: "Alamat pengiriman harus diisi!" }]}
          >
            <TextArea
              rows={3}
              placeholder="Masukkan alamat lengkap pengiriman..."
              maxLength={1000}
              showCount
            />
          </Form.Item>

          {/* Note - Optional */}
          <Form.Item name="note" label="Catatan">
            <TextArea
              rows={2}
              placeholder="Masukkan catatan tambahan (opsional)..."
              maxLength={500}
              showCount
            />
          </Form.Item>

          {/* Detail Item - Show only validated products from SOs */}
          {selectedProducts.length > 0 && (
            <div className="mb-6">
              <Typography.Title level={5}>Detail Item</Typography.Title>
              <Table
                dataSource={selectedProducts}
                rowKey="id"
                pagination={false}
                size="small"
                columns={[
                  {
                    title: "Nama Barang",
                    dataIndex: "name",
                    key: "name",
                    render: (text, record) => (
                      <div>
                        <div>{text}</div>
                        <Typography.Text type="secondary" className="text-xs">
                          {record?.sku}
                        </Typography.Text>
                      </div>
                    ),
                  },
                  {
                    title: "Kuantitas",
                    dataIndex: "quantity",
                    key: "quantity",
                    width: 120,
                    align: "center",
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
                    render: (_, record) => (
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => {
                          setSelectedProducts(prev => prev.filter(p => p.id !== record.id));
                          message.success("Item berhasil dihapus!");
                        }}
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
              Buat Delivery Order
            </Button>
          </div>
        </Form>
      </div>
    </Modal>

    {/* SO Items Validation Modal */}
    <Modal
      title="Detail Item"
      open={showSOValidationModal}
      onCancel={() => {
        setShowSOValidationModal(false);
        setCurrentSOForValidation(null);
      }}
      footer={null}
      width={1000}
      className="detail-item-modal"
    >
      {loadingSODetails ? (
        <div className="flex justify-center items-center py-8">
          <Spin size="large" />
        </div>
      ) : currentSOForValidation ? (
        <div className="p-4">
          {/* Barcode Scanning Section */}
          <div className="mb-6">
            <Typography.Title level={5} className="mb-3">
              Scan Barcode Produk (Lusin/Pcs)
            </Typography.Title>
            <div className="flex gap-2">
                <Input
                  placeholder="Scan Barcode"
                  className="flex-1"
                  size="large"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onPressEnter={handleBarcodeValidation}
                />
                <Button 
                  type="primary" 
                  size="large"
                  className="bg-yellow-500 hover:bg-yellow-600 border-yellow-500 text-black font-medium"
                  onClick={handleBarcodeValidation}
                >
                  Validasi
                </Button>
              </div>
          </div>

          {/* Product Validation Table */}
          <div className="mb-6">
            <Table
              dataSource={validationItems}
              rowKey="id"
              pagination={false}
              size="middle"
              className="validation-table"
              columns={[
                {
                  title: "Sesuai",
                  dataIndex: "sesuai",
                  key: "sesuai",
                  width: 80,
                  align: "center",
                  render: (checked, record) => (
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => handleValidationCheckboxChange(record.id, e.target.checked)}
                      className="w-4 h-4"
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
                  align: "center",
                  render: (value, record) => (
                    <InputNumber
                      min={0}
                      value={value}
                      onChange={(newValue) => handleValidationQuantityChange(record.id, 'kuantitasReal', newValue || 0)}
                      className="w-full"
                    />
                  ),
                },
                {
                  title: "Kuantitas Scan",
                  dataIndex: "kuantitasScan",
                  key: "kuantitasScan",
                  width: 120,
                  align: "center",
                  render: (value, record) => (
                    <InputNumber
                      min={0}
                      value={value}
                      onChange={(newValue) => handleValidationQuantityChange(record.id, 'kuantitasScan', newValue || 0)}
                      className="w-full"
                    />
                  ),
                },
                {
                  title: "Satuan",
                  dataIndex: "satuan",
                  key: "satuan",
                  width: 80,
                  align: "center",
                },
              ]}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button 
              size="large"
              onClick={() => {
                setShowSOValidationModal(false);
                setCurrentSOForValidation(null);
              }}
            >
              Tutup
            </Button>
            <Button 
              type="primary" 
              size="large"
              onClick={handleConfirmSO}
            >
              Tambahkan
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>

    {/* SO Detail Modal */}
    <Modal
      title={`Produk pada SO: ${currentSOForDetail?.soNumber || ''}`}
      open={showSODetailModal}
      onCancel={() => {
        setShowSODetailModal(false);
        setCurrentSOForDetail(null);
      }}
      footer={[
        <Button key="close" onClick={() => {
          setShowSODetailModal(false);
          setCurrentSOForDetail(null);
        }}>
          Tutup
        </Button>
      ]}
      width={800}
    >
      <div className="p-4">
        {currentSOForDetail && (
          <Table
          dataSource={currentSOForDetail.products}
          rowKey="id"
          pagination={false}
          size="middle"
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
              width: 150,
            },
            {
              title: "Qty (SO ini)",
              dataIndex: "quantity",
              key: "quantity",
              width: 120,
              align: "center",
            },
            {
              title: "Satuan",
              dataIndex: "unitType",
              key: "unitType",
              width: 100,
              align: "center",
            },
          ]}
          />
        )}
      </div>
    </Modal>
    </>
  );
};

export default ModalDelivery;
