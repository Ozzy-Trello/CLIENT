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
} from "antd";
import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Edit, Plus, Settings, Trash, Database, Package2, Palette, Box, Upload as UploadIcon, Download, FileText } from "lucide-react";
import { usePermissions } from "@hooks/account";

// Import API functions
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  bulkInsertProducts,
  Product as ProductAPI,
  ProductCreateRequest,
  ProductUpdateRequest,
  ProductBulkInsertRequest,
  ProductBulkInsertResult,
} from "@api/product";
import {
  getBahans,
  createBahan,
  updateBahan,
  deleteBahan,
  Bahan as BahanAPI,
  BahanCreateRequest,
  BahanUpdateRequest,
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

type MenuItem = Required<MenuProps>["items"][number];

// Use API interfaces with aliases to match component needs
type Product = ProductAPI & {
  created_at: string;
  updated_at: string;
};

type Bahan = BahanAPI & {
  created_at: string;
  updated_at: string;
  product_id: string;
  product?: Product;
};

type Warna = WarnaAPI & {
  created_at: string;
  updated_at: string;
  bahan_id: string;
  bahan?: Bahan;
};

const ProductTable: React.FC<{
  dataSource?: Product[];
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  loading?: boolean;
}> = ({ dataSource = [], onEdit, onDelete, loading = false }) => {
  const { isSuperAdmin } = usePermissions();
  
  const columns = [
    {
      title: "Product Code",
      dataIndex: "code",
      key: "code",
      render: (code: string) => (
        <Typography.Text strong>{code}</Typography.Text>
      ),
    },
    {
      title: "Product Name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Created At",
      dataIndex: "created_at",
      key: "created_at",
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: "Action",
      key: "action",
      render: (_: any, record: Product) => (
        <Space size="middle">
          <Tooltip title="Edit product">
            <Button
              type="text"
              icon={<Edit size={16} />}
              onClick={() => onEdit(record)}
              disabled={!isSuperAdmin()}
            />
          </Tooltip>
          <Tooltip title="Delete product">
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
      dataIndex: "product",
      key: "product",
      render: (product: Product) => product?.name || "-",
    },
    {
      title: "Created At",
      dataIndex: "created_at",
      key: "created_at",
      render: (date: string) => new Date(date).toLocaleDateString(),
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
}> = ({ dataSource = [], onEdit, onDelete, loading = false }) => {
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
      title: "Bahan",
      dataIndex: "bahan",
      key: "bahan",
      render: (bahan: Bahan) => bahan?.name || "-",
    },
    {
      title: "Product",
      dataIndex: "bahan",
      key: "product",
      render: (bahan: Bahan) => bahan?.product?.name || "-",
    },
    {
      title: "Created At",
      dataIndex: "created_at",
      key: "created_at",
      render: (date: string) => new Date(date).toLocaleDateString(),
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
    />
  );
};

const MasterData: React.FC = () => {
  const { workspaceId } = useParams();
  const resolvedWorkspaceId = Array.isArray(workspaceId)
    ? workspaceId[0]
    : (workspaceId as string);

  const { isSuperAdmin } = usePermissions();

  // State for all three entities
  const [products, setProducts] = useState<Product[]>([]);
  const [bahans, setBahans] = useState<Bahan[]>([]);
  const [warnas, setWarnas] = useState<Warna[]>([]);
  
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingBahans, setLoadingBahans] = useState(false);
  const [loadingWarnas, setLoadingWarnas] = useState(false);

  // Loading states for operations
  const [submittingProduct, setSubmittingProduct] = useState(false);
  const [submittingBahan, setSubmittingBahan] = useState(false);
  const [submittingWarna, setSubmittingWarna] = useState(false);

  // Ref to track if data has been fetched
  const dataFetched = useRef(false);

  // Bulk upload states
  const [bulkUploadVisible, setBulkUploadVisible] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<ProductBulkInsertResult | null>(null);

  // Modal states
  const [productModalVisible, setProductModalVisible] = useState(false);
  const [bahanModalVisible, setBahanModalVisible] = useState(false);
  const [warnaModalVisible, setWarnaModalVisible] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedBahan, setSelectedBahan] = useState<Bahan | null>(null);
  const [selectedWarna, setSelectedWarna] = useState<Warna | null>(null);

  // Forms
  const [productForm] = Form.useForm();
  const [bahanForm] = Form.useForm();
  const [warnaForm] = Form.useForm();

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
          <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography.Title level={4} style={{ margin: 0 }}>
              Products Management
            </Typography.Title>
            <Space>
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
            dataSource={products}
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
            loading={loadingProducts}
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
          <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography.Title level={4} style={{ margin: 0 }}>
              Bahan Management
            </Typography.Title>
            <Button
              type="primary"
              icon={<Plus size={16} />}
              onClick={() => {
                setSelectedBahan(null);
                bahanForm.resetFields();
                setBahanModalVisible(true);
              }}
              disabled={!isSuperAdmin()}
            >
              Add Bahan
            </Button>
          </div>
          <BahanTable
            dataSource={bahans}
            onEdit={(bahan) => {
              setSelectedBahan(bahan);
              bahanForm.setFieldsValue({
                ...bahan,
                product_id: bahan.product_id,
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
          Warna ({warnas.length})
        </span>
      ),
      children: (
        <div>
          <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography.Title level={4} style={{ margin: 0 }}>
              Warna Management
            </Typography.Title>
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
          </div>
          <WarnaTable
            dataSource={warnas}
            onEdit={(warna) => {
              setSelectedWarna(warna);
              warnaForm.setFieldsValue({
                ...warna,
                bahan_id: warna.bahan_id,
              });
              setWarnaModalVisible(true);
            }}
            onDelete={(warna) => {
              Modal.confirm({
                title: "Delete Warna",
                content: `Are you sure you want to delete ${warna.name}?`,
                onOk: () => handleDeleteWarna(warna),
              });
            }}
            loading={loadingWarnas}
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
        setProducts(response.data.map(p => ({
          ...p,
          created_at: p.createdAt || '',
          updated_at: p.updatedAt || ''
        })));
      }
    } catch (error) {
      message.error('Failed to fetch products');
      console.error('Error fetching products:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchBahans = async () => {
    try {
      setLoadingBahans(true);
      const response = await getBahans(1, 1000);
      if (response.data) {
        setBahans(response.data.map(b => ({
          ...b,
          created_at: b.createdAt || '',
          updated_at: b.updatedAt || '',
          product_id: b.productId,
          product: b.productInfo ? {
            ...b.productInfo,
            created_at: '',
            updated_at: ''
          } : undefined
        })));
      }
    } catch (error) {
      message.error('Failed to fetch bahan');
      console.error('Error fetching bahan:', error);
    } finally {
      setLoadingBahans(false);
    }
  };

  const fetchWarnas = async () => {
    try {
      setLoadingWarnas(true);
      const response = await getWarnas(1, 1000);
      if (response.data) {
        setWarnas(response.data.map(w => ({
          ...w,
          created_at: w.createdAt || '',
          updated_at: w.updatedAt || '',
          bahan_id: w.bahanId,
          bahan: w.bahanInfo ? {
            id: w.bahanInfo.id,
            name: w.bahanInfo.name,
            created_at: '',
            updated_at: '',
            product_id: '',
            productId: '',
          } : undefined
        })));
      }
    } catch (error) {
      message.error('Failed to fetch warna');
      console.error('Error fetching warna:', error);
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
      fetchBahans();
      fetchWarnas();
    }
  }, [isSuperAdmin()]);

  // CRUD operations
  const handleDeleteProduct = async (product: Product) => {
    try {
      await deleteProduct(product.id);
      message.success('Product deleted successfully');
      fetchProducts();
      fetchBahans(); // Refresh bahan as they might be affected
      fetchWarnas(); // Refresh warna as they might be affected
    } catch (error) {
      message.error('Failed to delete product');
      console.error('Error deleting product:', error);
    }
  };

  const handleDeleteBahan = async (bahan: Bahan) => {
    try {
      await deleteBahan(bahan.id);
      message.success('Bahan deleted successfully');
      fetchBahans();
      fetchWarnas(); // Refresh warna as they might be affected
    } catch (error) {
      message.error('Failed to delete bahan');
      console.error('Error deleting bahan:', error);
    }
  };

  const handleDeleteWarna = async (warna: Warna) => {
    try {
      await deleteWarna(warna.id);
      message.success('Warna deleted successfully');
      fetchWarnas();
    } catch (error) {
      message.error('Failed to delete warna');
      console.error('Error deleting warna:', error);
    }
  };

  const handleProductSubmit = async (values: ProductCreateRequest | ProductUpdateRequest) => {
    try {
      setSubmittingProduct(true);
      if (selectedProduct) {
        await updateProduct(selectedProduct.id, values);
        message.success('Product updated successfully');
      } else {
        await createProduct(values as ProductCreateRequest);
        message.success('Product created successfully');
      }
      setProductModalVisible(false);
      fetchProducts();
    } catch (error) {
      message.error(selectedProduct ? 'Failed to update product' : 'Failed to create product');
      console.error('Error with product:', error);
    } finally {
      setSubmittingProduct(false);
    }
  };

  const handleBahanSubmit = async (values: any) => {
    try {
      setSubmittingBahan(true);
      const bahanData = {
        name: values.name,
        productId: values.product_id,
      };
      
      if (selectedBahan) {
        await updateBahan(selectedBahan.id, bahanData);
        message.success('Bahan updated successfully');
      } else {
        await createBahan(bahanData);
        message.success('Bahan created successfully');
      }
      setBahanModalVisible(false);
      fetchBahans();
    } catch (error) {
      message.error(selectedBahan ? 'Failed to update bahan' : 'Failed to create bahan');
      console.error('Error with bahan:', error);
    } finally {
      setSubmittingBahan(false);
    }
  };

  const handleWarnaSubmit = async (values: any) => {
    try {
      setSubmittingWarna(true);
      const warnaData = {
        name: values.name,
        bahanId: values.bahan_id,
      };
      
      if (selectedWarna) {
        await updateWarna(selectedWarna.id, warnaData);
        message.success('Warna updated successfully');
      } else {
        await createWarna(warnaData);
        message.success('Warna created successfully');
      }
      setWarnaModalVisible(false);
      fetchWarnas();
    } catch (error) {
      message.error(selectedWarna ? 'Failed to update warna' : 'Failed to create warna');
      console.error('Error with warna:', error);
    } finally {
      setSubmittingWarna(false);
    }
  };

  // CSV parsing function
  const parseCSV = (csvText: string): { name: string; code: string; description?: string }[] => {
    const lines = csvText.split('\n');
    const result: { name: string; code: string; description?: string }[] = [];
    
    // Skip header if present
    const startIndex = lines[0]?.toLowerCase().includes('name') ? 1 : 0;
    
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const columns = line.split(',').map(col => col.trim().replace(/"/g, ''));
      if (columns.length >= 2) {
        result.push({
          name: columns[0],
          code: columns[1],
          description: columns[2] || undefined
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
        message.error('No valid product data found in CSV');
        return;
      }
      
      setUploadProgress(50);
      
      const result = await bulkInsertProducts({ products });
      
      setUploadProgress(100);
      setUploadResult(result.data || null);
      
      if (result.data) {
        const { total_created, total_skipped } = result.data;
        message.success(`Bulk upload completed! Created: ${total_created}, Skipped: ${total_skipped}`);
        fetchProducts(); // Refresh the product list
      }
    } catch (error: any) {
      message.error('Failed to upload products: ' + (error.response?.data?.message || error.message));
      console.error('Error during bulk upload:', error);
    } finally {
      setUploading(false);
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
    <div style={{ padding: "24px" }}>
      <div style={{ marginBottom: 24 }}>
        <Typography.Title level={2}>
          <Database size={24} style={{ marginRight: 8, verticalAlign: "middle" }} />
          Master Data Management
        </Typography.Title>
        <Typography.Text type="secondary">
          Manage products, bahan, and warna data for the system.
        </Typography.Text>
      </div>

      <Card>
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
          onFinish={handleProductSubmit}
        >
          <Form.Item
            name="name"
            label="Product Name"
            rules={[{ required: true, message: "Please enter product name" }]}
          >
            <Input placeholder="Enter product name" />
          </Form.Item>
          <Form.Item
            name="code"
            label="Product Code"
            rules={[{ required: true, message: "Please enter product code" }]}
          >
            <Input placeholder="Enter product code" />
          </Form.Item>
          <Form.Item
            name="description"
            label="Description (Optional)"
          >
            <Input.TextArea placeholder="Enter product description" rows={3} />
          </Form.Item>
          <div style={{ textAlign: "right" }}>
            <Space>
              <Button onClick={() => setProductModalVisible(false)}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={submittingProduct}>
                {selectedProduct ? "Update" : "Create"}
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
        <Form
          form={bahanForm}
          layout="vertical"
          onFinish={handleBahanSubmit}
        >
          <Form.Item
            name="product_id"
            label="Product"
            rules={[{ required: true, message: "Please select a product" }]}
          >
            <Select placeholder="Select a product">
              {products.map((product) => (
                <Select.Option key={product.id} value={product.id}>
                  {product.name} ({product.code})
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
          <div style={{ textAlign: "right" }}>
            <Space>
              <Button onClick={() => setBahanModalVisible(false)}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={submittingBahan}>
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
        <Form
          form={warnaForm}
          layout="vertical"
          onFinish={handleWarnaSubmit}
        >
          <Form.Item
            name="bahan_id"
            label="Bahan"
            rules={[{ required: true, message: "Please select a bahan" }]}
          >
            <Select placeholder="Select a bahan">
              {bahans.map((bahan) => (
                <Select.Option key={bahan.id} value={bahan.id}>
                  {bahan.name} ({bahan.product?.name})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="name"
            label="Warna Name"
            rules={[{ required: true, message: "Please enter warna name" }]}
          >
            <Input placeholder="Enter warna name" />
          </Form.Item>
          <div style={{ textAlign: "right" }}>
            <Space>
              <Button onClick={() => setWarnaModalVisible(false)}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={submittingWarna}>
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
                  <strong>Total Attempted:</strong> {uploadResult.total_attempted}
                </div>
                <div style={{ marginBottom: 8 }}>
                  <strong>Successfully Created:</strong> {uploadResult.total_created}
                </div>
                <div style={{ marginBottom: 8 }}>
                  <strong>Skipped (duplicates/errors):</strong> {uploadResult.total_skipped}
                </div>
                
                {uploadResult.errors && uploadResult.errors.length > 0 && (
                  <div>
                    <strong>Errors:</strong>
                    <div style={{ maxHeight: 150, overflowY: 'auto', marginTop: 8 }}>
                      {uploadResult.errors.map((error, index) => (
                        <div key={index} style={{ fontSize: '12px', color: '#ff4d4f', marginBottom: 4 }}>
                          Row {error.index + 1}: {error.name} ({error.code}) - {error.error}
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
    </div>
  );
};

export default MasterData;