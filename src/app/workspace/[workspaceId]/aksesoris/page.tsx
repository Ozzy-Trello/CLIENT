"use client";

import {
  Button,
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
  Card,
  Empty,
  Upload,
  Progress,
  Alert,
  Tag,
} from "antd";
import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import {
  Edit,
  Plus,
  Trash,
  Star,
  Upload as UploadIcon,
  FileText,
} from "lucide-react";
import { usePermissions } from "@hooks/account";

import {
  getAccessories,
  createAccessory,
  updateAccessory,
  deleteAccessory,
  bulkInsertAccessories,
  Accessory,
  AccessoryBulkInsertResult,
} from "@api/accessory";
import { getProducts, Product as ProductAPI } from "@api/product";

type Product = ProductAPI;

// ─── CSV Parser ───────────────────────────────────────────────────────────────
const parseAccessoryCSV = (
  csvText: string
): { name: string; productName: string }[] => {
  const lines = csvText.split("\n");
  const result: { name: string; productName: string }[] = [];

  // Skip header if present
  const firstLine = lines[0]?.replace(/^\uFEFF/, "").toLowerCase() || "";
  const isHeader =
    firstLine.includes("name") ||
    firstLine.includes("produk") ||
    firstLine.includes("product") ||
    firstLine.includes("aksesoris") ||
    firstLine.includes("accessory");
  const startIndex = isHeader ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const columns = line.split(",").map((col) => col.trim().replace(/"/g, ""));
    if (columns.length >= 2) {
      // CSV format: PRODUK, AKSESORIS (product first, accessory second)
      const productName = columns[0];
      const name = columns[1];
      if (name && productName) {
        result.push({ name, productName });
      }
    }
  }

  return result;
};

// ─── Accessory Table Component ────────────────────────────────────────────────
const AccessoryTable: React.FC<{
  dataSource?: Accessory[];
  onEdit: (accessory: Accessory) => void;
  onDelete: (accessory: Accessory) => void;
  loading?: boolean;
}> = ({ dataSource = [], onEdit, onDelete, loading = false }) => {
  const { isSuperAdmin } = usePermissions();

  const columns = [
    {
      title: "Accessory Name",
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
      title: "Action",
      key: "action",
      width: 120,
      render: (_: any, record: Accessory) => (
        <Space size="middle">
          <Tooltip title="Edit accessory">
            <Button
              type="text"
              icon={<Edit size={16} />}
              onClick={() => onEdit(record)}
              disabled={!isSuperAdmin()}
            />
          </Tooltip>
          <Tooltip title="Delete accessory">
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
      locale={{
        emptyText: (
          <Empty
            description="No accessories found"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ),
      }}
    />
  );
};

// ─── Main Page Component ──────────────────────────────────────────────────────
export default function AksesorisPage() {
  const params = useParams();
  const workspaceId = Array.isArray(params?.workspaceId)
    ? params.workspaceId[0]
    : (params?.workspaceId as string | undefined);

  const { isSuperAdmin } = usePermissions();

  // Data state
  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Loading state
  const [loadingAccessories, setLoadingAccessories] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAccessory, setSelectedAccessory] =
    useState<Accessory | null>(null);

  // Bulk upload state
  const [bulkUploadVisible, setBulkUploadVisible] = useState(false);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkUploadProgress, setBulkUploadProgress] = useState(0);
  const [bulkUploadResult, setBulkUploadResult] =
    useState<AccessoryBulkInsertResult | null>(null);

  // Filter state
  const [filterProductId, setFilterProductId] = useState<string | undefined>(
    undefined
  );

  // Form
  const [form] = Form.useForm();

  // Ref to track if data has been fetched
  const dataFetched = useRef(false);

  // ─── Fetch functions ────────────────────────────────────────────────────────
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

  const fetchAccessories = async () => {
    try {
      setLoadingAccessories(true);
      const response = await getAccessories(1, 1000, filterProductId);
      if (response.data) {
        setAccessories(response.data);
      }
    } catch (error) {
      message.error("Failed to fetch accessories");
      console.error("Error fetching accessories:", error);
    } finally {
      setLoadingAccessories(false);
    }
  };

  // ─── Data loading ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (isSuperAdmin() && !dataFetched.current) {
      dataFetched.current = true;
      fetchProducts();
      fetchAccessories();
    }
  }, [isSuperAdmin()]);

  // Refetch when filter changes
  useEffect(() => {
    if (dataFetched.current) {
      fetchAccessories();
    }
  }, [filterProductId]);

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const handleSubmit = async (values: any) => {
    try {
      setSubmitting(true);
      const data = {
        name: values.name,
        productId: values.productId,
      };

      if (selectedAccessory) {
        await updateAccessory(selectedAccessory.id, data);
        message.success("Accessory updated successfully");
      } else {
        await createAccessory(data);
        message.success("Accessory created successfully");
      }
      setModalVisible(false);
      fetchAccessories();
    } catch (error) {
      message.error(
        selectedAccessory
          ? "Failed to update accessory"
          : "Failed to create accessory"
      );
      console.error("Error with accessory:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (accessory: Accessory) => {
    try {
      await deleteAccessory(accessory.id);
      message.success("Accessory deleted successfully");
      fetchAccessories();
    } catch (error) {
      message.error("Failed to delete accessory");
      console.error("Error deleting accessory:", error);
    }
  };

  const handleEdit = (accessory: Accessory) => {
    setSelectedAccessory(accessory);
    form.setFieldsValue({
      name: accessory.name,
      productId: accessory.productId,
    });
    setModalVisible(true);
  };

  const handleAdd = () => {
    setSelectedAccessory(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleBulkUpload = async (file: File) => {
    try {
      setBulkUploading(true);
      setBulkUploadProgress(0);

      const text = await file.text();
      const parsed = parseAccessoryCSV(text);

      if (parsed.length === 0) {
        message.error("No valid accessory data found in CSV");
        return;
      }

      setBulkUploadProgress(50);

      const result = await bulkInsertAccessories({ accessories: parsed });

      setBulkUploadProgress(100);
      setBulkUploadResult(result.data || null);

      if (result.data) {
        const { totalCreated, totalSkipped } = result.data;
        message.success(
          `Bulk upload completed! Created: ${totalCreated}, Skipped: ${totalSkipped}`
        );
        fetchAccessories();
      }
    } catch (error: any) {
      message.error(
        "Failed to upload accessories: " +
          (error.response?.data?.message || error.message)
      );
      console.error("Error during bulk upload:", error);
    } finally {
      setBulkUploading(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div
        style={{
          marginBottom: 24,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>
            <Star
              size={24}
              style={{ marginRight: 8, verticalAlign: "middle" }}
            />
            Aksesoris Management
          </Typography.Title>
          <Typography.Text type="secondary">
            Manage accessories master data linked to products.
          </Typography.Text>
        </div>
        <Space>
          <Button
            icon={<UploadIcon size={16} />}
            onClick={() => {
              setBulkUploadVisible(true);
              setBulkUploadResult(null);
              setBulkUploadProgress(0);
            }}
            disabled={!isSuperAdmin()}
            size="large"
          >
            Bulk Upload
          </Button>
          <Button
            type="primary"
            icon={<Plus size={16} />}
            onClick={handleAdd}
            disabled={!isSuperAdmin()}
            size="large"
          >
            Add Accessory
          </Button>
        </Space>
      </div>

      {/* Filter bar */}
      <Card style={{ marginBottom: 16 }}>
        <Space size="middle" align="center">
          <Typography.Text strong>Filter by Product:</Typography.Text>
          <Select
            placeholder="All Products"
            allowClear
            style={{ width: 280 }}
            value={filterProductId}
            onChange={(value) => setFilterProductId(value)}
            loading={loadingProducts}
          >
            {products.map((product) => (
              <Select.Option key={product.id} value={product.id}>
                {product.name}
              </Select.Option>
            ))}
          </Select>
        </Space>
      </Card>

      {/* Table */}
      <Card style={{ minHeight: "auto", height: "auto" }}>
        <AccessoryTable
          dataSource={accessories}
          onEdit={handleEdit}
          onDelete={(accessory) => {
            Modal.confirm({
              title: "Delete Accessory",
              content: `Are you sure you want to delete "${accessory.name}"?`,
              okText: "Delete",
              okType: "danger",
              onOk: () => handleDelete(accessory),
            });
          }}
          loading={loadingAccessories}
        />
      </Card>

      {/* Create / Edit Modal */}
      <Modal
        title={selectedAccessory ? "Edit Accessory" : "Add Accessory"}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="productId"
            label="Product"
            rules={[{ required: true, message: "Please select a product" }]}
          >
            <Select
              placeholder="Select a product"
              showSearch
              optionFilterProp="children"
              loading={loadingProducts}
            >
              {products.map((product) => (
                <Select.Option key={product.id} value={product.id}>
                  {product.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="name"
            label="Accessory Name"
            rules={[
              { required: true, message: "Please enter accessory name" },
            ]}
          >
            <Input placeholder="Enter accessory name" />
          </Form.Item>
          <div style={{ textAlign: "right" }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                {selectedAccessory ? "Update" : "Create"}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* Bulk Upload Modal */}
      <Modal
        title="Bulk Upload Aksesoris"
        open={bulkUploadVisible}
        onCancel={() => {
          setBulkUploadVisible(false);
          setBulkUploadResult(null);
          setBulkUploadProgress(0);
        }}
        footer={null}
        width={600}
      >
        <div>
          <Alert
            message="Format CSV"
            description={
              <div>
                <p>Upload file CSV dengan 2 kolom:</p>
                <ul style={{ marginLeft: 20, marginTop: 8 }}>
                  <li>
                    <strong>PRODUK</strong> — Nama produk yang sudah ada
                    (wajib)
                  </li>
                  <li>
                    <strong>AKSESORIS</strong> — Nama aksesoris (wajib)
                  </li>
                </ul>
                <p style={{ marginTop: 8 }}>
                  Contoh:{" "}
                  <code style={{ backgroundColor: "#f5f5f5", padding: "2px 6px" }}>
                    Custom Kemeja,Kancing
                  </code>
                </p>
                <p style={{ marginTop: 4, color: "#666" }}>
                  Aksesoris dengan nama dan produk yang sama akan di-skip
                  (tidak duplikat). Nama produk harus sesuai dengan yang ada di
                  master data.
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
              handleBulkUpload(file);
              return false;
            }}
            showUploadList={false}
            disabled={bulkUploading}
          >
            <p className="ant-upload-drag-icon">
              <FileText size={48} style={{ color: "#1890ff" }} />
            </p>
            <p className="ant-upload-text">
              {bulkUploading
                ? "Uploading..."
                : "Klik atau drag file CSV ke sini"}
            </p>
            <p className="ant-upload-hint">
              Hanya mendukung file .csv
            </p>
          </Upload.Dragger>

          {bulkUploading && (
            <div style={{ marginTop: 16 }}>
              <Progress percent={bulkUploadProgress} />
            </div>
          )}

          {bulkUploadResult && (
            <div style={{ marginTop: 16 }}>
              <Card title="Upload Results" size="small">
                <div style={{ marginBottom: 8 }}>
                  <strong>Total Attempted:</strong>{" "}
                  {bulkUploadResult.totalAttempted}
                </div>
                <div style={{ marginBottom: 8 }}>
                  <strong>Created:</strong>{" "}
                  <Tag color="green">{bulkUploadResult.totalCreated}</Tag>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <strong>Skipped (duplicates):</strong>{" "}
                  <Tag color="orange">{bulkUploadResult.totalSkipped}</Tag>
                </div>

                {bulkUploadResult.errors &&
                  bulkUploadResult.errors.length > 0 && (
                    <div>
                      <strong>Errors:</strong>{" "}
                      <Tag color="red">{bulkUploadResult.errors.length}</Tag>
                      <div
                        style={{
                          maxHeight: 150,
                          overflowY: "auto",
                          marginTop: 8,
                          border: "1px solid #f0f0f0",
                          borderRadius: 4,
                          padding: 8,
                          backgroundColor: "#fafafa",
                        }}
                      >
                        {bulkUploadResult.errors.map((error, index) => (
                          <div
                            key={index}
                            style={{
                              fontSize: "12px",
                              marginBottom: 4,
                              paddingBottom: 4,
                              borderBottom:
                                index < bulkUploadResult.errors.length - 1
                                  ? "1px solid #f0f0f0"
                                  : "none",
                            }}
                          >
                            <span style={{ color: "#1890ff" }}>
                              Row {error.index + 1}:
                            </span>{" "}
                            <strong>{error.name}</strong> ({error.productName})
                            —{" "}
                            <span style={{ color: "#ff4d4f" }}>
                              {error.error}
                            </span>
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
              setBulkUploadResult(null);
              setBulkUploadProgress(0);
            }}
          >
            Close
          </Button>
        </div>
      </Modal>
    </div>
  );
}
