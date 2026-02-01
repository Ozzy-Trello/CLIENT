import {
  getOzzyProductById,
  getOzzyRawSalesOrderById,
  getOzzyRawSalesOrders,
  validateProductByBarcode,
  createOzzyPacking,
  type OzzyPackingData,
} from "@api/ozzy-warehouse";
import { useQuery } from "@tanstack/react-query";
import { Scanner } from "@yudiel/react-qr-scanner";
import {
  AutoComplete,
  Button,
  Checkbox,
  Form,
  Input,
  message,
  Modal,
  Space,
  Spin,
  Table,
  Typography,
} from "antd";
import ScannerIcon from "@components/icons/ScannerIcon";
import React, { useEffect, useMemo, useState } from "react";
import QRGuideOverlay from "@components/qr-overlay";

interface ModalPackingProps {
  open: boolean;
  onClose: () => void;
}

const { Title, Text } = Typography;

interface SelectedSalesOrder {
  soNumber: string;
  customerName: string;
  shippingAddress: string;
  date: string;
  products: any[];
}

const ModalPacking: React.FC<ModalPackingProps> = ({ open, onClose }) => {
  const [form] = Form.useForm();
  const [soSearchValue, setSOSearchValue] = useState("");
  const [selectedSalesOrders, setSelectedSalesOrders] = useState<
    SelectedSalesOrder[]
  >([]);
  const [showSOValidationModal, setShowSOValidationModal] = useState(false);
  const [currentSOForValidation, setCurrentSOForValidation] =
    useState<OzzyPackingData | null>(null);
  const [loadingSODetails, setLoadingSODetails] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [validatedProducts, setValidatedProducts] = useState<Set<string>>(
    new Set()
  );
  const [scannedQuantities, setScannedQuantities] = useState<
    Record<string, number>
  >({});
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch sales orders with packing=0 filter
  const { data: salesOrders = [], isLoading } = useQuery({
    queryKey: ["sales-orders-packing", 0],
    queryFn: () => getOzzyRawSalesOrders(undefined, 0),
    enabled: open,
  });

  // Filter sales orders based on search value for autocomplete
  const filteredSalesOrders = useMemo(() => {
    if (!salesOrders) return [];

    // If no search value, return all sales orders
    if (!soSearchValue) return salesOrders;

    return salesOrders.filter(
      (so) =>
        so.soNumber?.toLowerCase().includes(soSearchValue.toLowerCase()) ||
        so.supplierName?.toLowerCase().includes(soSearchValue.toLowerCase())
    );
  }, [salesOrders, soSearchValue]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      form.resetFields();
      setSOSearchValue("");
      setSelectedSalesOrders([]);
      setShowSOValidationModal(false);
      setCurrentSOForValidation(null);
      setBarcodeInput("");
      setValidatedProducts(new Set());
    }
  }, [open, form]);

  // Handle barcode validation
  const handleBarcodeValidation = async (barcode: string) => {
    if (!currentSOForValidation || !barcode.trim()) {
      message.warning("Masukkan barcode yang valid");
      return;
    }

    try {
      // Call validation API
      const validationResult = await validateProductByBarcode(barcode.trim());

      if (!validationResult.status) {
        message.error("Produk tidak ditemukan");
        return;
      }

      const { productId } = validationResult.data;

      // Debug logging
      console.log("Validation API productId:", validationResult);
      console.log(
        "SO items:",
        currentSOForValidation.items?.map((item) => ({
          whMaklonProductId: item.whMaklonProductId,
          whProductId: item.whProductId,
          productId: item.product?.id,
          productName: item.product?.name,
        }))
      );

      // Find matching item in current SO by trying multiple ID fields
      const foundItem = currentSOForValidation.items?.find(
        (item) =>
          item.whMaklonProductId === productId ||
          item.whProductId === productId ||
          item.product?.id === productId
      );

      if (foundItem && foundItem.product) {
        const productKey =
          foundItem.product.sku || foundItem.product.id?.toString() || "";

        // Increment scanned quantity
        setScannedQuantities((prev) => ({
          ...prev,
          [productKey]: (prev[productKey] || 0) + 1,
        }));

        // Mark product as validated
        setValidatedProducts(
          (prev) => new Set(Array.from(prev).concat(productKey))
        );
        message.success(
          `Produk ${foundItem.product.name} berhasil discan (${
            (scannedQuantities[productKey] || 0) + 1
          })`
        );
        setBarcodeInput("");
      } else {
        message.error(
          `Produk ${validationResult.data.product.name} tidak ditemukan dalam Sales Order ini`
        );
      }
    } catch (error) {
      console.error("Validation error:", error);
      message.error("Gagal memvalidasi barcode");
    }
  };

  // Handle SO selection from autocomplete
  const handleSOSelect = async (soNumber: string) => {
    try {
      setLoadingSODetails(true);

      // Fetch full SO details with items using raw API
      const rawSODetails = await getOzzyRawSalesOrderById(soNumber);

      if (rawSODetails) {
        // Check which property contains the items
        const items =
          rawSODetails.purchaseOrderItems ||
          rawSODetails.purchase_order_items ||
          [];

        if (items.length === 0) {
          console.warn("No items found in SO details");
          message.warning("Sales Order tidak memiliki item produk");
          return;
        }

        // Fetch actual product details for each item
        const itemsWithProducts = await Promise.all(
          items.map(async (item: any) => {
            const productId = item.whProductId || item.wh_product_id;
            const product = await getOzzyProductById(productId);

            return {
              id: item.id,
              whPackingId: 0,
              whPurchaseOrderItemId: item.id,
              whProductId: productId,
              whMaklonProductId:
                item.whMaklonProductId || item.wh_maklon_product_id,
              quantityPacked: item.quantity,
              unitType: item.unitType || item.unit_type,
              note: item.note,
              cartonNo: null,
              batchNo: null,
              createdAt: item.createdAt || item.created_at,
              updatedAt: item.updatedAt || item.updated_at,
              product: product
                ? {
                    id: product.id,
                    accurateId: product.accurateId,
                    accurateDbId: product.accurateDbId,
                    name: product.name,
                    sku: product.sku,
                    barcode: product.barcode,
                    unitType: product.unitType,
                    unitPrice: product.unitPrice,
                    unitData: product.quantity,
                    categoryId: 0,
                    categoryName: "",
                    quantity: product.quantity,
                    description: product.description,
                    createdAt: "",
                    updatedAt: "",
                    qrCodeImage: product.qrCodeImage || "",
                  }
                : {
                    id: productId,
                    accurateId: 0,
                    accurateDbId: 0,
                    name: `Product ${productId}`,
                    sku: `SKU-${productId}`,
                    barcode: "",
                    unitType: item.unitType || item.unit_type,
                    unitPrice: "0",
                    unitData: "0",
                    categoryId: 0,
                    categoryName: "",
                    quantity: "0",
                    description: null,
                    createdAt: "",
                    updatedAt: "",
                    qrCodeImage: "",
                  },
            };
          })
        );

        // Transform raw data to expected format
        const transformedSODetails: OzzyPackingData = {
          id: rawSODetails.id,
          whPurchaseOrderId: rawSODetails.id,
          whWarehouseId:
            rawSODetails.whWarehouseId || rawSODetails.wh_warehouse_id,
          whBranchId: rawSODetails.whBranchId || rawSODetails.wh_branch_id,
          packingNumber: null,
          status: rawSODetails.status,
          createdBy: rawSODetails.createdBy || rawSODetails.created_by || "",
          packedBy: "",
          packedAt: "",
          note: rawSODetails.note || null,
          createdAt: rawSODetails.createdAt || rawSODetails.created_at,
          updatedAt: rawSODetails.updatedAt || rawSODetails.updated_at,
          whDeliveryOrderId: null,
          whCustomerId:
            rawSODetails.whCustomerId || rawSODetails.wh_customer_id,
          totalQuantity: items.reduce(
            (sum: number, item: any) => sum + item.quantity,
            0
          ),
          purchaseOrder: {
            id: rawSODetails.id,
            whVendorId: rawSODetails.whVendorId || rawSODetails.wh_vendor_id,
            whCustomerId:
              rawSODetails.whCustomerId || rawSODetails.wh_customer_id,
            whWarehouseId:
              rawSODetails.whWarehouseId || rawSODetails.wh_warehouse_id,
            poNumber: rawSODetails.poNumber || rawSODetails.po_number,
            soNumber: rawSODetails.soNumber || rawSODetails.so_number,
            date: rawSODetails.date,
            supplierName:
              rawSODetails.supplierName || rawSODetails.supplier_name,
            shippingAddress:
              rawSODetails.shippingAddress || rawSODetails.shipping_address,
            note: rawSODetails.note,
            status: rawSODetails.status,
            createdBy: rawSODetails.createdBy || rawSODetails.created_by,
            whBranchId: rawSODetails.whBranchId || rawSODetails.wh_branch_id,
            createdAt: rawSODetails.createdAt || rawSODetails.created_at,
            updatedAt: rawSODetails.updatedAt || rawSODetails.updated_at,
            accurateIdOzzy:
              rawSODetails.accurateIdOzzy || rawSODetails.accurate_id_ozzy,
            accurateIdMpi:
              rawSODetails.accurateIdMpi || rawSODetails.accurate_id_mpi,
          },
          items: itemsWithProducts,
        };

        setCurrentSOForValidation(transformedSODetails);
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

  // Handle removing selected sales order
  const handleRemoveSalesOrder = (soNumber: string) => {
    setSelectedSalesOrders((prev) =>
      prev.filter((so) => so.soNumber !== soNumber)
    );
    message.success("Sales Order berhasil dihapus!");
  };

  const handleSubmit = async () => {
    if (selectedSalesOrders.length === 0) {
      message.warning("Silakan pilih minimal satu Sales Order untuk packing!");
      return;
    }

    const currentSO = selectedSalesOrders[0];

    if (!currentSO?.soNumber) {
      message.error("Nomor Sales Order tidak valid");
      return;
    }

    const productEntries = (currentSO.products || [])
      .map((product) => {
        const productId =
          product?.whProductId ??
          product?.productId ??
          product?.wh_product_id ??
          product?.id ??
          product?.product?.id;

        if (!productId) {
          return null;
        }

        const rawQuantity =
          product?.quantity ??
          product?.quantityPacked ??
          product?.quantity_packed ??
          product?.qty ??
          product?.amount ??
          0;

        const normalizedQuantity = Number(rawQuantity);
        const quantity = Number.isFinite(normalizedQuantity)
          ? normalizedQuantity
          : Number(rawQuantity ?? 0);

        if (!Number.isFinite(quantity) || quantity <= 0) {
          return null;
        }

        return {
          productId,
          quantity,
        };
      })
      .filter(
        (entry): entry is { productId: string | number; quantity: number } =>
          entry !== null
      );

    if (productEntries.length === 0) {
      message.warning("Tidak ada produk yang dapat diproses untuk packing");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await createOzzyPacking({
        soNumber: currentSO.soNumber,
        productQuantities: productEntries,
      });

      if (response?.status) {
        message.success(response?.message || "Packing berhasil disimpan");
        handleCancel();
      } else {
        message.error(response?.message || "Gagal menyimpan data packing");
      }
    } catch (error) {
      console.error("Error creating packing:", error);
      message.error("Gagal menyimpan data packing");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setIsSubmitting(false);
    form.resetFields();
    setSOSearchValue("");
    setSelectedSalesOrders([]);
    setShowSOValidationModal(false);
    setCurrentSOForValidation(null);
    setBarcodeInput("");
    setShowCameraScanner(false);
    onClose();
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

  // Create autocomplete options
  const soOptions = filteredSalesOrders.map((so) => ({
    value: so.soNumber || "",
    label: `${so.soNumber}`,
  }));

  return (
    <>
      <Modal
        title="Cari atau Scan Nomor SO"
        open={open}
        onCancel={handleCancel}
        footer={null}
        width={900}
        destroyOnHidden
      >
        <div className="py-4 space-y-6">
          <Form form={form} layout="vertical">
            {/* SO Search Section */}
            <div>
              <Typography.Title level={5} className="mb-4">
                {selectedSalesOrders.length === 0
                  ? "Cari atau Scan Nomor SO"
                  : "SO"}
              </Typography.Title>

              {selectedSalesOrders.length === 0 ? (
                <Form.Item>
                  <div className="flex gap-2">
                    <AutoComplete
                      value={soSearchValue}
                      onChange={setSOSearchValue}
                      onSelect={handleSOSelect}
                      placeholder="Ketik Nomor SO atau Scan Barcode"
                      options={soOptions}
                      filterOption={false}
                      notFoundContent={
                        isLoading ? (
                          <Spin size="small" />
                        ) : (
                          "Sales Order tidak ditemukan"
                        )
                      }
                      className="flex-1"
                      size="large"
                    />
                    <Button
                      type="default"
                      icon={<ScannerIcon size={16} />}
                      onClick={() => setShowCameraScanner(true)}
                      className="flex items-center gap-2"
                      size="large"
                    >
                      Scan QR
                    </Button>
                  </div>
                </Form.Item>
              ) : (
                <Form.Item>
                  <div className="flex gap-2 items-center">
                    <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                      <Text strong className="text-lg">
                        {selectedSalesOrders[0]?.soNumber}
                      </Text>
                    </div>
                    <Button
                      type="text"
                      danger
                      size="large"
                      onClick={() =>
                        handleRemoveSalesOrder(selectedSalesOrders[0]?.soNumber)
                      }
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      Hapus
                    </Button>
                  </div>
                </Form.Item>
              )}

              {/* Detail Item Section */}
              <div className="mt-6">
                <Typography.Title level={5} className="mb-4 text-center">
                  Detail Item
                </Typography.Title>

                <Table
                  dataSource={selectedSalesOrders.flatMap(
                    (so, soIndex) =>
                      so.products?.map((product, productIndex) => ({
                        key: `${so.soNumber}-${productIndex}`,
                        namaBarang: product.name || product.productName || "-",
                        sku: product.sku || product.productSku || "-",
                        kuantitas: product.quantity || 0,
                        satuan: product.unitType || "Pcs",
                        soNumber: so.soNumber,
                      })) || []
                  )}
                  columns={[
                    {
                      title: "Nama Barang",
                      dataIndex: "namaBarang",
                      key: "namaBarang",
                      width: "30%",
                    },
                    {
                      title: "SKU",
                      dataIndex: "sku",
                      key: "sku",
                      width: "20%",
                    },
                    {
                      title: "Kuantitas",
                      dataIndex: "kuantitas",
                      key: "kuantitas",
                      width: "15%",
                      align: "center",
                    },
                    {
                      title: "Satuan",
                      dataIndex: "satuan",
                      key: "satuan",
                      width: "15%",
                      align: "center",
                    },
                    {
                      title: "Aksi",
                      key: "aksi",
                      width: "20%",
                      align: "center",
                      render: (_, record) => (
                        <Button
                          type="text"
                          danger
                          size="small"
                          onClick={() =>
                            handleRemoveSalesOrder(record.soNumber)
                          }
                        >
                          Hapus
                        </Button>
                      ),
                    },
                  ]}
                  pagination={false}
                  locale={{
                    emptyText: "Tidak ada produk yang dipilih",
                  }}
                  size="small"
                  bordered
                />
              </div>
            </div>
          </Form>

          {/* Action Buttons */}
          <div className="flex justify-end">
            <Space>
              <Button onClick={handleCancel}>Cancel</Button>
              <Button
                type="primary"
                onClick={handleSubmit}
                disabled={selectedSalesOrders.length === 0 || isSubmitting}
                loading={isSubmitting}
                className="bg-green-600 hover:bg-green-700 border-green-600"
              >
                Save
              </Button>
            </Space>
          </div>
        </div>
      </Modal>

      {/* SO Validation Modal */}
      <Modal
        title={`Detail Item ${currentSOForValidation?.so_number || ""}`}
        open={showSOValidationModal}
        onCancel={() => {
          setShowSOValidationModal(false);
          setCurrentSOForValidation(null);
          setBarcodeInput("");
          setValidatedProducts(new Set());
          setScannedQuantities({});
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setShowSOValidationModal(false);
              setCurrentSOForValidation(null);
              setBarcodeInput("");
              setValidatedProducts(new Set());
              setScannedQuantities({});
            }}
          >
            Tutup
          </Button>,
          <Button
            key="confirm"
            type="primary"
            onClick={() => {
              if (currentSOForValidation) {
                const newSO: SelectedSalesOrder = {
                  // Use purchaseOrder.soNumber from transformed data
                  soNumber:
                    currentSOForValidation.purchaseOrder?.soNumber || "",
                  customerName:
                    currentSOForValidation.purchaseOrder?.supplierName || "",
                  shippingAddress:
                    currentSOForValidation.purchaseOrder?.shippingAddress || "",
                  date: currentSOForValidation.purchaseOrder?.date || "",
                  // Map from items (validated source) and align field names
                  products: (currentSOForValidation.items ?? []).map(
                    (item: any) => ({
                      id:
                        item.product?.id?.toString() ??
                        String(item.whProductId ?? ""),
                      name: item.product?.name || "-",
                      sku: item.product?.sku || "-",
                      quantity: item.quantityPacked ?? item.quantity ?? 0,
                      unitType: item.unitType || "Pcs",
                      whProductId: item.whProductId ?? item.product?.id,
                      productId:
                        item.product?.id?.toString() ??
                        String(item.whProductId ?? ""),
                    })
                  ),
                };

                setSelectedSalesOrders((prev) => [...prev, newSO]);
                setShowSOValidationModal(false);
                setCurrentSOForValidation(null);
                setBarcodeInput("");
                setValidatedProducts(new Set());
                setScannedQuantities({});
                setSOSearchValue("");
                message.success(
                  `Sales Order ${newSO.soNumber} berhasil ditambahkan`
                );
              }
            }}
            className="bg-blue-600 hover:bg-blue-700 border-blue-600"
          >
            Tambahkan
          </Button>,
        ]}
        width={900}
      >
        {currentSOForValidation && (
          <div className="space-y-4">
            {/* Barcode Scanning Section */}
            <div>
              <Typography.Title level={5} className="mb-3">
                Scan Barcode Produk (Lusin/Pcs)
              </Typography.Title>
              <div className="flex gap-2 mb-4">
                <Input
                  placeholder="Scan Barcode"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onPressEnter={() => handleBarcodeValidation(barcodeInput)}
                  className="flex-1"
                  size="large"
                />
                <Button
                  type="primary"
                  onClick={() => handleBarcodeValidation(barcodeInput)}
                  className="bg-yellow-500 hover:bg-yellow-600 border-yellow-500 text-black font-medium"
                  size="large"
                >
                  Validasi
                </Button>
              </div>
            </div>

            {/* Product Validation Table */}
            <div>
              <Table
                columns={[
                  {
                    title: "Sesuai",
                    dataIndex: "validated",
                    key: "validated",
                    width: "80px",
                    align: "center",
                    render: (_, record) => {
                      const productKey =
                        record.product?.sku ||
                        record.product?.id?.toString() ||
                        "";
                      const isValidated = validatedProducts.has(productKey);
                      const scannedQty = scannedQuantities[productKey] || 0;
                      const realQty = record.quantityPacked || 0;
                      const quantitiesMatch = scannedQty === realQty;

                      return (
                        <Checkbox
                          checked={isValidated && quantitiesMatch}
                          disabled={!quantitiesMatch}
                          onChange={(e) => {
                            if (e.target.checked && quantitiesMatch) {
                              setValidatedProducts(
                                (prev) =>
                                  new Set(Array.from(prev).concat(productKey))
                              );
                            } else {
                              // When unchecked, remove from validated products
                              setValidatedProducts((prev) => {
                                const newSet = new Set(prev);
                                newSet.delete(productKey);
                                return newSet;
                              });
                            }
                          }}
                        />
                      );
                    },
                  },
                  {
                    title: "Nama Barang",
                    dataIndex: "name",
                    key: "name",
                    render: (_, record) => record.product?.name || "-",
                  },
                  {
                    title: "SKU",
                    dataIndex: "sku",
                    key: "sku",
                    width: "120px",
                    render: (_, record) => record.product?.sku || "-",
                  },
                  {
                    title: "Kuantitas Real",
                    dataIndex: "quantityPacked",
                    key: "quantityPacked",
                    width: "120px",
                    align: "center",
                    render: (_, record) => record.quantityPacked || 0,
                  },
                  {
                    title: "Kuantitas Scan",
                    dataIndex: "scanned_quantity",
                    key: "scanned_quantity",
                    width: "120px",
                    align: "center",
                    render: (_, record) => {
                      const productKey =
                        record.product?.sku ||
                        record.product?.id?.toString() ||
                        "";
                      const currentValue = scannedQuantities[productKey] || 0;
                      return (
                        <Input
                          type="number"
                          value={currentValue}
                          onChange={(e) => {
                            const newValue = parseInt(e.target.value) || 0;
                            setScannedQuantities((prev) => ({
                              ...prev,
                              [productKey]: newValue,
                            }));

                            // If quantities don't match, remove from validated products
                            if (newValue !== (record.quantityPacked || 0)) {
                              setValidatedProducts((prev) => {
                                const newSet = new Set(prev);
                                newSet.delete(productKey);
                                return newSet;
                              });
                            }
                          }}
                          style={{ width: "80px", textAlign: "center" }}
                          min={0}
                        />
                      );
                    },
                  },
                  {
                    title: "Satuan",
                    dataIndex: "unitType",
                    key: "unitType",
                    width: "100px",
                    align: "center",
                    render: (_, record) => record.unitType || "Pcs",
                  },
                ]}
                dataSource={currentSOForValidation.items?.map(
                  (item, index) => ({
                    ...item,
                    key: index,
                  })
                )}
                pagination={false}
                size="middle"
                bordered
              />
            </div>
          </div>
        )}
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
        maskStyle={{ zIndex: 1999 }}
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

export default ModalPacking;
