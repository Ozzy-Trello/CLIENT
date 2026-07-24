"use client";

import { SkeletonTable } from "@components/skeleton";
import {
  Avatar,
  Badge,
  Button,
  Menu,
  MenuProps,
  Table,
  Typography,
  Modal,
  Form,
  Input,
  Select,
  Space,
  message,
  Spin,
  Tooltip,
  Tabs,
  Card,
  Upload,
  Progress,
  Alert,
  Dropdown,
  Divider,
  List,
  Tag,
  ColorPicker,
  Switch,
} from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import {
  Edit,
  Plus,
  Settings,
  Trash,
  Database,
  Package2,
  Palette,
  Box,
  Upload as UploadIcon,
  Download,
  FileText,
  Copy,
} from "lucide-react";
import { usePermissions } from "@hooks/account";

// Import API functions
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  bulkInsertProducts,
  updateProductOrder,
  Product as ProductAPI,
  ProductCreateRequest,
  ProductUpdateRequest,
  ProductBulkInsertRequest,
  ProductBulkInsertResult,
  ProductOrderUpdateRequest,
} from "@api/product";
import {
  getBahans,
  createBahan,
  updateBahan,
  deleteBahan,
  bulkInsertBahans,
  Bahan as BahanAPI,
  BahanCreateRequest,
  BahanUpdateRequest,
  BahanBulkInsertRequest,
  BahanBulkInsertResult,
} from "@api/bahan";
import {
  getWarnas,
  createWarna,
  updateWarna,
  deleteWarna,
  Warna as WarnaAPI,
  WarnaCreateRequest,
  WarnaUpdateRequest,
} from "@api/warna";
import {
  hierarchicalBulkUpload,
  parseHierarchicalCSV,
  HierarchicalBulkUploadResult,
} from "@api/hierarchical-bulk-upload";
import {
  getProductCodes,
  createProductCode,
  updateProductCode,
  deleteProductCode,
  bulkInsertProductCodes,
  ProductCode as ProductCodeAPI,
  ProductCodeCreateRequest,
  ProductCodeUpdateRequest,
  ProductCodeBulkInsertRequest,
  ProductCodeBulkInsertResult,
} from "@api/product-code";
import {
  uploadDesignTypeImageZip,
  DesignZipUploadResult,
} from "@api/design-master-data";
import { uploadFile } from "@api/file";

type MenuItem = Required<MenuProps>["items"][number];

// Use API interfaces with aliases to match component needs
type Product = ProductAPI;

type Bahan = BahanAPI;

type Warna = WarnaAPI;

type ProductCode = ProductCodeAPI;

const ProductTable: React.FC<{
  dataSource?: Product[];
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onReorder: (products: Product[]) => void;
  loading?: boolean;
}> = ({ dataSource = [], onEdit, onDelete, onReorder, loading = false }) => {
  const { isSuperAdmin } = usePermissions();

  // Sort products by order field (ascending)
  const sortedProducts = [...dataSource].sort(
    (a, b) => (a.order || 0) - (b.order || 0)
  );

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(sortedProducts);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update order values based on new positions
    const updatedItems = items.map((item, index) => ({
      ...item,
      order: index,
    }));

    onReorder(updatedItems);
  };

  if (loading) {
    return (
      <Spin
        size="large"
        style={{ display: "block", textAlign: "center", padding: "50px" }}
      />
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="products">
        {(provided) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            style={{ width: "100%" }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "40px 1fr 1fr 96px 96px 120px",
                gap: "8px",
                padding: "8px 16px",
                backgroundColor: "#fafafa",
                borderBottom: "1px solid #f0f0f0",
                fontWeight: "bold",
              }}
            >
              <div></div>
              <div>Product Name</div>
              <div>Form Display</div>
              <div>Image</div>
              <div>Show In Form</div>
              <div>Actions</div>
            </div>
            {sortedProducts.map((product, index) => (
              <Draggable
                key={product.id}
                draggableId={product.id}
                index={index}
                isDragDisabled={!isSuperAdmin()}
              >
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    style={{
                      ...provided.draggableProps.style,
                      display: "grid",
                      gridTemplateColumns: "40px 1fr 1fr 96px 96px 120px",
                      gap: "8px",
                      padding: "12px 16px",
                      backgroundColor: snapshot.isDragging ? "#e6f7ff" : "#fff",
                      border: snapshot.isDragging
                        ? "1px solid #1890ff"
                        : "1px solid #f0f0f0",
                      borderRadius: "4px",
                      marginBottom: "4px",
                      alignItems: "center",
                      cursor: isSuperAdmin() ? "grab" : "default",
                    }}
                  >
                    <div
                      {...provided.dragHandleProps}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#8c8c8c",
                        fontSize: "16px",
                        cursor: isSuperAdmin() ? "grab" : "default",
                      }}
                    >
                      {isSuperAdmin() ? "⋮⋮" : ""}
                    </div>
                    <div>
                      <Typography.Text strong>{product.name}</Typography.Text>
                    </div>
                    <div>
                      <Typography.Text>{product.formDisplayName || "-"}</Typography.Text>
                    </div>
                    <div>
                      {product.formImageUrl ? (
                        <Avatar shape="square" size={48} src={product.formImageUrl} />
                      ) : (
                        "-"
                      )}
                    </div>
                    <div>
                      <Tag color={product.showInForm ? "green" : "default"}>
                        {product.showInForm ? "Yes" : "No"}
                      </Tag>
                    </div>
                    <div>
                      <Space size="small">
                        <Tooltip title="Edit product">
                          <Button
                            type="text"
                            icon={<Edit size={16} />}
                            onClick={() => onEdit(product)}
                            disabled={!isSuperAdmin()}
                            size="small"
                          />
                        </Tooltip>
                        <Tooltip title="Delete product">
                          <Button
                            type="text"
                            danger
                            icon={<Trash size={16} />}
                            onClick={() => onDelete(product)}
                            disabled={!isSuperAdmin()}
                            size="small"
                          />
                        </Tooltip>
                      </Space>
                    </div>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
};

const BahanTable: React.FC<{
  dataSource?: Bahan[];
  onEdit: (bahan: Bahan) => void;
  onDelete: (bahan: Bahan) => void;
  loading?: boolean;
}> = ({ dataSource = [], onEdit, onDelete, loading = false }) => {
  const { isSuperAdmin } = usePermissions();

  const columns = [
    {
      title: "Bahan Name",
      dataIndex: "name",
      key: "name",
      render: (name: string) => (
        <Typography.Text strong>{name}</Typography.Text>
      ),
    },
    {
      title: "Product",
      dataIndex: "productName",
      key: "productName",
      render: (productName: string) => productName || "-",
    },
    {
      title: "Recommended",
      dataIndex: "formRecommended",
      key: "formRecommended",
      render: (recommended: boolean) => recommended ? <Tag color="green">Recommended</Tag> : "-",
    },

    {
      title: "Action",
      key: "action",
      render: (_: any, record: Bahan) => (
        <Space size="middle">
          <Tooltip title="Edit bahan">
            <Button
              type="text"
              icon={<Edit size={16} />}
              onClick={() => onEdit(record)}
              disabled={!isSuperAdmin()}
            />
          </Tooltip>
          <Tooltip title="Delete bahan">
            <Button
              type="text"
              danger
              icon={<Trash size={16} />}
              onClick={() => onDelete(record)}
              disabled={!isSuperAdmin()}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Table
      dataSource={dataSource}
      columns={columns}
      loading={loading}
      rowKey="id"
      style={{ width: "100%" }}
    />
  );
};

const WarnaTable: React.FC<{
  dataSource?: Warna[];
  onEdit: (warna: Warna) => void;
  onDelete: (warna: Warna) => void;
  loading?: boolean;
  pagination?: any;
}> = ({ dataSource = [], onEdit, onDelete, loading = false, pagination }) => {
  const { isSuperAdmin } = usePermissions();

  const columns = [
    {
      title: "Warna Name",
      dataIndex: "name",
      key: "name",
      render: (name: string) => (
        <Typography.Text strong>{name}</Typography.Text>
      ),
    },
    {
      title: "Color",
      dataIndex: "hexCode",
      key: "hexCode",
      render: (hexCode: string) => (
        <Space>
          {hexCode && (
            <div
              style={{
                width: 20,
                height: 20,
                backgroundColor: hexCode,
                border: "1px solid #d9d9d9",
                borderRadius: 4,
                display: "inline-block",
              }}
            />
          )}
          <Typography.Text code>{hexCode || "-"}</Typography.Text>
        </Space>
      ),
    },
    {
      title: "Code",
      dataIndex: "code",
      key: "code",
      render: (code: string) => (
        <Typography.Text>{code || "-"}</Typography.Text>
      ),
    },
    {
      title: "Bahan",
      dataIndex: "bahanName",
      key: "bahanName",
      render: (bahanName: string) => bahanName || "-",
    },
    {
      title: "Product",
      dataIndex: "productName",
      key: "productName",
      render: (productName: string) => productName || "-",
    },
    {
      title: "Action",
      key: "action",
      render: (_: any, record: Warna) => (
        <Space size="middle">
          <Tooltip title="Edit warna">
            <Button
              type="text"
              icon={<Edit size={16} />}
              onClick={() => onEdit(record)}
              disabled={!isSuperAdmin()}
            />
          </Tooltip>
          <Tooltip title="Delete warna">
            <Button
              type="text"
              danger
              icon={<Trash size={16} />}
              onClick={() => onDelete(record)}
              disabled={!isSuperAdmin()}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Table
      dataSource={dataSource}
      columns={columns}
      loading={loading}
      rowKey="id"
      style={{ width: "100%" }}
      pagination={pagination}
    />
  );
};

const ProductCodeTable: React.FC<{
  dataSource?: ProductCode[];
  onEdit: (productCode: ProductCode) => void;
  onDelete: (productCode: ProductCode) => void;
  loading?: boolean;
}> = ({ dataSource = [], onEdit, onDelete, loading = false }) => {
  const { isSuperAdmin } = usePermissions();

  const columns = [
    {
      title: "Product Name",
      dataIndex: ["product", "name"],
      key: "product_name",
      render: (text: string, record: ProductCode) => (
        <span>{record.product?.name || "-"}</span>
      ),
    },
    {
      title: "Product Code",
      dataIndex: "code",
      key: "code",
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      render: (text: string) => text || "-",
    },

    {
      title: "Actions",
      key: "actions",
      render: (text: any, record: ProductCode) => (
        <Space>
          <Tooltip title="Edit Product Code">
            <Button
              type="text"
              icon={<Edit size={16} />}
              onClick={() => onEdit(record)}
              disabled={!isSuperAdmin()}
            />
          </Tooltip>
          <Tooltip title="Delete Product Code">
            <Button
              type="text"
              danger
              icon={<Trash size={16} />}
              onClick={() => onDelete(record)}
              disabled={!isSuperAdmin()}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Table
      dataSource={dataSource}
      columns={columns}
      loading={loading}
      rowKey="id"
      style={{ width: "100%" }}
    />
  );
};

// Custom ColorPicker component that integrates with Ant Design Form
const ColorPickerInput: React.FC<{
  value?: string;
  onChange?: (value: string) => void;
}> = ({ value, onChange }) => {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
      <ColorPicker
        defaultFormat="hex"
        format="hex"
        disabledAlpha={false}
        value={value || "#000000"}
        onChange={(color) => {
          const hexValue = color.toHexString();
          onChange?.(hexValue);
        }}
        showText={false}
      />
      <Input
        placeholder="Enter hex color code (e.g., #FF0000)"
        value={value}
        onChange={(e) => {
          onChange?.(e.target.value);
        }}
        style={{ flex: 1 }}
      />
    </div>
  );
};

const MasterData: React.FC = () => {
  const { workspaceId } = useParams();
  const resolvedWorkspaceId = Array.isArray(workspaceId)
    ? workspaceId[0]
    : (workspaceId as string);

  const { isSuperAdmin } = usePermissions();

  // State for all four entities
  const [products, setProducts] = useState<Product[]>([]);
  const [productCodes, setProductCodes] = useState<ProductCode[]>([]);
  const [bahans, setBahans] = useState<Bahan[]>([]);
  const [warnas, setWarnas] = useState<Warna[]>([]);

  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingProductCodes, setLoadingProductCodes] = useState(false);
  const [loadingBahans, setLoadingBahans] = useState(false);
  const [loadingWarnas, setLoadingWarnas] = useState(false);

  // Pagination state for warna table
  const [warnaPagination, setWarnaPagination] = useState({
    currentPage: 1,
    pageSize: 10,
    totalData: 0,
    totalPage: 0,
  });

  // Search/filter state
  const [productSearch, setProductSearch] = useState('');
  const [bahanSearch, setBahanSearch] = useState('');
  const [bahanProductFilter, setBahanProductFilter] = useState<string | undefined>(undefined);
  const [warnaSearch, setWarnaSearch] = useState('');
  const [warnabahanFilter, setWarnabahanFilter] = useState<string | undefined>(undefined);

  // Loading states for operations
  const [submittingProduct, setSubmittingProduct] = useState(false);
  const [productImageUploading, setProductImageUploading] = useState(false);
  const [submittingProductCode, setSubmittingProductCode] = useState(false);
  const [submittingBahan, setSubmittingBahan] = useState(false);
  const [submittingWarna, setSubmittingWarna] = useState(false);

  // Ref to track if data has been fetched
  const dataFetched = useRef(false);

  // Bulk upload states
  const [bulkUploadVisible, setBulkUploadVisible] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] =
    useState<ProductBulkInsertResult | null>(null);

  // Product Code bulk upload states
  const [productCodeBulkUploadVisible, setProductCodeBulkUploadVisible] =
    useState(false);
  const [productCodeUploadProgress, setProductCodeUploadProgress] = useState(0);
  const [productCodeUploading, setProductCodeUploading] = useState(false);
  const [productCodeUploadResult, setProductCodeUploadResult] =
    useState<ProductCodeBulkInsertResult | null>(null);

  // Bahan bulk upload states
  const [bahanBulkUploadVisible, setBahanBulkUploadVisible] = useState(false);
  const [bahanUploadProgress, setBahanUploadProgress] = useState(0);
  const [bahanUploading, setBahanUploading] = useState(false);
  const [bahanUploadResult, setBahanUploadResult] =
    useState<BahanBulkInsertResult | null>(null);

  // Hierarchical bulk upload states
  const [hierarchicalBulkUploadVisible, setHierarchicalBulkUploadVisible] =
    useState(false);
  const [hierarchicalUploadProgress, setHierarchicalUploadProgress] =
    useState(0);
  const [hierarchicalUploading, setHierarchicalUploading] = useState(false);
  const [hierarchicalUploadResult, setHierarchicalUploadResult] =
    useState<HierarchicalBulkUploadResult | null>(null);
  const [hierarchicalPreviewData, setHierarchicalPreviewData] = useState<import("@api/hierarchical-bulk-upload").CSVRow[] | null>(null);
  const [hierarchicalPreviewFile, setHierarchicalPreviewFile] = useState<File | null>(null);

  const [zipLibraryUploadVisible, setZipLibraryUploadVisible] = useState(false);
  const [zipLibraryUploading, setZipLibraryUploading] = useState(false);
  const [zipLibraryUploadProgress, setZipLibraryUploadProgress] = useState(0);
  const [zipLibraryUploadResult, setZipLibraryUploadResult] =
    useState<DesignZipUploadResult | null>(null);

  // Regular bulk upload modal state
  const [regularBulkUploadVisible, setRegularBulkUploadVisible] =
    useState(false);

  // Modal states
  const [productModalVisible, setProductModalVisible] = useState(false);
  const [productCodeModalVisible, setProductCodeModalVisible] = useState(false);
  const [bahanModalVisible, setBahanModalVisible] = useState(false);
  const [warnaModalVisible, setWarnaModalVisible] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedProductCode, setSelectedProductCode] =
    useState<ProductCode | null>(null);
  const [selectedBahan, setSelectedBahan] = useState<Bahan | null>(null);
  const [selectedWarna, setSelectedWarna] = useState<Warna | null>(null);

  // Forms
  const [productForm] = Form.useForm();
  const [productCodeForm] = Form.useForm();
  const [bahanForm] = Form.useForm();
  const [warnaForm] = Form.useForm();

  const selectedWarnaProductId = Form.useWatch("productId", warnaForm);
  const productFormImageUrl = Form.useWatch("formImageUrl", productForm);
  const filteredBahansForWarna = useMemo(() => {
    if (!selectedWarnaProductId) {
      return [];
    }

    return bahans.filter((bahan) => bahan.productId === selectedWarnaProductId);
  }, [bahans, selectedWarnaProductId]);

  // Handle product reorder
  const handleProductReorder = async (reorderedProducts: Product[]) => {
    // Optimistic update
    const previousProducts = [...products];
    setProducts(reorderedProducts);

    try {
      // Always update all products when drag and drop occurs to ensure consistency
      const updatePromises = reorderedProducts.map((product, index) => {
        return updateProductOrder(product.id, { order: index });
      });

      const results = await Promise.all(updatePromises);

      message.success("Product order updated successfully");
    } catch (error) {
      // Revert optimistic update on error
      setProducts(previousProducts);
      message.error("Failed to update product order");
      console.error("❌ Error updating product order:", error);
    }
  };

  // Handle warna pagination change
  const handleWarnaPaginationChange = (page: number, pageSize?: number) => {
    const newPageSize = pageSize || warnaPagination.pageSize;
    fetchWarnas(page, newPageSize, warnabahanFilter, warnaSearch);
  };

  // Handle edit warna
  const handleEditWarna = (warna: Warna) => {
    const relatedBahan = bahans.find((bahan) => bahan.id === warna.bahanId);

    setSelectedWarna(warna);
    warnaForm.setFieldsValue({
      ...warna,
      productId: relatedBahan?.productId,
      bahanId: warna.bahanId,
    });
    setWarnaModalVisible(true);
  };

  // Handle delete warna with confirmation
  const handleDeleteWarna = (warna: Warna) => {
    Modal.confirm({
      title: "Delete Warna",
      content: `Are you sure you want to delete ${warna.name}?`,
      onOk: () => deleteWarnaConfirmed(warna),
    });
  };

  // Actual delete function
  const deleteWarnaConfirmed = async (warna: Warna) => {
    try {
      await deleteWarna(warna.id);
      message.success("Warna deleted successfully");
      fetchWarnas(warnaPagination.currentPage, warnaPagination.pageSize, warnabahanFilter, warnaSearch);
    } catch (error) {
      message.error("Failed to delete warna");
      console.error("Error deleting warna:", error);
    }
  };

  // Tab items
  const tabItems = [
    {
      key: "products",
      label: (
        <span>
          <Package2 size={16} style={{ marginRight: 8 }} />
          Products ({products.length})
        </span>
      ),
      children: (
        <div>
          <div
            style={{
              marginBottom: 16,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography.Title level={4} style={{ margin: 0 }}>
              Products Management
            </Typography.Title>
            <Space>
              <Input.Search
                placeholder="Search products..."
                allowClear
                style={{ width: 220 }}
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                onSearch={(v) => setProductSearch(v)}
              />
              <Button
                icon={<UploadIcon size={16} />}
                onClick={() => {
                  setBulkUploadVisible(true);
                  setUploadResult(null);
                }}
                disabled={!isSuperAdmin()}
              >
                Bulk Upload
              </Button>
              <Button
                type="primary"
                icon={<Plus size={16} />}
                onClick={() => {
                  setSelectedProduct(null);
                  productForm.resetFields();
                  setProductModalVisible(true);
                }}
                disabled={!isSuperAdmin()}
              >
                Add Product
              </Button>
            </Space>
          </div>
          <ProductTable
            dataSource={products.filter((p) =>
              productSearch.trim()
                ? p.name.toLowerCase().includes(productSearch.trim().toLowerCase())
                : true
            )}
            onEdit={(product) => {
              setSelectedProduct(product);
              productForm.setFieldsValue(product);
              setProductModalVisible(true);
            }}
            onDelete={(product) => {
              Modal.confirm({
                title: "Delete Product",
                content: `Are you sure you want to delete ${product.name}?`,
                onOk: () => handleDeleteProduct(product),
              });
            }}
            onReorder={handleProductReorder}
            loading={loadingProducts}
          />
        </div>
      ),
    },
    {
      key: "product-codes",
      label: (
        <span>
          <FileText size={16} style={{ marginRight: 8 }} />
          Product Codes ({productCodes.length})
        </span>
      ),
      children: (
        <div>
          <div
            style={{
              marginBottom: 16,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography.Title level={4} style={{ margin: 0 }}>
              Product Codes Management
            </Typography.Title>
            <Space>
              <Button
                icon={<UploadIcon size={16} />}
                onClick={() => {
                  setProductCodeBulkUploadVisible(true);
                  setProductCodeUploadResult(null);
                }}
                disabled={!isSuperAdmin()}
              >
                Bulk Upload
              </Button>
              <Button
                type="primary"
                icon={<Plus size={16} />}
                onClick={() => {
                  setSelectedProductCode(null);
                  productCodeForm.resetFields();
                  setProductCodeModalVisible(true);
                }}
                disabled={!isSuperAdmin()}
              >
                Add Product Code
              </Button>
            </Space>
          </div>
          <ProductCodeTable
            dataSource={productCodes}
            onEdit={(productCode) => {
              setSelectedProductCode(productCode);
              productCodeForm.setFieldsValue(productCode);
              setProductCodeModalVisible(true);
            }}
            onDelete={(productCode) => {
              Modal.confirm({
                title: "Delete Product Code",
                content: `Are you sure you want to delete ${productCode.code}?`,
                onOk: () => handleDeleteProductCode(productCode),
              });
            }}
            loading={loadingProductCodes}
          />
        </div>
      ),
    },
    {
      key: "bahans",
      label: (
        <span>
          <Box size={16} style={{ marginRight: 8 }} />
          Bahan ({bahans.length})
        </span>
      ),
      children: (
        <div>
          <div
            style={{
              marginBottom: 16,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography.Title level={4} style={{ margin: 0 }}>
              Bahan Management
            </Typography.Title>
            <Space>
              <Select
                placeholder="Filter by product"
                allowClear
                style={{ width: 200 }}
                value={bahanProductFilter}
                onChange={(v) => setBahanProductFilter(v)}
                showSearch
                optionFilterProp="label"
                options={products.map((p) => ({ value: p.id, label: p.name }))}
              />
              <Input.Search
                placeholder="Search bahan..."
                allowClear
                style={{ width: 200 }}
                value={bahanSearch}
                onChange={(e) => setBahanSearch(e.target.value)}
                onSearch={(v) => setBahanSearch(v)}
              />
              <Button
                type="primary"
                icon={<Plus size={16} />}
                onClick={() => {
                  setSelectedBahan(null);
                  bahanForm.resetFields();
                  bahanForm.setFieldValue("formRecommended", false);
                  setBahanModalVisible(true);
                }}
                disabled={!isSuperAdmin()}
              >
                Add Bahan
              </Button>
            </Space>
          </div>
          <BahanTable
            dataSource={bahans}
            onEdit={(bahan) => {
              setSelectedBahan(bahan);
              bahanForm.setFieldsValue({
                ...bahan,
                productId: bahan.productId,
              });
              setBahanModalVisible(true);
            }}
            onDelete={(bahan) => {
              Modal.confirm({
                title: "Delete Bahan",
                content: `Are you sure you want to delete ${bahan.name}?`,
                onOk: () => handleDeleteBahan(bahan),
              });
            }}
            loading={loadingBahans}
          />
        </div>
      ),
    },
    {
      key: "warnas",
      label: (
        <span>
          <Palette size={16} style={{ marginRight: 8 }} />
          Warna ({warnaPagination.totalData})
        </span>
      ),
      children: (
        <div>
          <div
            style={{
              marginBottom: 16,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography.Title level={4} style={{ margin: 0 }}>
              Warna Management
            </Typography.Title>
            <Space>
              <Select
                placeholder="Filter by bahan"
                allowClear
                style={{ width: 200 }}
                value={warnabahanFilter}
                onChange={(v) => setWarnabahanFilter(v)}
                showSearch
                optionFilterProp="label"
                options={bahans.map((b) => ({
                  value: b.id,
                  label: `${b.name}${b.productName ? ` (${b.productName})` : ''}`,
                }))}
              />
              <Input.Search
                placeholder="Search warna..."
                allowClear
                style={{ width: 200 }}
                value={warnaSearch}
                onChange={(e) => setWarnaSearch(e.target.value)}
                onSearch={(v) => setWarnaSearch(v)}
              />
              <Button
                type="primary"
                icon={<Plus size={16} />}
                onClick={() => {
                  setSelectedWarna(null);
                  warnaForm.resetFields();
                  setWarnaModalVisible(true);
                }}
                disabled={!isSuperAdmin()}
              >
                Add Warna
              </Button>
            </Space>
          </div>
          <WarnaTable
            dataSource={warnas}
            onEdit={handleEditWarna}
            onDelete={handleDeleteWarna}
            loading={loadingWarnas}
            pagination={{
              current: warnaPagination.currentPage,
              pageSize: warnaPagination.pageSize,
              total: warnaPagination.totalData,
              showSizeChanger: false,
              showQuickJumper: true,
              showTotal: (total: number, range: [number, number]) =>
                `${range[0]}-${range[1]} of ${total} items`,
              onChange: handleWarnaPaginationChange,
            }}
          />
        </div>
      ),
    },
  ];

  // Data fetching functions
  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      const response = await getProducts(1, 1000);
      if (response.data) {
        setProducts(response.data);
      }
    } catch (error) {
      message.error("Failed to fetch products");
      console.error("Error fetching products:", error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchProductCodes = async () => {
    try {
      setLoadingProductCodes(true);
      const response = await getProductCodes(1, 1000);
      if (response.data) {
        setProductCodes(response.data);
      }
    } catch (error) {
      message.error("Failed to fetch product codes");
      console.error("Error fetching product codes:", error);
    } finally {
      setLoadingProductCodes(false);
    }
  };

  const fetchBahans = async (search?: string, productId?: string) => {
    try {
      setLoadingBahans(true);
      const response = await getBahans(1, 1000, productId, search);
      if (response.data) {
        setBahans(response.data);
      }
    } catch (error) {
      message.error("Failed to fetch bahan");
      console.error("Error fetching bahan:", error);
    } finally {
      setLoadingBahans(false);
    }
  };

  const fetchWarnas = async (page: number = 1, limit: number = 10, bahanId?: string, search?: string) => {
    try {
      setLoadingWarnas(true);
      const response = await getWarnas(page, limit, bahanId, search);
      if (response.data) {
        setWarnas(response.data);
      }
      // Update pagination info from API response
      if (response.paginate) {
        setWarnaPagination({
          currentPage: response.paginate.page,
          pageSize: response.paginate.limit,
          totalData: response.paginate.totalData,
          totalPage: response.paginate.totalPage,
        });
      }
    } catch (error) {
      message.error("Failed to fetch warna");
      console.error("Error fetching warna:", error);
    } finally {
      setLoadingWarnas(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    // Only fetch once when user is super admin
    if (isSuperAdmin() && !dataFetched.current) {
      dataFetched.current = true;
      fetchProducts();
      fetchProductCodes();
      fetchBahans();
      fetchWarnas(1, 10); // Use pagination for warnas
    }
  }, [isSuperAdmin()]);

  // Re-fetch bahan when search/filter changes
  useEffect(() => {
    if (dataFetched.current) {
      fetchBahans(bahanSearch, bahanProductFilter);
    }
  }, [bahanSearch, bahanProductFilter]);

  // Re-fetch warna when search/filter changes (reset to page 1)
  useEffect(() => {
    if (dataFetched.current) {
      fetchWarnas(1, warnaPagination.pageSize, warnabahanFilter, warnaSearch);
    }
  }, [warnaSearch, warnabahanFilter]);

  const handleDeleteProduct = async (product: Product) => {
    try {
      await deleteProduct(product.id);
      message.success("Product deleted successfully");
      fetchProducts();
      fetchBahans(bahanSearch, bahanProductFilter);
      fetchWarnas(1, warnaPagination.pageSize, warnabahanFilter, warnaSearch);
    } catch (error) {
      message.error("Failed to delete product");
      console.error("Error deleting product:", error);
    }
  };

  const handleDeleteBahan = async (bahan: Bahan) => {
    try {
      await deleteBahan(bahan.id);
      message.success("Bahan deleted successfully");
      fetchBahans(bahanSearch, bahanProductFilter);
      fetchWarnas(1, warnaPagination.pageSize, warnabahanFilter, warnaSearch);
    } catch (error) {
      message.error("Failed to delete bahan");
      console.error("Error deleting bahan:", error);
    }
  };

  const handleDeleteProductCode = async (productCode: ProductCode) => {
    try {
      await deleteProductCode(productCode.id);
      message.success("Product code deleted successfully");
      fetchProductCodes();
    } catch (error) {
      message.error("Failed to delete product code");
      console.error("Error deleting product code:", error);
    }
  };

  const handleProductSubmit = async (
    values: ProductCreateRequest | ProductUpdateRequest
  ) => {
    try {
      setSubmittingProduct(true);
      if (selectedProduct) {
        await updateProduct(selectedProduct.id, values);
        message.success("Product updated successfully");
      } else {
        await createProduct(values as ProductCreateRequest);
        message.success("Product created successfully");
      }
      setProductModalVisible(false);
      fetchProducts();
    } catch (error) {
      message.error(
        selectedProduct
          ? "Failed to update product"
          : "Failed to create product"
      );
      console.error("Error with product:", error);
    } finally {
      setSubmittingProduct(false);
    }
  };

  const handleProductImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      message.error("Please upload an image file");
      return;
    }

    try {
      setProductImageUploading(true);
      const response = await uploadFile(file, {
        name: file.name,
        prefix: "product-form-images",
        type: "product-form-image",
      });
      if (!response.data?.url) throw new Error("Upload did not return a URL");
      productForm.setFieldValue("formImageUrl", response.data.url);
      message.success("Product image uploaded");
    } catch (error) {
      message.error("Failed to upload product image");
      console.error("Error uploading product image:", error);
    } finally {
      setProductImageUploading(false);
    }
  };

  const handleBahanSubmit = async (values: any) => {
    try {
      setSubmittingBahan(true);
      const bahanData = {
        name: values.name,
        productId: values.productId,
        formRecommended: values.formRecommended ?? false,
      };

      if (selectedBahan) {
        await updateBahan(selectedBahan.id, bahanData);
        message.success("Bahan updated successfully");
      } else {
        await createBahan(bahanData);
        message.success("Bahan created successfully");
      }
      setBahanModalVisible(false);
      fetchBahans(bahanSearch, bahanProductFilter);
    } catch (error) {
      message.error(
        selectedBahan ? "Failed to update bahan" : "Failed to create bahan"
      );
      console.error("Error with bahan:", error);
    } finally {
      setSubmittingBahan(false);
    }
  };

  const handleWarnaSubmit = async (values: any) => {
    try {
      setSubmittingWarna(true);
      const warnaData = {
        name: values.name,
        bahanId: values.bahanId,
        hexCode: values.hexCode,
        code: values.code,
      };

      if (selectedWarna) {
        await updateWarna(selectedWarna.id, warnaData);
        message.success("Warna updated successfully");
      } else {
        await createWarna(warnaData);
        message.success("Warna created successfully");
      }
      setWarnaModalVisible(false);
      fetchWarnas(warnaPagination.currentPage, warnaPagination.pageSize, warnabahanFilter, warnaSearch);
    } catch (error) {
      message.error(
        selectedWarna ? "Failed to update warna" : "Failed to create warna"
      );
      console.error("Error with warna:", error);
    } finally {
      setSubmittingWarna(false);
    }
  };

  const handleProductCodeSubmit = async (
    values: ProductCodeCreateRequest | ProductCodeUpdateRequest
  ) => {
    try {
      setSubmittingProductCode(true);
      if (selectedProductCode) {
        await updateProductCode(selectedProductCode.id, values);
        message.success("Product code updated successfully");
      } else {
        await createProductCode(values as ProductCodeCreateRequest);
        message.success("Product code created successfully");
      }
      setProductCodeModalVisible(false);
      fetchProductCodes();
    } catch (error) {
      message.error(
        selectedProductCode
          ? "Failed to update product code"
          : "Failed to create product code"
      );
      console.error("Error with product code:", error);
    } finally {
      setSubmittingProductCode(false);
    }
  };

  // CSV parsing function for products (only name field)
  const parseCSV = (csvText: string): { name: string }[] => {
    const lines = csvText.split("\n");
    const result: { name: string }[] = [];

    // Skip header if present
    const startIndex = lines[0]?.toLowerCase().includes("name") ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const columns = line
        .split(",")
        .map((col) => col.trim().replace(/"/g, ""));
      if (columns.length >= 1) {
        result.push({
          name: columns[0],
        });
      }
    }

    return result;
  };

  // CSV parsing function for product codes (now accepts product names)
  const parseProductCodeCSV = (
    csvText: string
  ): { product_name: string; code: string; description?: string }[] => {
    const lines = csvText.split("\n");
    const result: {
      product_name: string;
      code: string;
      description?: string;
    }[] = [];

    // Skip header if present
    const startIndex = lines[0]?.toLowerCase().includes("product") ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const columns = line
        .split(",")
        .map((col) => col.trim().replace(/"/g, ""));
      if (columns.length >= 2) {
        result.push({
          product_name: columns[0],
          code: columns[1],
          description: columns[2] || undefined,
        });
      }
    }

    return result;
  };

  // CSV parsing function for bahan
  const parseBahanCSV = (
    csvText: string
  ): { name: string; productCode: string }[] => {
    const lines = csvText.split("\n");
    const result: { name: string; productCode: string }[] = [];

    // Skip header if present
    const startIndex = lines[0]?.toLowerCase().includes("name") ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const columns = line
        .split(",")
        .map((col) => col.trim().replace(/"/g, ""));
      if (columns.length >= 2) {
        result.push({
          name: columns[0],
          productCode: columns[1],
        });
      }
    }

    return result;
  };

  // Bulk upload handler
  const handleBulkUpload = async (file: File) => {
    try {
      setUploading(true);
      setUploadProgress(0);

      const text = await file.text();
      const products = parseCSV(text);

      if (products.length === 0) {
        message.error("No valid product data found in CSV");
        return;
      }

      setUploadProgress(50);

      const result = await bulkInsertProducts({ products });

      setUploadProgress(100);
      setUploadResult(result.data || null);

      if (result.data) {
        const { total_created, total_skipped } = result.data;
        message.success(
          `Bulk upload completed! Created: ${total_created}, Skipped: ${total_skipped}`
        );
        fetchProducts(); // Refresh the product list
      }
    } catch (error: any) {
      message.error(
        "Failed to upload products: " +
          (error.response?.data?.message || error.message)
      );
      console.error("Error during bulk upload:", error);
    } finally {
      setUploading(false);
    }
  };

  // Product Code bulk upload handler
  const handleProductCodeBulkUpload = async (file: File) => {
    try {
      setProductCodeUploading(true);
      setProductCodeUploadProgress(0);

      const text = await file.text();
      const parsedData = parseProductCodeCSV(text);

      if (parsedData.length === 0) {
        message.error("No valid product code data found in CSV");
        return;
      }

      setProductCodeUploadProgress(25);

      // Create a map of product names to product IDs
      const productNameMap = new Map<string, string>();
      products.forEach((product) => {
        productNameMap.set(product.name.toLowerCase(), product.id);
      });

      // Convert product names to product IDs
      const productCodes: {
        productId: string;
        code: string;
        description?: string;
      }[] = [];
      const errors: string[] = [];

      parsedData.forEach((item, index) => {
        const productId = productNameMap.get(item.product_name.toLowerCase());
        if (productId) {
          productCodes.push({
            productId: productId,
            code: item.code,
            description: item.description,
          });
        } else {
          errors.push(
            `Row ${index + 1}: Product "${item.product_name}" not found`
          );
        }
      });

      if (productCodes.length === 0) {
        message.error(
          "No matching products found for the provided product names"
        );
        return;
      }

      if (errors.length > 0) {
        message.warning(
          `${errors.length} rows skipped due to unknown product names`
        );
      }

      setProductCodeUploadProgress(50);

      const result = await bulkInsertProductCodes({
        productCodes: productCodes,
      });

      setProductCodeUploadProgress(100);
      setProductCodeUploadResult(result.data || null);

      if (result.data) {
        const { total_created, total_skipped } = result.data;
        message.success(
          `Bulk upload completed! Created: ${total_created}, Skipped: ${total_skipped}`
        );
        fetchProductCodes(); // Refresh the product codes list
      }
    } catch (error: any) {
      message.error(
        "Failed to upload product codes: " +
          (error.response?.data?.message || error.message)
      );
      console.error("Error during product code bulk upload:", error);
    } finally {
      setProductCodeUploading(false);
    }
  };

  // Bahan bulk upload handler
  const handleBahanBulkUpload = async (file: File) => {
    try {
      setBahanUploading(true);
      setBahanUploadProgress(0);

      const text = await file.text();
      const bahans = parseBahanCSV(text);

      if (bahans.length === 0) {
        message.error("No valid bahan data found in CSV");
        return;
      }

      setBahanUploadProgress(50);

      const result = await bulkInsertBahans({ bahans });

      setBahanUploadProgress(100);
      setBahanUploadResult(result.data || null);

      if (result.data) {
        const { totalCreated, totalSkipped } = result.data;
        message.success(
          `Bulk upload completed! Created: ${totalCreated}, Skipped: ${totalSkipped}`
        );
        fetchBahans(); // Refresh the bahan list
      }
    } catch (error: any) {
      message.error(
        "Failed to upload bahans: " +
          (error.response?.data?.message || error.message)
      );
      console.error("Error during bahan bulk upload:", error);
    } finally {
      setBahanUploading(false);
    }
  };

  const downloadHierarchicalTemplate = () => {
    const csv = [
      "product_name,bahan_name,warna_name,warna_hex_code,warna_code,product_code,product_description",
      "Kemeja,Katun,PUTIH,#FFFFFF,WHT,KMJ,",
      "Kemeja,Katun,HITAM,#000000,BLK,KMJ,",
      "Celana,Denim,BIRU,#1A3C6E,BLU,CLN,Celana denim premium",
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hierarchical_upload_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleHierarchicalFileSelect = async (file: File) => {
    try {
      const text = await file.text();
      const csvData = parseHierarchicalCSV(text);
      if (csvData.length === 0) {
        message.error("No valid data found in CSV");
        return;
      }
      setHierarchicalPreviewFile(file);
      setHierarchicalPreviewData(csvData);
      setHierarchicalUploadResult(null);
    } catch {
      message.error("Failed to parse CSV file");
    }
  };

  // Hierarchical bulk upload handler
  const handleHierarchicalBulkUpload = async (file: File) => {
    try {
      setHierarchicalUploading(true);
      setHierarchicalUploadProgress(0);

      const text = await file.text();
      const csvData = parseHierarchicalCSV(text);

      if (csvData.length === 0) {
        message.error("No valid hierarchical data found in CSV");
        return;
      }

      setHierarchicalUploadProgress(50);

      const result = await hierarchicalBulkUpload({ csv_data: csvData });

      setHierarchicalUploadProgress(100);
      setHierarchicalUploadResult(result.data || null);

      if (result.data) {
        const { products, bahans, warnas } = result.data;
        const totalCreated =
          products.total_created + bahans.total_created + warnas.total_created;
        const totalSkipped =
          products.total_skipped + bahans.total_skipped + warnas.total_skipped;

        message.success(
          `Hierarchical bulk upload completed! Created: ${totalCreated}, Skipped: ${totalSkipped}`
        );

        setHierarchicalPreviewData(null);
        setHierarchicalPreviewFile(null);

        // Refresh all data
        fetchProducts();
        fetchBahans(bahanSearch, bahanProductFilter);
        fetchWarnas(1, warnaPagination.pageSize, warnabahanFilter, warnaSearch);
      }
    } catch (error: any) {
      message.error(
        "Failed to upload hierarchical data: " +
          (error.response?.data?.message || error.message)
      );
      console.error("Error during hierarchical bulk upload:", error);
    } finally {
      setHierarchicalUploading(false);
    }
  };

  const handleTypeImageZipUpload = async (file: File) => {
    try {
      setZipLibraryUploading(true);
      setZipLibraryUploadProgress(25);

      const result = await uploadDesignTypeImageZip(file);

      setZipLibraryUploadProgress(100);
      setZipLibraryUploadResult(result || null);
      message.success(
        `ZIP import completed. Matched: ${result.total_matched}, Updated: ${result.total_updated}, Skipped: ${result.total_skipped}`
      );
    } catch (error: any) {
      message.error(
        "Failed to upload ZIP library: " +
          (error.response?.data?.message || error.message)
      );
    } finally {
      setZipLibraryUploading(false);
    }
  };

  // Check permissions
  if (!isSuperAdmin()) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <Typography.Title level={3}>Access Denied</Typography.Title>
        <Typography.Text>
          You don't have permission to access Master Data management.
        </Typography.Text>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "24px",
        minHeight: "100%",
      }}
    >
      <div
        style={{
          marginBottom: 24,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <Typography.Title level={2}>
            <Database
              size={24}
              style={{ marginRight: 8, verticalAlign: "middle" }}
            />
            Master Data Management
          </Typography.Title>
          <Typography.Text type="secondary">
            Manage products, bahan, and warna data for the system.
          </Typography.Text>
        </div>
        <Dropdown
          menu={{
            items: [
              {
                key: "hierarchical",
                label: "Hierarchical Upload",
                icon: <Database size={16} />,
                onClick: () => {
                  setHierarchicalBulkUploadVisible(true);
                  setHierarchicalUploadResult(null);
                },
              },
              {
                key: "product-code",
                label: "Product Code Upload",
                icon: <FileText size={16} />,
                onClick: () => {
                  setProductCodeBulkUploadVisible(true);
                  setProductCodeUploadResult(null);
                },
              },
              {
                key: "type-image-zip",
                label: "Type Image ZIP Upload",
                icon: <Package2 size={16} />,
                onClick: () => {
                  setZipLibraryUploadVisible(true);
                  setZipLibraryUploadResult(null);
                },
              },
            ],
          }}
          disabled={!isSuperAdmin()}
        >
          <Button type="primary" icon={<UploadIcon size={16} />} size="large">
            Bulk Upload
          </Button>
        </Dropdown>
      </div>

      <Card style={{ minHeight: "auto", height: "auto" }}>
        <Tabs items={tabItems} defaultActiveKey="products" />
      </Card>

      {/* Product Modal */}
      <Modal
        title={selectedProduct ? "Edit Product" : "Add Product"}
        open={productModalVisible}
        onCancel={() => setProductModalVisible(false)}
        footer={null}
      >
        <Form
          form={productForm}
          layout="vertical"
          initialValues={{ showInForm: true }}
          onFinish={handleProductSubmit}
        >
          <Form.Item
            name="name"
            label="Product Name"
            rules={[{ required: true, message: "Please enter product name" }]}
          >
            <Input placeholder="Enter product name" />
          </Form.Item>
          <Form.Item name="formDisplayName" label="Form Display Name">
            <Input placeholder="Shown on public custom-order form" />
          </Form.Item>
          <Form.Item name="formImageUrl" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="showInForm" label="Show In Form" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Upload.Dragger
            accept="image/*"
            beforeUpload={(file) => {
              handleProductImageUpload(file);
              return false;
            }}
            maxCount={1}
            showUploadList={false}
            style={{ marginBottom: 16 }}
          >
            <p className="ant-upload-drag-icon">
              <UploadIcon size={28} />
            </p>
            <p className="ant-upload-text">
              {productImageUploading ? "Uploading image..." : "Click or drag product image here"}
            </p>
            <p className="ant-upload-hint">Used on the public custom-order form.</p>
          </Upload.Dragger>
          {productFormImageUrl ? (
            <Space style={{ marginBottom: 16 }}>
              <Avatar shape="square" size={64} src={productFormImageUrl} />
              <Button onClick={() => productForm.setFieldValue("formImageUrl", null)}>
                Remove image
              </Button>
            </Space>
          ) : null}
          <div style={{ textAlign: "right" }}>
            <Space>
              <Button onClick={() => setProductModalVisible(false)}>
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={submittingProduct}
              >
                {selectedProduct ? "Update" : "Create"}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* Product Code Modal */}
      <Modal
        title={selectedProductCode ? "Edit Product Code" : "Add Product Code"}
        open={productCodeModalVisible}
        onCancel={() => setProductCodeModalVisible(false)}
        footer={null}
      >
        <Form
          form={productCodeForm}
          layout="vertical"
          onFinish={handleProductCodeSubmit}
        >
          <Form.Item
            name="productId"
            label="Product"
            rules={[{ required: true, message: "Please select a product" }]}
          >
            <Select placeholder="Select a product">
              {products.map((product) => (
                <Select.Option key={product.id} value={product.id}>
                  {product.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="code"
            label="Product Code"
            rules={[{ required: true, message: "Please enter product code" }]}
          >
            <Input placeholder="Enter product code" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea placeholder="Enter description (optional)" />
          </Form.Item>
          <div style={{ textAlign: "right" }}>
            <Space>
              <Button onClick={() => setProductCodeModalVisible(false)}>
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={submittingProductCode}
              >
                {selectedProductCode ? "Update" : "Create"}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* Bahan Modal */}
      <Modal
        title={selectedBahan ? "Edit Bahan" : "Add Bahan"}
        open={bahanModalVisible}
        onCancel={() => setBahanModalVisible(false)}
        footer={null}
      >
        <Form form={bahanForm} layout="vertical" onFinish={handleBahanSubmit}>
          <Form.Item
            name="productId"
            label="Product"
            rules={[{ required: true, message: "Please select a product" }]}
          >
            <Select placeholder="Select a product">
              {products.map((product) => (
                <Select.Option key={product.id} value={product.id}>
                  {product.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="name"
            label="Bahan Name"
            rules={[{ required: true, message: "Please enter bahan name" }]}
          >
            <Input placeholder="Enter bahan name" />
          </Form.Item>
          <Form.Item name="formRecommended" label="Recommended In Form" valuePropName="checked">
            <Switch />
          </Form.Item>
          <div style={{ textAlign: "right" }}>
            <Space>
              <Button onClick={() => setBahanModalVisible(false)}>
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={submittingBahan}
              >
                {selectedBahan ? "Update" : "Create"}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* Warna Modal */}
      <Modal
        title={selectedWarna ? "Edit Warna" : "Add Warna"}
        open={warnaModalVisible}
        onCancel={() => setWarnaModalVisible(false)}
        footer={null}
      >
        <Form form={warnaForm} layout="vertical" onFinish={handleWarnaSubmit}>
          <Form.Item
            name="productId"
            label="Product"
            rules={[{ required: true, message: "Please select a product" }]}
          >
            <Select
              placeholder="Select a product"
              showSearch
              optionFilterProp="label"
              onChange={() => {
                warnaForm.setFieldValue("bahanId", undefined);
              }}
            >
              {products.map((product) => (
                <Select.Option
                  key={product.id}
                  value={product.id}
                  label={product.name}
                >
                  {product.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="bahanId"
            label="Bahan"
            rules={[{ required: true, message: "Please select a bahan" }]}
          >
            <Select
              placeholder={
                selectedWarnaProductId
                  ? "Select a bahan"
                  : "Select product first"
              }
              showSearch
              optionFilterProp="label"
              disabled={!selectedWarnaProductId}
            >
              {filteredBahansForWarna.map((bahan) => {
                const productName =
                  bahan.productInfo?.name || bahan.productName || "Unknown Product";
                const productCode = bahan.productInfo?.productCodes?.[0]?.code;
                const optionLabel = `${bahan.name} — Product: ${productName}${productCode ? ` (${productCode})` : ""}`;

                return (
                  <Select.Option
                    key={bahan.id}
                    value={bahan.id}
                    label={optionLabel}
                  >
                    {optionLabel}
                  </Select.Option>
                );
              })}
            </Select>
          </Form.Item>
          <Form.Item
            name="name"
            label="Warna Name"
            rules={[{ required: true, message: "Please enter warna name" }]}
          >
            <Input placeholder="Enter warna name" />
          </Form.Item>
          <Form.Item
            name="hexCode"
            label="Hex Color Code"
            rules={[
              {
                pattern: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
                message: "Please enter a valid hex color code (e.g., #FF0000)",
              },
            ]}
          >
            <ColorPickerInput />
          </Form.Item>
          <Form.Item name="code" label="Color Code">
            <Input placeholder="Enter color code (optional)" />
          </Form.Item>
          <div style={{ textAlign: "right" }}>
            <Space>
              <Button onClick={() => setWarnaModalVisible(false)}>
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={submittingWarna}
              >
                {selectedWarna ? "Update" : "Create"}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* Bulk Upload Modal */}
      <Modal
        title="Bulk Upload Products"
        open={bulkUploadVisible}
        onCancel={() => setBulkUploadVisible(false)}
        footer={null}
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <Alert
            message="CSV Format"
            description="Upload a CSV file with columns: name, code, description (optional). First row can be header."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Upload.Dragger
            accept=".csv"
            beforeUpload={(file) => {
              handleBulkUpload(file);
              return false; // Prevent default upload
            }}
            showUploadList={false}
            disabled={uploading}
          >
            <p className="ant-upload-drag-icon">
              <FileText size={48} />
            </p>
            <p className="ant-upload-text">
              {uploading ? "Uploading..." : "Click or drag CSV file to upload"}
            </p>
            <p className="ant-upload-hint">
              Support CSV files with product data
            </p>
          </Upload.Dragger>

          {uploading && (
            <div style={{ marginTop: 16 }}>
              <Progress percent={uploadProgress} />
            </div>
          )}

          {uploadResult && (
            <div style={{ marginTop: 16 }}>
              <Card title="Upload Results" size="small">
                <div style={{ marginBottom: 8 }}>
                  <strong>Total Attempted:</strong>{" "}
                  {uploadResult.total_attempted}
                </div>
                <div style={{ marginBottom: 8 }}>
                  <strong>Successfully Created:</strong>{" "}
                  {uploadResult.total_created}
                </div>
                <div style={{ marginBottom: 8 }}>
                  <strong>Skipped (duplicates/errors):</strong>{" "}
                  {uploadResult.total_skipped}
                </div>

                {uploadResult.errors && uploadResult.errors.length > 0 && (
                  <div>
                    <strong>Errors:</strong>
                    <div
                      style={{
                        maxHeight: 150,
                        overflowY: "auto",
                        marginTop: 8,
                      }}
                    >
                      {uploadResult.errors.map((error, index) => (
                        <div
                          key={index}
                          style={{
                            fontSize: "12px",
                            color: "#ff4d4f",
                            marginBottom: 4,
                          }}
                        >
                          Row {error.index + 1}: {error.name} ({error.code}) -{" "}
                          {error.error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>

        <div style={{ textAlign: "right", marginTop: 16 }}>
          <Button
            onClick={() => {
              setBulkUploadVisible(false);
              setUploadResult(null);
              setUploadProgress(0);
            }}
          >
            Close
          </Button>
        </div>
      </Modal>

      {/* Product Code Bulk Upload Modal */}
      <Modal
        title="Bulk Upload Product Codes"
        open={productCodeBulkUploadVisible}
        onCancel={() => setProductCodeBulkUploadVisible(false)}
        footer={null}
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <Alert
            message="CSV Format"
            description={
              <div>
                <p>Upload a CSV file with the following columns:</p>
                <ul style={{ marginLeft: 20, marginTop: 8 }}>
                  <li>
                    <strong>product_name</strong> - Name of the product
                    (required)
                  </li>
                  <li>
                    <strong>code</strong> - Product code (optional)
                  </li>
                  <li>
                    <strong>description</strong> - Product code description
                    (optional)
                  </li>
                </ul>
                <p style={{ marginTop: 8 }}>
                  Product names will be matched to existing products. First row
                  can be header.
                </p>
              </div>
            }
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Upload.Dragger
            accept=".csv"
            beforeUpload={(file) => {
              handleProductCodeBulkUpload(file);
              return false; // Prevent default upload
            }}
            showUploadList={false}
            disabled={productCodeUploading}
          >
            <p className="ant-upload-drag-icon">
              <FileText size={48} />
            </p>
            <p className="ant-upload-text">
              {productCodeUploading
                ? "Uploading..."
                : "Click or drag CSV file to upload"}
            </p>
            <p className="ant-upload-hint">
              Support CSV files with product code data
            </p>
          </Upload.Dragger>

          {productCodeUploading && (
            <div style={{ marginTop: 16 }}>
              <Progress percent={productCodeUploadProgress} />
            </div>
          )}

          {productCodeUploadResult && (
            <div style={{ marginTop: 16 }}>
              <Card title="Upload Results" size="small">
                <div style={{ marginBottom: 8 }}>
                  <strong>Total Attempted:</strong>{" "}
                  {productCodeUploadResult.total_attempted}
                </div>
                <div style={{ marginBottom: 8 }}>
                  <strong>Successfully Created:</strong>{" "}
                  {productCodeUploadResult.total_created}
                </div>
                <div style={{ marginBottom: 8 }}>
                  <strong>Skipped:</strong>{" "}
                  {productCodeUploadResult.total_skipped}
                </div>
                {productCodeUploadResult.errors &&
                  productCodeUploadResult.errors.length > 0 && (
                    <div>
                      <strong>Errors:</strong>
                      <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                        {productCodeUploadResult.errors
                          .slice(0, 5)
                          .map((error, index) => (
                            <li key={index} style={{ color: "red" }}>
                              Row {error.index + 1}: {error.error}
                            </li>
                          ))}
                        {productCodeUploadResult.errors.length > 5 && (
                          <li style={{ color: "gray" }}>
                            ... and {productCodeUploadResult.errors.length - 5}{" "}
                            more errors
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
              </Card>
            </div>
          )}
        </div>

        <div style={{ textAlign: "right", marginTop: 16 }}>
          <Button
            onClick={() => {
              setProductCodeBulkUploadVisible(false);
              setProductCodeUploadResult(null);
              setProductCodeUploadProgress(0);
            }}
          >
            Close
          </Button>
        </div>
      </Modal>

      {/* Bahan Bulk Upload Modal */}
      <Modal
        title="Bulk Upload Bahan"
        open={bahanBulkUploadVisible}
        onCancel={() => setBahanBulkUploadVisible(false)}
        footer={null}
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <Alert
            message="CSV Format"
            description="Upload a CSV file with columns: name, product_code. First row can be header. The product_code must match existing products."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Upload.Dragger
            accept=".csv"
            beforeUpload={(file) => {
              handleBahanBulkUpload(file);
              return false; // Prevent default upload
            }}
            showUploadList={false}
            disabled={bahanUploading}
          >
            <p className="ant-upload-drag-icon">
              <FileText size={48} />
            </p>
            <p className="ant-upload-text">
              {bahanUploading
                ? "Uploading..."
                : "Click or drag CSV file to upload"}
            </p>
            <p className="ant-upload-hint">Support CSV files with bahan data</p>
          </Upload.Dragger>

          {bahanUploading && (
            <div style={{ marginTop: 16 }}>
              <Progress percent={bahanUploadProgress} />
            </div>
          )}

          {bahanUploadResult && (
            <div style={{ marginTop: 16 }}>
              <Card title="Upload Results" size="small">
                <div style={{ marginBottom: 8 }}>
                  <strong>Total Attempted:</strong>{" "}
                  {bahanUploadResult.totalAttempted}
                </div>
                <div style={{ marginBottom: 8 }}>
                  <strong>Successfully Created:</strong>{" "}
                  {bahanUploadResult.totalCreated}
                </div>
                <div style={{ marginBottom: 8 }}>
                  <strong>Skipped (duplicates/errors):</strong>{" "}
                  {bahanUploadResult.totalSkipped}
                </div>

                {bahanUploadResult.errors &&
                  bahanUploadResult.errors.length > 0 && (
                    <div>
                      <strong>Errors:</strong>
                      <div
                        style={{
                          maxHeight: 150,
                          overflowY: "auto",
                          marginTop: 8,
                        }}
                      >
                        {bahanUploadResult.errors.map((error, index) => (
                          <div
                            key={index}
                            style={{
                              fontSize: "12px",
                              color: "#ff4d4f",
                              marginBottom: 4,
                            }}
                          >
                            Row {error.index + 1}: {error.name} (
                            {error.productCode}) - {error.error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </Card>
            </div>
          )}
        </div>

        <div style={{ textAlign: "right", marginTop: 16 }}>
          <Button
            onClick={() => {
              setBahanBulkUploadVisible(false);
              setBahanUploadResult(null);
              setBahanUploadProgress(0);
            }}
          >
            Close
          </Button>
        </div>
      </Modal>

      {/* Hierarchical Bulk Upload Modal */}
      <Modal
        title="Hierarchical Bulk Upload"
        open={hierarchicalBulkUploadVisible}
        onCancel={() => {
          setHierarchicalBulkUploadVisible(false);
          setHierarchicalUploadResult(null);
          setHierarchicalUploadProgress(0);
          setHierarchicalPreviewData(null);
          setHierarchicalPreviewFile(null);
        }}
        footer={null}
        width={900}
      >
        <div>
          <div style={{ textAlign: "right", marginBottom: 8 }}>
            <Button icon={<Download size={14} />} size="small" onClick={downloadHierarchicalTemplate}>
              Download Template
            </Button>
          </div>
          <Alert
            message="CSV Format — Column Order Matters"
            description={
              <div>
                <p>
                  Columns are read <strong>by position</strong>, not by header
                  name. Use this exact order:
                </p>
                <ol style={{ marginLeft: 20, marginTop: 8 }}>
                  <li>
                    <strong>Col 1 — product_name</strong> (required). To link
                    one bahan/warna to multiple products, separate names with{" "}
                    <code>|</code> inside quotes (e.g.,{" "}
                    <code>"Custom Rompi|Custom Jaket"</code>)
                  </li>
                  <li>
                    <strong>Col 2 — bahan_name</strong> (required)
                  </li>
                  <li>
                    <strong>Col 3 — warna_name</strong> (required)
                  </li>
                  <li>
                    <strong>Col 4 — warna_hex_code</strong> (optional, e.g.{" "}
                    <code>#FF0000</code>)
                  </li>
                  <li>
                    <strong>Col 5 — warna_code</strong> (optional)
                  </li>
                  <li>
                    <strong>Col 6 — product_code</strong> (optional)
                  </li>
                  <li>
                    <strong>Col 7 — product_description</strong> (optional)
                  </li>
                </ol>
                <p style={{ marginTop: 8, marginBottom: 4 }}>
                  <strong>Example:</strong>
                </p>
                <pre
                  style={{
                    background: "#f5f5f5",
                    padding: "8px 12px",
                    borderRadius: 4,
                    fontSize: 12,
                    overflowX: "auto",
                  }}
                >{`product_name,bahan_name,warna_name,warna_hex_code,warna_code,product_code
Kemeja,Katun,PUTIH,#FFFFFF,WHT,KMJ
Kemeja,Katun,HITAM,#000000,BLK,KMJ
Celana,Denim,BIRU,#1A3C6E,BLU,CLN`}</pre>
                <p style={{ marginTop: 8 }}>
                  Creates hierarchy: Product → Bahan → Warna. Existing items
                  are skipped (not overwritten).
                </p>
              </div>
            }
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Upload.Dragger
            accept=".csv"
            beforeUpload={(file) => {
              handleHierarchicalFileSelect(file);
              return false;
            }}
            showUploadList={false}
            disabled={hierarchicalUploading}
          >
            <p className="ant-upload-drag-icon">
              <FileText size={48} />
            </p>
            <p className="ant-upload-text">
              {hierarchicalUploading
                ? "Uploading..."
                : hierarchicalPreviewData
                ? `${hierarchicalPreviewFile?.name} — click to replace`
                : "Click or drag CSV file to upload"}
            </p>
            <p className="ant-upload-hint">
              Supports CSV with hierarchical master data (Product → Bahan → Warna)
            </p>
          </Upload.Dragger>

          {hierarchicalPreviewData && !hierarchicalUploadResult && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <Typography.Text strong>
                  Preview — {hierarchicalPreviewData.length} row{hierarchicalPreviewData.length !== 1 ? "s" : ""} to process
                </Typography.Text>
                <Space>
                  <Button
                    onClick={() => {
                      setHierarchicalPreviewData(null);
                      setHierarchicalPreviewFile(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="primary"
                    loading={hierarchicalUploading}
                    onClick={() => {
                      if (hierarchicalPreviewFile) {
                        handleHierarchicalBulkUpload(hierarchicalPreviewFile);
                      }
                    }}
                  >
                    Confirm & Upload
                  </Button>
                </Space>
              </div>
              <Table
                size="small"
                dataSource={hierarchicalPreviewData.slice(0, 10).map((row, i) => ({ ...row, key: i }))}
                pagination={false}
                scroll={{ x: true }}
                footer={
                  hierarchicalPreviewData.length > 10
                    ? () => (
                        <Typography.Text type="secondary">
                          Showing 10 of {hierarchicalPreviewData.length} rows
                        </Typography.Text>
                      )
                    : undefined
                }
                columns={[
                  { title: "Product", dataIndex: "product_name", key: "product_name", ellipsis: true },
                  { title: "Bahan", dataIndex: "bahan_name", key: "bahan_name", ellipsis: true },
                  { title: "Warna", dataIndex: "warna_name", key: "warna_name", ellipsis: true },
                  {
                    title: "Hex",
                    dataIndex: "warna_hex_code",
                    key: "warna_hex_code",
                    width: 90,
                    render: (hex: string) =>
                      hex ? (
                        <Space size={4}>
                          <div style={{ width: 14, height: 14, borderRadius: 2, background: hex, border: "1px solid #d9d9d9", flexShrink: 0 }} />
                          <Typography.Text style={{ fontSize: 11 }}>{hex}</Typography.Text>
                        </Space>
                      ) : "-",
                  },
                  { title: "Warna Code", dataIndex: "warna_code", key: "warna_code", render: (v: string) => v || "-" },
                  { title: "Product Code", dataIndex: "product_code", key: "product_code", render: (v: string) => v || "-" },
                ]}
              />
            </div>
          )}

          {hierarchicalUploading && (
            <div style={{ marginTop: 16 }}>
              <Progress percent={hierarchicalUploadProgress} />
            </div>
          )}

          {hierarchicalUploadResult && (
            <div style={{ marginTop: 16 }}>
              <Card title="Upload Results" size="small">
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 16,
                  }}
                >
                  <Card size="small" title="Products">
                    <div style={{ marginBottom: 8 }}>
                      <strong>Created:</strong>{" "}
                      <Tag color="green">
                        {hierarchicalUploadResult.products.total_created}
                      </Tag>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <strong>Skipped:</strong>{" "}
                      <Tag color="orange">
                        {hierarchicalUploadResult.products.total_skipped}
                      </Tag>
                    </div>
                    {hierarchicalUploadResult.errors &&
                      hierarchicalUploadResult.errors.filter(
                        (error) => error.entity_type === "product"
                      ).length > 0 && (
                        <div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: 8,
                            }}
                          >
                            <strong>Errors:</strong>
                            <Tag color="red">
                              {
                                hierarchicalUploadResult.errors.filter(
                                  (error) => error.entity_type === "product"
                                ).length
                              }
                            </Tag>
                          </div>
                          <div
                            style={{
                              maxHeight: 120,
                              overflowY: "auto",
                              border: "1px solid #f0f0f0",
                              borderRadius: 4,
                              padding: 8,
                              backgroundColor: "#fafafa",
                            }}
                          >
                            <List
                              size="small"
                              dataSource={hierarchicalUploadResult.errors.filter(
                                (error) => error.entity_type === "product"
                              )}
                              renderItem={(error, index) => (
                                <List.Item
                                  style={{
                                    padding: "4px 0",
                                    borderBottom: "1px solid #f0f0f0",
                                  }}
                                >
                                  <div style={{ width: "100%" }}>
                                    <div
                                      style={{
                                        fontSize: "12px",
                                        fontWeight: 500,
                                        color: "#1890ff",
                                      }}
                                    >
                                      Row {error.row_index + 1} -{" "}
                                      {error.entity_name}
                                    </div>
                                    <div
                                      style={{
                                        fontSize: "11px",
                                        color: "#ff4d4f",
                                        marginTop: 2,
                                      }}
                                    >
                                      {error.error}
                                    </div>
                                  </div>
                                </List.Item>
                              )}
                            />
                          </div>
                        </div>
                      )}
                  </Card>

                  <Card size="small" title="Bahans">
                    <div style={{ marginBottom: 8 }}>
                      <strong>Created:</strong>{" "}
                      <Tag color="green">
                        {hierarchicalUploadResult.bahans.total_created}
                      </Tag>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <strong>Skipped:</strong>{" "}
                      <Tag color="orange">
                        {hierarchicalUploadResult.bahans.total_skipped}
                      </Tag>
                    </div>
                    {hierarchicalUploadResult.errors &&
                      hierarchicalUploadResult.errors.filter(
                        (error) => error.entity_type === "bahan"
                      ).length > 0 && (
                        <div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: 8,
                            }}
                          >
                            <strong>Errors:</strong>
                            <Tag color="red">
                              {
                                hierarchicalUploadResult.errors.filter(
                                  (error) => error.entity_type === "bahan"
                                ).length
                              }
                            </Tag>
                          </div>
                          <div
                            style={{
                              maxHeight: 120,
                              overflowY: "auto",
                              border: "1px solid #f0f0f0",
                              borderRadius: 4,
                              padding: 8,
                              backgroundColor: "#fafafa",
                            }}
                          >
                            <List
                              size="small"
                              dataSource={hierarchicalUploadResult.errors.filter(
                                (error) => error.entity_type === "bahan"
                              )}
                              renderItem={(error, index) => (
                                <List.Item
                                  style={{
                                    padding: "4px 0",
                                    borderBottom: "1px solid #f0f0f0",
                                  }}
                                >
                                  <div style={{ width: "100%" }}>
                                    <div
                                      style={{
                                        fontSize: "12px",
                                        fontWeight: 500,
                                        color: "#1890ff",
                                      }}
                                    >
                                      Row {error.row_index + 1} -{" "}
                                      {error.entity_name}
                                    </div>
                                    <div
                                      style={{
                                        fontSize: "11px",
                                        color: "#ff4d4f",
                                        marginTop: 2,
                                      }}
                                    >
                                      {error.error}
                                    </div>
                                  </div>
                                </List.Item>
                              )}
                            />
                          </div>
                        </div>
                      )}
                  </Card>

                  <Card size="small" title="Warnas">
                    <div style={{ marginBottom: 8 }}>
                      <strong>Created:</strong>{" "}
                      <Tag color="green">
                        {hierarchicalUploadResult.warnas.total_created}
                      </Tag>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <strong>Skipped:</strong>{" "}
                      <Tag color="orange">
                        {hierarchicalUploadResult.warnas.total_skipped}
                      </Tag>
                    </div>
                    {hierarchicalUploadResult.errors &&
                      hierarchicalUploadResult.errors.filter(
                        (error) => error.entity_type === "warna"
                      ).length > 0 && (
                        <div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: 8,
                            }}
                          >
                            <strong>Errors:</strong>
                            <div
                              style={{
                                display: "flex",
                                gap: 8,
                                alignItems: "center",
                              }}
                            >
                              <Tag color="red">
                                {
                                  hierarchicalUploadResult.errors.filter(
                                    (error) => error.entity_type === "warna"
                                  ).length
                                }
                              </Tag>
                              <Tooltip title="Copy failed warna entries for manual entry">
                                <Button
                                  size="small"
                                  icon={<Copy size={12} />}
                                  onClick={() => {
                                    const warnaErrors =
                                      hierarchicalUploadResult.errors.filter(
                                        (error) => error.entity_type === "warna"
                                      );
                                    const copyText = warnaErrors
                                      .map(
                                        (error) =>
                                          `Row ${error.row_index + 1}: ${
                                            error.entity_name
                                          } - ${error.error}`
                                      )
                                      .join("\n");
                                    navigator.clipboard
                                      .writeText(copyText)
                                      .then(() => {
                                        message.success(
                                          "Failed warna entries copied to clipboard"
                                        );
                                      })
                                      .catch(() => {
                                        message.error(
                                          "Failed to copy to clipboard"
                                        );
                                      });
                                  }}
                                >
                                  Copy
                                </Button>
                              </Tooltip>
                            </div>
                          </div>
                          <div
                            style={{
                              maxHeight: 120,
                              overflowY: "auto",
                              border: "1px solid #f0f0f0",
                              borderRadius: 4,
                              padding: 8,
                              backgroundColor: "#fafafa",
                            }}
                          >
                            <List
                              size="small"
                              dataSource={hierarchicalUploadResult.errors.filter(
                                (error) => error.entity_type === "warna"
                              )}
                              renderItem={(error, index) => (
                                <List.Item
                                  style={{
                                    padding: "4px 0",
                                    borderBottom: "1px solid #f0f0f0",
                                  }}
                                >
                                  <div style={{ width: "100%" }}>
                                    <div
                                      style={{
                                        fontSize: "12px",
                                        fontWeight: 500,
                                        color: "#1890ff",
                                      }}
                                    >
                                      Row {error.row_index + 1} -{" "}
                                      {error.entity_name}
                                    </div>
                                    <div
                                      style={{
                                        fontSize: "11px",
                                        color: "#ff4d4f",
                                        marginTop: 2,
                                      }}
                                    >
                                      {error.error}
                                    </div>
                                  </div>
                                </List.Item>
                              )}
                            />
                          </div>
                        </div>
                      )}
                  </Card>
                </div>

                {/* Summary Section */}
                <Divider />
                <div style={{ textAlign: "center" }}>
                  <Space size="large">
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: 500 }}>
                        Total Rows Processed
                      </div>
                      <Tag
                        color="blue"
                        style={{ fontSize: "16px", padding: "4px 12px" }}
                      >
                        {hierarchicalUploadResult.total_rows}
                      </Tag>
                    </div>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: 500 }}>
                        Total Errors
                      </div>
                      <Tag
                        color="red"
                        style={{ fontSize: "16px", padding: "4px 12px" }}
                      >
                        {hierarchicalUploadResult.errors?.length || 0}
                      </Tag>
                    </div>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: 500 }}>
                        Success Rate
                      </div>
                      <Tag
                        color={
                          ((hierarchicalUploadResult.total_rows -
                            (hierarchicalUploadResult.errors?.length || 0)) /
                            hierarchicalUploadResult.total_rows) *
                            100 >=
                          90
                            ? "green"
                            : ((hierarchicalUploadResult.total_rows -
                                (hierarchicalUploadResult.errors?.length ||
                                  0)) /
                                hierarchicalUploadResult.total_rows) *
                                100 >=
                              70
                            ? "orange"
                            : "red"
                        }
                        style={{ fontSize: "16px", padding: "4px 12px" }}
                      >
                        {Math.round(
                          ((hierarchicalUploadResult.total_rows -
                            (hierarchicalUploadResult.errors?.length || 0)) /
                            hierarchicalUploadResult.total_rows) *
                            100
                        )}
                        %
                      </Tag>
                    </div>
                  </Space>
                </div>
              </Card>
            </div>
          )}
        </div>

        <div style={{ textAlign: "right", marginTop: 16 }}>
          <Button
            onClick={() => {
              setHierarchicalBulkUploadVisible(false);
              setHierarchicalUploadResult(null);
              setHierarchicalUploadProgress(0);
            }}
          >
            Close
          </Button>
        </div>
      </Modal>

      <Modal
        title="Type Image ZIP Upload"
        open={zipLibraryUploadVisible}
        onCancel={() => {
          setZipLibraryUploadVisible(false);
          setZipLibraryUploadResult(null);
          setZipLibraryUploadProgress(0);
        }}
        footer={null}
        width={700}
      >
        <Alert
          message="Single ZIP upload"
          description="Upload one ZIP that contains front/back PNG pairs (depan/belakang). The system will auto-detect variant code from file names and map to existing Product Code entries."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Upload.Dragger
          accept=".zip"
          beforeUpload={(file) => {
            handleTypeImageZipUpload(file);
            return false;
          }}
          showUploadList={false}
          disabled={zipLibraryUploading}
        >
          <p className="ant-upload-drag-icon">
            <Package2 size={48} />
          </p>
          <p className="ant-upload-text">
            {zipLibraryUploading
              ? "Uploading ZIP..."
              : "Click or drag ZIP file to upload"}
          </p>
          <p className="ant-upload-hint">Supports one ZIP per upload</p>
        </Upload.Dragger>

        {zipLibraryUploading ? (
          <div style={{ marginTop: 16 }}>
            <Progress percent={zipLibraryUploadProgress} />
          </div>
        ) : null}

        {zipLibraryUploadResult ? (
          <div style={{ marginTop: 16 }}>
            <Card title="ZIP Import Result" size="small">
              <Space direction="vertical" size={8} style={{ width: "100%" }}>
                <div>
                  <strong>Collection:</strong> {zipLibraryUploadResult.collection_code || "-"}
                </div>
                <div>
                  <strong>Collar Variant:</strong> {zipLibraryUploadResult.collar_variant || "-"}
                </div>
                <div>
                  <strong>Total Attempted:</strong> {zipLibraryUploadResult.total_attempted}
                </div>
                <div>
                  <strong>Matched Product Codes:</strong> {zipLibraryUploadResult.total_matched}
                </div>
                <div>
                  <strong>Updated:</strong> {zipLibraryUploadResult.total_updated}
                </div>
                <div>
                  <strong>Skipped:</strong> {zipLibraryUploadResult.total_skipped}
                </div>
                {zipLibraryUploadResult.errors?.length ? (
                  <div>
                    <strong>Errors:</strong>
                    <div
                      style={{
                        marginTop: 8,
                        maxHeight: 180,
                        overflowY: "auto",
                        border: "1px solid #f0f0f0",
                        borderRadius: 6,
                        padding: 8,
                      }}
                    >
                      {zipLibraryUploadResult.errors.map((err, idx) => (
                        <div key={`${err.variant}-${idx}`} style={{ marginBottom: 6 }}>
                          <Tag color="red">{err.variant}</Tag> {err.error}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </Space>
            </Card>
          </div>
        ) : null}

        <div style={{ textAlign: "right", marginTop: 16 }}>
          <Button
            onClick={() => {
              setZipLibraryUploadVisible(false);
              setZipLibraryUploadResult(null);
              setZipLibraryUploadProgress(0);
            }}
          >
            Close
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default MasterData;
