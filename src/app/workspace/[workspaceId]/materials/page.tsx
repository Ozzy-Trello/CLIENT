"use client";

import React, { useEffect, useState } from "react";
import { 
  Table, 
  Card, 
  Button, 
  Space, 
  Typography, 
  Spin, 
  Alert, 
  Tag, 
  Modal, 
  Form, 
  Input, 
  InputNumber, 
  Popconfirm, 
  Tabs,
  Select,
  Tooltip,
  message
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, HolderOutlined } from "@ant-design/icons";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { 
  useCategoriesWithSubcategories, 
  useCreateMainCategory, 
  useCreateSubcategory,
  useAllMainCategories,
  useAllSubcategories,
  useUpdateMainCategory,
  useUpdateSubcategory,
  useDeleteMainCategory,
  useDeleteSubcategory,
  useCreateJunction,
  useUpdateJunction,
  useDeleteJunction,
  useReorderSubcategories,
} from "../../../../hooks/category";
import { 
  MainCategoryWithSubcategories, 
  CreateMainCategoryRequest, 
  CreateSubcategoryRequest,
  MainCategory,
  Subcategory,
  UpdateMainCategoryRequest,
  UpdateSubcategoryRequest,
  CreateJunctionRequest,
  SubcategoryWithJunctionData
} from "../../../../types/category";

const { Title } = Typography;

// Operator symbol mapping
const getOperatorSymbol = (operator: string): string => {
  const symbolMap: Record<string, string> = {
    'add': '+',
    'subtract': '-',
    'multiply': '*',
    'divide': '/'
  };
  return symbolMap[operator] || '+';
};

export default function MaterialsPage({ params }: { params: { workspaceId: string } }) {
  const { workspaceId } = params;
  const [activeTab, setActiveTab] = useState("materials");
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSubcategoryModalOpen, setIsSubcategoryModalOpen] = useState(false);
  const [isJunctionModalOpen, setIsJunctionModalOpen] = useState(false);
  const [isEditCategoryModalOpen, setIsEditCategoryModalOpen] = useState(false);
  const [isEditSubcategoryModalOpen, setIsEditSubcategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MainCategoryWithSubcategories | null>(null);
  const [editingMainCategory, setEditingMainCategory] = useState<MainCategory | null>(null);
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);
  const [editingJunctionId, setEditingJunctionId] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState<{
    junctionId: string;
    weight: number;
    operator: "add" | "subtract" | "multiply" | "divide";
  } | null>(null);
  
  const [categoryForm] = Form.useForm();
  const [subcategoryForm] = Form.useForm();
  const [junctionForm] = Form.useForm();
  const [editCategoryForm] = Form.useForm();
  const [editSubcategoryForm] = Form.useForm();
  const [subcategoriesOrder, setSubcategoriesOrder] = useState<Subcategory[]>([]);

  // Data hooks
  const { 
    data: categoriesWithSubcategories, 
    isLoading: categoriesLoading, 
    error: categoriesError,
    refetch: refetchCategories
  } = useCategoriesWithSubcategories(workspaceId);
  
  const { 
    data: allMainCategories, 
    isLoading: isLoadingMainCategories 
  } = useAllMainCategories(workspaceId);
  
  const { 
    data: allSubcategories, 
    isLoading: isLoadingSubcategories,
    refetch: refetchAllSubcategories,
  } = useAllSubcategories(workspaceId);

  // Mutation hooks
  const createMainCategoryMutation = useCreateMainCategory(workspaceId);
  const createSubcategoryMutation = useCreateSubcategory(workspaceId);
  const updateMainCategoryMutation = useUpdateMainCategory(workspaceId);
  const updateSubcategoryMutation = useUpdateSubcategory(workspaceId);
  const deleteMainCategoryMutation = useDeleteMainCategory(workspaceId);
  const deleteSubcategoryMutation = useDeleteSubcategory(workspaceId);
  const createJunctionMutation = useCreateJunction(workspaceId);
  const updateJunctionMutation = useUpdateJunction(workspaceId);
  const deleteJunctionMutation = useDeleteJunction(workspaceId);
  const reorderSubcategoriesMutation = useReorderSubcategories(workspaceId);

  const formatDate = (date?: string | Date) => {
    if (!date) return "-";
    try {
      const dateObj = typeof date === "string" ? new Date(date) : date;
      return isNaN(dateObj.getTime()) ? "-" : dateObj.toLocaleDateString();
    } catch {
      return "-";
    }
  };

  useEffect(() => {
    if (allSubcategories?.data) {
      const ordered = [...allSubcategories.data].sort(
        (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)
      );
      setSubcategoriesOrder(ordered);
    }
  }, [allSubcategories?.data]);

  // Junction Modal Functions
  const handleEditJunctions = (category: MainCategoryWithSubcategories) => {
    setEditingCategory(category);
    setIsJunctionModalOpen(true);
  };

  const handleJunctionModalCancel = () => {
    setIsJunctionModalOpen(false);
    setEditingCategory(null);
    junctionForm.resetFields();
  };

  const handleAddSubcategory = async (values: { subcategoryId: string; calculationWeight: number; operator?: "add" | "subtract" | "multiply" | "divide" }) => {
    if (!editingCategory) return;

    try {
      const junctionData: CreateJunctionRequest = {
        mainCategoryId: editingCategory.id,
        subcategoryId: values.subcategoryId,
        calculationWeight: values.calculationWeight || 1,
        displayOrder: (editingCategory.subcategories?.length || 0) + 1,
        isTotalField: false,
        isEditableTotal: false,
        operator: values.operator || "add",
      };

      await createJunctionMutation.mutateAsync(junctionData);
      junctionForm.resetFields();
      message.success("Subcategory added successfully");
    } catch (error) {
      console.error("Error adding subcategory:", error);
    }
  };

  const handleRemoveSubcategory = async (junctionId: string) => {
    try {
      await deleteJunctionMutation.mutateAsync(junctionId);
      message.success("Subcategory removed from category successfully!");
    } catch (error) {
      console.error("Error removing subcategory:", error);
      message.error("Failed to remove subcategory from category");
    }
  };

  const handleSaveJunction = async () => {
    if (!pendingChanges) return;
    
    try {
      await updateJunctionMutation.mutateAsync({
        id: pendingChanges.junctionId,
        junction: {
          calculationWeight: pendingChanges.weight,
          operator: pendingChanges.operator,
        },
      });

      setEditingCategory((prev) => {
        if (!prev || !prev.subcategories) {
          return prev;
        }

        const updatedSubcategories = prev.subcategories.map((subcat) => {
          if (subcat.junction?.id === pendingChanges.junctionId) {
            return {
              ...subcat,
              junction: {
                ...subcat.junction,
                calculationWeight: pendingChanges.weight,
                operator: pendingChanges.operator,
              },
            };
          }
          return subcat;
        });

        return {
          ...prev,
          subcategories: updatedSubcategories,
        };
      });

      setEditingJunctionId(null);
      setPendingChanges(null);
      // The hook already handles cache invalidation, so no manual refetch needed
    } catch (error) {
      console.error("Error updating junction:", error);
      // Error message is already handled by the hook
    }
  };

  const handleCancelEdit = () => {
    setEditingJunctionId(null);
    setPendingChanges(null);
  };

  const handleStartEdit = (junction: any) => {
    setEditingJunctionId(junction.id);
    setPendingChanges({
      junctionId: junction.id,
      weight: junction.calculationWeight,
      operator: junction.operator || "add"
    });
  };

  // Handle deleting junction
  const handleDeleteJunction = async (junctionId: string) => {
    try {
      await deleteJunctionMutation.mutateAsync(junctionId);
      message.success("Subcategory removed from category successfully!");
    } catch (error) {
      console.error("Error removing subcategory:", error);
      message.error("Failed to remove subcategory from category");
    }
  };

  // Get available subcategories for junction modal
  // Helper function to get available subcategories for junction creation
  const getAvailableSubcategories = () => {
    if (!allSubcategories?.data) return [];
    
    return allSubcategories.data.filter((sub: Subcategory) => {
      // Check if this subcategory is already assigned to the editing category
      if (!editingCategory || !editingCategory.subcategories) return true;
      
      return !editingCategory.subcategories.some((existingSub: SubcategoryWithJunctionData) => 
        existingSub.id === sub.id
      );
    });
  };

  // Handler functions
  const handleCreateCategory = async (values: CreateMainCategoryRequest) => {
    try {
      await createMainCategoryMutation.mutateAsync(values);
      setIsCategoryModalOpen(false);
      categoryForm.resetFields();
    } catch (error) {
      console.error("Failed to create category:", error);
    }
  };

  const handleCreateSubcategory = async (values: CreateSubcategoryRequest) => {
    try {
      await createSubcategoryMutation.mutateAsync(values);
      setIsSubcategoryModalOpen(false);
      subcategoryForm.resetFields();
    } catch (error) {
      console.error("Failed to create subcategory:", error);
    }
  };

  // Materials tab handlers
  const handleEdit = (record: MainCategoryWithSubcategories) => {
    handleEditJunctions(record);
  };

  const handleDelete = (record: MainCategoryWithSubcategories) => {
    // TODO: Implement delete functionality
    console.log("Delete category:", record);
  };

  // Main Category handlers
  const handleEditMainCategory = (category: MainCategory) => {
    setEditingMainCategory(category);
    editCategoryForm.setFieldsValue({
      name: category.name,
      displayOrder: category.displayOrder,
    });
    setIsEditCategoryModalOpen(true);
  };

  const handleUpdateMainCategory = async (values: UpdateMainCategoryRequest) => {
    if (!editingMainCategory) return;
    
    try {
      await updateMainCategoryMutation.mutateAsync({
        id: editingMainCategory.id,
        data: values,
      });
      setIsEditCategoryModalOpen(false);
      editCategoryForm.resetFields();
      setEditingMainCategory(null);
    } catch (error) {
      console.error("Failed to update main category:", error);
    }
  };

  const handleDeleteMainCategory = async (categoryId: string) => {
    try {
      await deleteMainCategoryMutation.mutateAsync(categoryId);
    } catch (error) {
      console.error("Failed to delete main category:", error);
    }
  };

  // Subcategory handlers
  const handleEditSubcategory = (subcategory: Subcategory) => {
    setEditingSubcategory(subcategory);
    editSubcategoryForm.setFieldsValue({
      name: subcategory.name,
    });
    setIsEditSubcategoryModalOpen(true);
  };

  const handleUpdateSubcategory = async (values: UpdateSubcategoryRequest) => {
    if (!editingSubcategory) return;
    
    try {
      await updateSubcategoryMutation.mutateAsync({
        id: editingSubcategory.id,
        data: values,
      });
      setIsEditSubcategoryModalOpen(false);
      editSubcategoryForm.resetFields();
      setEditingSubcategory(null);
    } catch (error) {
      console.error("Failed to update subcategory:", error);
    }
  };

  const handleDeleteSubcategory = async (subcategoryId: string) => {
    try {
      await deleteSubcategoryMutation.mutateAsync(subcategoryId);
    } catch (error) {
      console.error("Failed to delete subcategory:", error);
    }
  };

  const handleSubcategoryDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const current = [...subcategoriesOrder].sort(
      (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)
    );

    const [moved] = current.splice(result.source.index, 1);
    current.splice(result.destination.index, 0, moved);

    const reindexed = current.map((item, idx) => ({
      ...item,
      displayOrder: idx + 1,
    }));

    const previous = subcategoriesOrder;
    setSubcategoriesOrder(reindexed);

    try {
      await reorderSubcategoriesMutation.mutateAsync(
        reindexed.map((item) => ({
          id: item.id,
          displayOrder: item.displayOrder ?? 0,
        }))
      );
      refetchAllSubcategories();
    } catch (error) {
      setSubcategoriesOrder(previous);
    }
  };

  if (categoriesLoading) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>Loading materials...</div>
      </div>
    );
  }

  if (categoriesError) {
    return (
      <Alert
        message="Error Loading Materials"
        description="Failed to load categories and subcategories. Please try again."
        type="error"
        showIcon
        style={{ margin: "24px" }}
      />
    );
  }

  // Materials tab columns
  const materialsColumns = [
    {
      title: "Category Name",
      dataIndex: "name",
      key: "name",
      render: (text: string) => <Typography.Text strong>{text}</Typography.Text>,
    },
    {
      title: "Subcategories",
      key: "subcategories",
      render: (subcategories: SubcategoryWithJunctionData[], record: MainCategoryWithSubcategories) => (
          <Space wrap>
            {record.subcategories?.map((sub: SubcategoryWithJunctionData) => (
              <Tooltip 
                key={sub.id}
                title={sub.junction ? `Order: ${sub.junction.displayOrder}` : "No junction data"}
              >
                <Tag 
                  color="blue"
                  closable
                  onClose={() => sub.junction && handleRemoveSubcategory(sub.junction.id)}
                >
                  {sub.name}
                  {sub.junction && (
                    <span style={{ color: '#666', fontWeight: 'normal' }}>
                      {" "}({getOperatorSymbol(sub.junction.operator || "add")} {sub.junction.calculationWeight})
                    </span>
                  )}
                </Tag>
              </Tooltip>
            ))}
          </Space>
        ),
    },
    {
      title: "Total Subcategories",
      key: "totalSubcategories",
      render: (record: MainCategoryWithSubcategories) => record.subcategories?.length || 0,
    },
    {
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string | Date) => {
        if (!date) return "-";
        try {
          const dateObj = typeof date === "string" ? new Date(date) : date;
          return isNaN(dateObj.getTime()) ? "-" : dateObj.toLocaleDateString();
        } catch {
          return "-";
        }
      },
    },
    {
      title: "Actions",
      key: "actions",
      render: (record: MainCategoryWithSubcategories) => (
        <Space>
          <Button type="link" onClick={() => handleEdit(record)}>
            Edit
          </Button>
          <Popconfirm
            title="Are you sure you want to delete this category?"
            onConfirm={() => handleDelete(record)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="link" danger>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const tabItems = [
    {
      key: "materials",
      label: "Materials",
      children: (
        <Card>
          <div className="mb-4">
            <Typography.Title level={4}>Category-Subcategory Relationships</Typography.Title>
            <Typography.Text type="secondary">
              Manage the relationships between categories and subcategories. Edit to assign or remove subcategories.
            </Typography.Text>
          </div>
          <Table
              columns={materialsColumns}
              dataSource={categoriesWithSubcategories || []}
              loading={categoriesLoading}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
              }}
            />
        </Card>
      ),
    },
    {
      key: "categories",
      label: "Categories",
      children: (
        <Card>
          <div style={{ 
            marginBottom: "16px", 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center" 
          }}>
            <Title level={3} style={{ margin: 0 }}>
              Main Categories
            </Title>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setIsCategoryModalOpen(true)}
            >
              Add Category
            </Button>
          </div>
          
          <Table
            columns={[
              {
                title: "Name",
                dataIndex: "name",
                key: "name",
                sorter: (a: MainCategory, b: MainCategory) => a.name.localeCompare(b.name),
              },
              {
                title: "Created At",
                dataIndex: "createdAt",
                key: "createdAt",
                render: (date: string | Date) => {
                  if (!date) return "-";
                  const dateObj = typeof date === 'string' ? new Date(date) : date;
                  return isNaN(dateObj.getTime()) ? "-" : dateObj.toLocaleDateString();
                },
                width: 150,
              },
              {
                title: "Actions",
                key: "actions",
                width: 120,
                render: (_, record: MainCategory) => (
                  <Space>
                    <Button
                      type="text"
                      icon={<EditOutlined />}
                      onClick={() => handleEditMainCategory(record)}
                      size="small"
                    />
                    <Popconfirm
                      title="Delete Category"
                      description="Are you sure you want to delete this category?"
                      onConfirm={() => handleDeleteMainCategory(record.id)}
                      okText="Yes"
                      cancelText="No"
                    >
                      <Button
                        type="text"
                        icon={<DeleteOutlined />}
                        danger
                        size="small"
                      />
                    </Popconfirm>
                  </Space>
                ),
              },
            ]}
            dataSource={allMainCategories?.data || []}
            rowKey="id"
            loading={isLoadingMainCategories}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} of ${total} main categories`,
            }}
            locale={{
              emptyText: "No main categories found.",
            }}
          />
        </Card>
      ),
    },
    {
      key: "subcategories",
      label: "Subcategories",
      children: (
        <Card>
          <div style={{ 
            marginBottom: "16px", 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center" 
          }}>
            <Title level={3} style={{ margin: 0 }}>
              Subcategories
            </Title>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setIsSubcategoryModalOpen(true)}
            >
              Add Subcategory
            </Button>
          </div>

          <DragDropContext onDragEnd={handleSubcategoryDragEnd}>
            <Droppable droppableId="subcategories">
              {(provided) => {
                const orderedSubs = [...subcategoriesOrder].sort(
                  (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)
                );

                return (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={{
                      border: "1px solid #f0f0f0",
                      borderRadius: 8,
                      padding: 8,
                      background: "#fff",
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "70px 1fr 160px 140px",
                        padding: "10px 12px",
                        fontWeight: 600,
                        color: "#555",
                        borderBottom: "1px solid #f0f0f0",
                        background: "#fafafa",
                        borderRadius: 6,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <HolderOutlined />
                        <span>Order</span>
                      </div>
                      <div>Name</div>
                      <div>Created At</div>
                      <div>Actions</div>
                    </div>

                    {isLoadingSubcategories ? (
                      <Spin style={{ display: "block", padding: "24px" }} />
                    ) : orderedSubs.length === 0 ? (
                      <div style={{ padding: "16px", textAlign: "center" }}>
                        <Typography.Text type="secondary">
                          No subcategories found.
                        </Typography.Text>
                      </div>
                    ) : (
                      orderedSubs.map((sub, index) => (
                        <Draggable
                          key={sub.id}
                          draggableId={sub.id}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              style={{
                                ...provided.draggableProps.style,
                                display: "grid",
                                gridTemplateColumns: "70px 1fr 160px 140px",
                                padding: "12px",
                                alignItems: "center",
                                borderBottom:
                                  index === orderedSubs.length - 1
                                    ? "none"
                                    : "1px solid #f5f5f5",
                                background: snapshot.isDragging
                                  ? "#e6f7ff"
                                  : "transparent",
                                borderRadius: snapshot.isDragging ? 6 : 0,
                              }}
                            >
                              <div
                                {...provided.dragHandleProps}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                  cursor: "grab",
                                  color: "#8c8c8c",
                                }}
                              >
                                <HolderOutlined />
                                <span>{sub.displayOrder ?? index + 1}</span>
                              </div>
                              <div>{sub.name}</div>
                              <div>{formatDate(sub.createdAt)}</div>
                              <div>
                                <Space>
                                  <Button
                                    type="text"
                                    icon={<EditOutlined />}
                                    onClick={() => handleEditSubcategory(sub)}
                                    size="small"
                                  />
                                  <Popconfirm
                                    title="Delete Subcategory"
                                    description="Are you sure you want to delete this subcategory?"
                                    onConfirm={() => handleDeleteSubcategory(sub.id)}
                                    okText="Yes"
                                    cancelText="No"
                                  >
                                    <Button
                                      type="text"
                                      icon={<DeleteOutlined />}
                                      danger
                                      size="small"
                                    />
                                  </Popconfirm>
                                </Space>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))
                    )}
                    {provided.placeholder}
                  </div>
                );
              }}
            </Droppable>
          </DragDropContext>
        </Card>
      ),
    },
  ];

  return (
    <div style={{ 
      height: "100vh", 
      overflow: "auto", 
      padding: "24px" 
    }}>
      <div style={{ marginBottom: "24px" }}>
        <Title level={2} style={{ margin: 0 }}>
          Materials Management
        </Title>
      </div>
      
      <Tabs
        defaultActiveKey="materials"
        items={tabItems}
        size="large"
      />

      {/* Junction Edit Modal */}
      <Modal
        title={`Edit Subcategories for "${editingCategory?.name}"`}
        open={isJunctionModalOpen}
        onCancel={handleJunctionModalCancel}
        footer={null}
        width={800}
      >
        <div className="space-y-6">
          {/* Current Subcategories */}
          <div>
            <Typography.Title level={5}>Current Subcategories</Typography.Title>
            <div className="space-y-2">
              {editingCategory?.subcategories?.map((subcategory: SubcategoryWithJunctionData) => (
                <div key={subcategory.id} className="flex justify-between items-center p-3 border rounded">
                  <div className="flex-1">
                    <Typography.Text strong>{subcategory.name}</Typography.Text>
                    {subcategory.junction && (
                      <div className="mt-2 space-y-2">
                        <div className="text-sm text-gray-500">
                          Order: {subcategory.junction.displayOrder}
                          {subcategory.junction.isTotalField && <Tag color="orange" className="ml-2">Total Field</Tag>}
                        </div>
                        {editingJunctionId === subcategory.junction.id ? (
                          <div className="flex items-center space-x-2">
                            <Select
                              value={pendingChanges?.operator || subcategory.junction.operator || "add"}
                              style={{ width: 100 }}
                              onChange={(value) => {
                                setPendingChanges(prev => prev ? { ...prev, operator: value } : null);
                              }}
                              options={[
                                { label: "Add (+)", value: "add" },
                                { label: "Subtract (-)", value: "subtract" },
                                { label: "Multiply (*)", value: "multiply" },
                                { label: "Divide (/)", value: "divide" },
                              ]}
                            />
                            <InputNumber
                              value={pendingChanges?.weight || subcategory.junction.calculationWeight}
                              min={0.1}
                              step={0.1}
                              style={{ width: 80 }}
                              onChange={(value) => {
                                setPendingChanges(prev => prev ? { ...prev, weight: value || 1 } : null);
                              }}
                            />
                            <Button 
                              size="small" 
                              type="primary"
                              onClick={handleSaveJunction}
                              loading={updateJunctionMutation.isPending}
                            >
                              ✓
                            </Button>
                            <Button 
                              size="small" 
                              onClick={handleCancelEdit}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-600">
                              {getOperatorSymbol(subcategory.junction.operator || "add")} {subcategory.junction.calculationWeight}
                            </span>
                            {!subcategory.junction.isTotalField && (
                              <Button 
                                size="small" 
                                type="link" 
                                onClick={() => handleStartEdit(subcategory.junction)}
                              >
                                Edit
                              </Button>
                            )}
                            {subcategory.junction.isTotalField && (
                              <span className="text-xs text-gray-400 italic">
                                (Informational only)
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <Popconfirm
                    title="Remove this subcategory from the category?"
                    onConfirm={() => subcategory.junction && handleRemoveSubcategory(subcategory.junction.id)}
                    okText="Yes"
                    cancelText="No"
                  >
                    <Button type="link" danger size="small">
                      Remove
                    </Button>
                  </Popconfirm>
                </div>
              )) || <Typography.Text type="secondary">No subcategories assigned</Typography.Text>}
            </div>
          </div>

          {/* Add New Subcategory */}
          <div>
            <Typography.Title level={5}>Add Subcategory</Typography.Title>
            <Form
              form={junctionForm}
              layout="inline"
              onFinish={handleAddSubcategory}
              className="space-x-2"
            >
              <Form.Item
                name="subcategoryId"
                rules={[{ required: true, message: "Please select a subcategory" }]}
              >
                <Select
                  placeholder="Select subcategory"
                  style={{ width: 200 }}
                  options={getAvailableSubcategories().map((sub: Subcategory) => ({
                    label: sub.name,
                    value: sub.id,
                  }))}
                />
              </Form.Item>
              <Form.Item
                name="calculationWeight"
                initialValue={1}
                rules={[{ required: true, message: "Please enter weight" }]}
              >
                <InputNumber
                  placeholder="Weight"
                  min={0}
                  step={0.1}
                  style={{ width: 100 }}
                />
              </Form.Item>
              <Form.Item
                name="operator"
                initialValue="add"
                rules={[{ required: true, message: "Please select operator" }]}
              >
                <Select
                  placeholder="Operator"
                  style={{ width: 120 }}
                  options={[
                    { label: "Add (+)", value: "add" },
                    { label: "Subtract (-)", value: "subtract" },
                    { label: "Multiply (×)", value: "multiply" },
                    { label: "Divide (÷)", value: "divide" },
                  ]}
                />
              </Form.Item>
              <Form.Item>
                <Button 
                  type="primary" 
                  htmlType="submit"
                  loading={createJunctionMutation.isPending}
                  disabled={getAvailableSubcategories().length === 0}
                >
                  Add
                </Button>
              </Form.Item>
            </Form>
            {getAvailableSubcategories().length === 0 && (
              <Typography.Text type="secondary" className="block mt-2">
                All available subcategories are already assigned to this category.
              </Typography.Text>
            )}
          </div>
        </div>
      </Modal>

      {/* Add Category Modal */}
      <Modal
        title="Add New Category"
        open={isCategoryModalOpen}
        onCancel={() => {
          setIsCategoryModalOpen(false);
          categoryForm.resetFields();
        }}
        footer={null}
      >
        <Form
          form={categoryForm}
          layout="vertical"
          onFinish={handleCreateCategory}
        >
          <Form.Item
            name="name"
            label="Category Name"
            rules={[
              { required: true, message: "Please enter category name" },
              { min: 2, message: "Category name must be at least 2 characters" },
            ]}
          >
            <Input placeholder="Enter category name" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
            <Space>
              <Button onClick={() => {
                setIsCategoryModalOpen(false);
                categoryForm.resetFields();
              }}>
                Cancel
              </Button>
              <Button 
                type="primary" 
                htmlType="submit"
                loading={createMainCategoryMutation.isPending}
              >
                Create Category
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Add Subcategory Modal */}
      <Modal
        title="Add New Subcategory"
        open={isSubcategoryModalOpen}
        onCancel={() => {
          setIsSubcategoryModalOpen(false);
          subcategoryForm.resetFields();
        }}
        footer={null}
      >
        <Form
          form={subcategoryForm}
          layout="vertical"
          onFinish={handleCreateSubcategory}
        >
          <Form.Item
            name="name"
            label="Subcategory Name"
            rules={[
              { required: true, message: "Please enter subcategory name" },
              { min: 2, message: "Subcategory name must be at least 2 characters" },
            ]}
          >
            <Input placeholder="Enter subcategory name" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
            <Space>
              <Button onClick={() => {
                setIsSubcategoryModalOpen(false);
                subcategoryForm.resetFields();
              }}>
                Cancel
              </Button>
              <Button 
                type="primary" 
                htmlType="submit"
                loading={createSubcategoryMutation.isPending}
              >
                Create Subcategory
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Main Category Modal */}
      <Modal
        title="Edit Main Category"
        open={isEditCategoryModalOpen}
        onCancel={() => {
          setIsEditCategoryModalOpen(false);
          editCategoryForm.resetFields();
          setEditingMainCategory(null);
        }}
        footer={null}
      >
        <Form
          form={editCategoryForm}
          layout="vertical"
          onFinish={handleUpdateMainCategory}
        >
          <Form.Item
            name="name"
            label="Category Name"
            rules={[
              { required: true, message: "Please enter category name" },
              { min: 2, message: "Category name must be at least 2 characters" },
            ]}
          >
            <Input placeholder="Enter category name" />
          </Form.Item>

          <Form.Item
            name="displayOrder"
            label="Display Order"
            rules={[
              { required: true, message: "Please enter display order" },
              { type: "number", min: 0, message: "Display order must be a positive number" },
            ]}
          >
            <InputNumber
              placeholder="Enter display order"
              style={{ width: "100%" }}
              min={0}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
            <Space>
              <Button onClick={() => {
                setIsEditCategoryModalOpen(false);
                editCategoryForm.resetFields();
                setEditingMainCategory(null);
              }}>
                Cancel
              </Button>
              <Button 
                type="primary" 
                htmlType="submit"
                loading={updateMainCategoryMutation.isPending}
              >
                Update Category
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Subcategory Modal */}
      <Modal
        title="Edit Subcategory"
        open={isEditSubcategoryModalOpen}
        onCancel={() => {
          setIsEditSubcategoryModalOpen(false);
          editSubcategoryForm.resetFields();
          setEditingSubcategory(null);
        }}
        footer={null}
      >
        <Form
          form={editSubcategoryForm}
          layout="vertical"
          onFinish={handleUpdateSubcategory}
        >
          <Form.Item
            name="name"
            label="Subcategory Name"
            rules={[
              { required: true, message: "Please enter subcategory name" },
              { min: 2, message: "Subcategory name must be at least 2 characters" },
            ]}
          >
            <Input placeholder="Enter subcategory name" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
            <Space>
              <Button onClick={() => {
                setIsEditSubcategoryModalOpen(false);
                editSubcategoryForm.resetFields();
                setEditingSubcategory(null);
              }}>
                Cancel
              </Button>
              <Button 
                type="primary" 
                htmlType="submit"
                loading={updateSubcategoryMutation.isPending}
              >
                Update Subcategory
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
