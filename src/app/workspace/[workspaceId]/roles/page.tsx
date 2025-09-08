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
  Checkbox,
  Divider,
  Card,
  Row,
  Col,
  Tooltip,
} from "antd";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Settings, Trash, Shield, Eye, Edit } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../../api";
import { usePermissions } from "@hooks/account";

type MenuItem = Required<MenuProps>["items"][number];

interface PermissionInfo {
  id: string;
  level: string;
  description: string;
  permissions: any;
}

interface Role {
  id: string;
  name: string;
  description: string;
  default: boolean;
  permission?: PermissionInfo;
}

interface CustomField {
  id: string;
  name: string;
  description: string;
  canView: string[];
  canEdit: string[];
  isViewAllowed: boolean;
  isEditAllowed: boolean;
}

interface Board {
  id: string;
  name: string;
  description: string;
  isAssigned: boolean;
}

interface RolePermissions {
  customFields: CustomField[];
  boards: Board[];
}

const TableRoles: React.FC<{
  dataSource?: Role[];
  onEdit: (role: Role) => void;
  onDelete: (role: Role) => void;
  canManageRoles: () => boolean;
  permissionLevel: string;
}> = ({
  dataSource = [],
  onEdit,
  onDelete,
  canManageRoles,
  permissionLevel,
}) => {
  const columns = [
    {
      title: "Role Name",
      dataIndex: "name",
      key: "name",
      render: (text: string, record: Role) => (
        <div className="flex items-center gap-3">
          <Avatar
            size="small"
            style={{
              backgroundColor: record.default ? "#1890ff" : "#f0f0f0",
              color: record.default ? "white" : "#666",
            }}
          >
            <Shield size={12} />
          </Avatar>
          <div>
            <div className="font-medium">{text}</div>
            {record.default && (
              <Badge
                count="Default"
                style={{
                  backgroundColor: "#52c41a",
                  fontSize: "10px",
                  padding: "0 6px",
                }}
              />
            )}
          </div>
        </div>
      ),
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      render: (text: string) => (
        <Typography.Text type="secondary">{text}</Typography.Text>
      ),
    },
    {
      title: "Permission Level",
      key: "permission",
      render: (record: Role) => {
        if (!record.permission) return "-";
        return (
          <div>
            <Badge
              count={record.permission.level}
              style={{
                backgroundColor:
                  record.permission.level === "ADMIN"
                    ? "#ff4d4f"
                    : record.permission.level === "MODERATOR"
                    ? "#faad14"
                    : record.permission.level === "MEMBER"
                    ? "#52c41a"
                    : "#d9d9d9",
                color: "white",
                fontSize: "10px",
              }}
            />
            <div className="text-xs text-gray-500 mt-1">
              {record.permission.description}
            </div>
          </div>
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      render: (record: Role) => (
        <Space>
          <Tooltip
            title={
              !canManageRoles()
                ? `Insufficient permissions (${permissionLevel} role)`
                : "Edit role"
            }
          >
            <Button
              type="text"
              size="small"
              icon={<Settings size={14} />}
              onClick={() => onEdit(record)}
              disabled={!canManageRoles()}
            >
              Edit
            </Button>
          </Tooltip>
          <Tooltip
            title={
              !canManageRoles()
                ? `Insufficient permissions (${permissionLevel} role)`
                : record.default
                ? "Cannot delete default role"
                : "Delete role"
            }
          >
            <Button
              type="text"
              size="small"
              icon={<Trash size={14} />}
              onClick={() => onDelete(record)}
              disabled={!canManageRoles() || record.default}
              danger
            >
              Delete
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={dataSource}
      rowKey="id"
      pagination={false}
      className="mt-4"
    />
  );
};

const RolesPage = () => {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [customFieldStates, setCustomFieldStates] = useState<
    Record<string, { view: boolean; edit: boolean }>
  >({});
  const [boardStates, setBoardStates] = useState<Record<string, boolean>>({});
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // Get permissions
  const { canManageRoles, permissionLevel } = usePermissions();

  // Fetch roles data
  const {
    data: rolesData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["roles", workspaceId],
    queryFn: async () => {
      const response = await api.get(`/roles`);
      return response.data;
    },
  });

  // Fetch custom fields and boards for create modal
  const { data: createData, isLoading: isLoadingCreateData } = useQuery({
    queryKey: ["create-role-data"],
    queryFn: async () => {
      const [customFieldsResponse, boardsResponse] = await Promise.all([
        api.get(`/custom-field`),
        api.get(`/board`),
      ]);

      const data = {
        customFields: customFieldsResponse.data?.data || [],
        boards: boardsResponse.data?.data || [],
      };

      console.log("Create data loaded:", data);
      console.log("Sample custom field ID:", data.customFields[0]?.id);
      console.log(
        "Sample custom field ID type:",
        typeof data.customFields[0]?.id
      );
      return data;
    },
    enabled: isCreating && isModalVisible,
  });

  // Fetch role permissions when editing
  const {
    data: rolePermissions,
    isLoading: isLoadingPermissions,
    refetch: refetchPermissions,
  } = useQuery({
    queryKey: ["role-permissions", editingRole?.id],
    queryFn: async () => {
      if (!editingRole) return null;
      const response = await api.get(`/roles/${editingRole.id}/permissions`);
      return response.data;
    },
    enabled: !!editingRole && !isCreating,
  });

  // Create role mutation
  const createRoleMutation = useMutation({
    mutationFn: async (roleData: any) => {
      const response = await api.post(`/roles`, roleData);
      return response.data;
    },
    onSuccess: (data) => {
      // Destroy the loading message
      message.destroy("createRole");

      message.success({
        content: "Role created successfully!",
        duration: 3,
        style: { marginTop: "20px" },
      });
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      setIsModalVisible(false);
      setEditingRole(null);
      setIsCreating(false);
      form.resetFields();
      // Reset local states
      setCustomFieldStates({});
      setBoardStates({});
    },
    onError: (error: any) => {
      // Destroy the loading message
      message.destroy("createRole");

      const errorMessage =
        error.response?.data?.message ||
        "Failed to create role. Please try again.";
      message.error({
        content: errorMessage,
        duration: 5,
        style: { marginTop: "20px" },
      });
      console.error("Error creating role:", error);
    },
  });

  // Update role permissions mutation
  const updatePermissionsMutation = useMutation({
    mutationFn: async (permissions: any) => {
      if (!editingRole) throw new Error("No role selected");
      const response = await api.put(
        `/roles/${editingRole.id}/permissions`,
        permissions
      );
      return response.data;
    },
    onSuccess: (data) => {
      message.success({
        content: "Role permissions updated successfully!",
        duration: 3,
        style: { marginTop: "20px" },
      });
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      setIsModalVisible(false);
      setEditingRole(null);
      setIsCreating(false);
    },
    onError: (error: any) => {
      const errorMessage =
        error.response?.data?.message ||
        "Failed to update role permissions. Please try again.";
      message.error({
        content: errorMessage,
        duration: 5,
        style: { marginTop: "20px" },
      });
      console.error("Error updating permissions:", error);
    },
  });

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setIsCreating(false);
    form.setFieldsValue({
      name: role.name,
      description: role.description,
      permissionLevel: role.permission?.level || "MEMBER",
    });
    setIsModalVisible(true);
  };

  const handleDelete = (role: Role) => {
    Modal.confirm({
      title: "Delete Role",
      content: (
        <div
          style={{
            padding: "20px 0 16px 0",
            fontSize: "14px",
            lineHeight: "1.5",
          }}
        >
          Are you sure you want to delete the role "{role.name}"? This action
          cannot be undone.
        </div>
      ),
      styles: {
        body: {
          padding: "1rem",
        },
      },
      okText: "Delete",
      okType: "danger",
      cancelText: "Cancel",
      width: 450,
      centered: true,
      onOk: async () => {
        try {
          await api.delete(`/roles/${role.id}`);
          message.success("Role deleted successfully");
          // Refetch the roles list with correct query key including workspaceId

          queryClient.invalidateQueries({ queryKey: ["roles"] });
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.message || "Failed to delete role";
          message.error(errorMessage);
          console.error("Error deleting role:", error);
        }
      },
    });
  };

  const handleCreate = () => {
    setEditingRole(null);
    setIsCreating(true);
    form.resetFields();
    // Reset local states
    setCustomFieldStates({});
    setBoardStates({});
    // Set default permission level to MEMBER
    form.setFieldsValue({
      permissionLevel: "MEMBER",
      customFields: {},
      boards: {},
    });
    console.log("Form values after setFieldsValue:", form.getFieldsValue());
    console.log(
      "Form field permissionLevel:",
      form.getFieldValue("permissionLevel")
    );
    setIsModalVisible(true);
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      console.log("Form values:", values); // Debug log
      console.log("Permission level from form:", values.permissionLevel); // Debug log
      console.log("Form validation passed, all fields:", Object.keys(values)); // Debug log

      if (isCreating) {
        // Get selected custom fields and boards from local state
        const selectedCustomFields = customFieldStates;
        const selectedBoards = boardStates;

        console.log(
          "Creating role with permission level:",
          values.permissionLevel
        ); // Debug log
        console.log("Selected custom fields:", selectedCustomFields); // Debug log
        console.log("Selected boards:", selectedBoards); // Debug log

        // Create new role
        const mutationData = {
          name: values.name,
          description: values.description,
          permissionLevel: values.permissionLevel,
          customFields: selectedCustomFields,
          boards: selectedBoards,
        };
        console.log("Mutation data being sent:", mutationData);

        // Show loading message
        message.loading({
          content: "Creating role...",
          duration: 0,
          key: "createRole",
          style: { marginTop: "20px" },
        });

        createRoleMutation.mutate(mutationData);
      } else {
        // Update existing role
        message.success("Role updated successfully");
        setIsModalVisible(false);
        setEditingRole(null);
        form.resetFields();
      }
    } catch (error) {
      console.error("Validation failed:", error);
    }
  };

  const handleModalCancel = () => {
    // Check if there are any unsaved changes
    const hasChanges =
      Object.keys(customFieldStates).length > 0 ||
      Object.keys(boardStates).length > 0;

    if (hasChanges && isCreating) {
      Modal.confirm({
        title: "Discard Changes?",
        content:
          "You have unsaved changes. Are you sure you want to discard them?",
        okText: "Discard",
        cancelText: "Keep Editing",
        onOk: () => {
          setIsModalVisible(false);
          setEditingRole(null);
          setIsCreating(false);
          form.resetFields();
          setCustomFieldStates({});
          setBoardStates({});
        },
      });
    } else {
      setIsModalVisible(false);
      setEditingRole(null);
      setIsCreating(false);
      form.resetFields();
      setCustomFieldStates({});
      setBoardStates({});
    }
  };

  const handleCustomFieldPermissionChange = (
    fieldId: string,
    permission: "view" | "edit",
    checked: boolean
  ) => {
    if (!rolePermissions?.data?.customFields) return;

    const updatedFields = rolePermissions?.data?.customFields.map(
      (field: CustomField) => {
        if (field.id === fieldId) {
          const updatedField = { ...field };

          if (permission === "view") {
            updatedField.isViewAllowed = checked;
            if (checked) {
              // If enabling view, add role to canView array
              updatedField.canView = [...field.canView, editingRole!.id];
            } else {
              // If disabling view, remove role from canView array
              updatedField.canView = field.canView.filter(
                (id: string) => id !== editingRole!.id
              );
              // If disabling view, also disable edit
              updatedField.isEditAllowed = false;
              updatedField.canEdit = field.canEdit.filter(
                (id: string) => id !== editingRole!.id
              );
            }
          } else {
            // Handle edit permission
            updatedField.isEditAllowed = checked;
            if (checked) {
              // If enabling edit, add role to canEdit array and also enable view
              updatedField.canEdit = [...field.canEdit, editingRole!.id];
              updatedField.isViewAllowed = true;
              updatedField.canView = [...field.canView, editingRole!.id];
            } else {
              // If disabling edit, remove role from canEdit array
              updatedField.canEdit = field.canEdit.filter(
                (id: string) => id !== editingRole!.id
              );
            }
          }

          // Update the isViewAllowed and isEditAllowed flags based on the arrays
          updatedField.isViewAllowed = updatedField.canView.includes(
            editingRole!.id
          );
          updatedField.isEditAllowed = updatedField.canEdit.includes(
            editingRole!.id
          );

          return updatedField;
        }
        return field;
      }
    );

    // Update the query cache
    queryClient.setQueryData(["role-permissions", editingRole?.id], {
      ...rolePermissions,
      data: {
        ...rolePermissions.data,
        customFields: updatedFields,
      },
    });
  };

  const handleBoardAssignmentChange = (boardId: string, checked: boolean) => {
    if (!rolePermissions?.data?.boards) return;

    const updatedBoards = rolePermissions?.data?.boards.map((board: Board) => {
      if (board.id === boardId) {
        return { ...board, isAssigned: checked };
      }
      return board;
    });

    // Update the query cache
    queryClient.setQueryData(["role-permissions", editingRole?.id], {
      ...rolePermissions,
      data: {
        ...rolePermissions.data,
        boards: updatedBoards,
      },
    });
  };

  const handleSavePermissions = async () => {
    if (!rolePermissions?.data?.customFields || !rolePermissions?.data?.boards)
      return;

    const formValues = await form.validateFields();

    const permissions = {
      customFields: rolePermissions?.data?.customFields,
      boards: rolePermissions?.data?.boards,
      permissionLevel: formValues.permissionLevel,
    };

    updatePermissionsMutation.mutate(permissions);
  };

  if (error) {
    return (
      <div className="p-6">
        <Typography.Title level={4}>Error loading roles</Typography.Title>
        <Typography.Text type="danger">
          {error instanceof Error ? error.message : "An error occurred"}
        </Typography.Text>
      </div>
    );
  }

  // Debug logging
  console.log("Create data:", createData);
  console.log("Is loading create data:", isLoadingCreateData);
  console.log("Is creating:", isCreating);
  console.log("Is modal visible:", isModalVisible);

  // Check if user has access to this page
  if (!canManageRoles()) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-center">
          <Typography.Title level={3} type="secondary">
            Access Denied
          </Typography.Title>
          <Typography.Text type="secondary">
            You don't have permission to manage roles in this workspace.
          </Typography.Text>
          <br />
          <Typography.Text type="secondary" className="text-sm">
            Current permission level: {permissionLevel}
          </Typography.Text>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Typography.Title level={3} className="mb-2">
            Roles Management
          </Typography.Title>
          <Typography.Text type="secondary">
            Manage user roles and permissions for this workspace
          </Typography.Text>
        </div>
        <Tooltip
          title={
            !canManageRoles()
              ? `Insufficient permissions to create roles (${permissionLevel})`
              : "Create a new role"
          }
        >
          <Button
            type="primary"
            icon={<Shield size={16} />}
            onClick={handleCreate}
            disabled={!canManageRoles()}
          >
            Add New Role
          </Button>
        </Tooltip>
      </div>

      {isLoading ? (
        <SkeletonTable />
      ) : (
        <TableRoles
          dataSource={rolesData?.data || []}
          onEdit={handleEdit}
          onDelete={handleDelete}
          canManageRoles={canManageRoles}
          permissionLevel={permissionLevel || "OBSERVER"}
        />
      )}

      <Modal
        title={isCreating ? "Create New Role" : "Edit Role Permissions"}
        open={isModalVisible}
        onCancel={handleModalCancel}
        width={800}
        style={{ top: 20 }}
        styles={{
          body: {
            maxHeight: "calc(100vh - 200px)",
            overflow: "auto",
            padding: "24px",
          },
        }}
        footer={[
          <Button key="cancel" onClick={handleModalCancel}>
            Cancel
          </Button>,
          isCreating ? (
            <Button
              key="create"
              type="primary"
              onClick={handleModalOk}
              loading={createRoleMutation.isPending}
              disabled={createRoleMutation.isPending}
            >
              {createRoleMutation.isPending ? "Creating..." : "Create Role"}
            </Button>
          ) : (
            <Button
              key="save"
              type="primary"
              onClick={handleSavePermissions}
              loading={updatePermissionsMutation.isPending}
              disabled={updatePermissionsMutation.isPending}
            >
              {updatePermissionsMutation.isPending
                ? "Saving..."
                : "Save Changes"}
            </Button>
          ),
        ]}
      >
        {isCreating ? (
          // Create new role form
          <div className="space-y-6">
            <Card title="Role Information" size="small">
              <Form form={form} layout="vertical">
                <Form.Item
                  name="name"
                  label="Role Name"
                  rules={[
                    { required: true, message: "Please enter role name" },
                  ]}
                >
                  <Input placeholder="Enter role name" />
                </Form.Item>
                <Form.Item
                  name="description"
                  label="Description"
                  rules={[
                    { required: true, message: "Please enter description" },
                  ]}
                >
                  <Input.TextArea
                    placeholder="Enter role description"
                    rows={3}
                  />
                </Form.Item>
                <Form.Item
                  name="permissionLevel"
                  label="Permission Level"
                  rules={[
                    {
                      required: true,
                      message: "Please select permission level",
                    },
                  ]}
                >
                  <Select placeholder="Select permission level">
                    <Select.Option value="MEMBER">
                      Member - Can view and interact with boards
                    </Select.Option>
                    <Select.Option value="OBSERVER">
                      Observer - Can view boards but not modify
                    </Select.Option>
                    <Select.Option value="MODERATOR">
                      Moderator - Can manage board content and members
                    </Select.Option>
                    <Select.Option value="ADMIN">
                      Admin - Full control over the board
                    </Select.Option>
                  </Select>
                </Form.Item>
              </Form>
            </Card>

            {/* Custom Fields Selection */}
            <Card title="Custom Fields Access" size="small">
              {isLoadingCreateData ? (
                <div className="flex justify-center items-center py-8">
                  <Spin size="large" />
                </div>
              ) : createData?.customFields &&
                createData.customFields.length > 0 ? (
                <div className="overflow-y-auto">
                  <div className="grid grid-cols-3 gap-3">
                    {createData.customFields.map((field: any) => (
                      <div
                        key={field.id}
                        className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50"
                      >
                        <div className="mb-2">
                          <Typography.Text strong className="text-sm">
                            {field.name}
                          </Typography.Text>
                          <Typography.Text
                            type="secondary"
                            className="text-xs block mt-1"
                          >
                            {field.description}
                          </Typography.Text>
                        </div>
                        <div className="flex gap-2">
                          <Checkbox
                            checked={customFieldStates[field.id]?.view || false}
                            onChange={(e) => {
                              console.log(
                                "Checkbox clicked:",
                                field.id,
                                "view",
                                e.target.checked
                              );
                              console.log("Original field ID:", field.id);
                              console.log("Field ID type:", typeof field.id);
                              const newStates = {
                                ...customFieldStates,
                                [field.id]: {
                                  ...customFieldStates[field.id],
                                  view: e.target.checked,
                                  edit: e.target.checked
                                    ? customFieldStates[field.id]?.edit || false
                                    : false,
                                },
                              };
                              setCustomFieldStates(newStates);
                              form.setFieldsValue({ customFields: newStates });
                              console.log("Updated custom fields:", newStates);
                            }}
                          >
                            <Eye size={12} className="inline mr-1" />
                            View
                          </Checkbox>
                          <Checkbox
                            checked={customFieldStates[field.id]?.edit || false}
                            onChange={(e) => {
                              const newStates = {
                                ...customFieldStates,
                                [field.id]: {
                                  ...customFieldStates[field.id],
                                  edit: e.target.checked,
                                  view: e.target.checked
                                    ? true
                                    : customFieldStates[field.id]?.view ||
                                      false,
                                },
                              };
                              setCustomFieldStates(newStates);
                              form.setFieldsValue({ customFields: newStates });
                              console.log("Updated custom fields:", newStates);
                            }}
                          >
                            <Edit size={12} className="inline mr-1" />
                            Edit
                          </Checkbox>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Typography.Text type="secondary">
                    No custom fields available
                  </Typography.Text>
                </div>
              )}
            </Card>

            {/* Board Access Selection */}
            <Card title="Board Access" size="small">
              {isLoadingCreateData ? (
                <div className="flex justify-center items-center py-8">
                  <Spin size="large" />
                </div>
              ) : createData?.boards && createData.boards.length > 0 ? (
                <div className="overflow-y-auto">
                  <div className="grid grid-cols-2 gap-3">
                    {createData.boards.map((board: any) => (
                      <div
                        key={board.id}
                        className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50"
                      >
                        <div className="mb-2">
                          <Typography.Text strong className="text-sm">
                            {board.name}
                          </Typography.Text>
                          <Typography.Text
                            type="secondary"
                            className="text-xs block mt-1"
                          >
                            {board.description}
                          </Typography.Text>
                        </div>
                        <Checkbox
                          checked={boardStates[board.id] || false}
                          onChange={(e) => {
                            console.log(
                              "Board checkbox clicked:",
                              board.id,
                              e.target.checked
                            );
                            const newBoards = {
                              ...boardStates,
                              [board.id]: e.target.checked,
                            };
                            setBoardStates(newBoards);
                            form.setFieldsValue({ boards: newBoards });
                            console.log("Updated boards:", newBoards);
                          }}
                        >
                          Access
                        </Checkbox>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Typography.Text type="secondary">
                    No boards available
                  </Typography.Text>
                </div>
              )}
            </Card>
          </div>
        ) : isLoadingPermissions ? (
          <div className="flex justify-center items-center py-8">
            <Spin size="large" />
          </div>
        ) : rolePermissions?.data ? (
          <div className="space-y-6">
            {/* Basic Role Info */}
            <Card title="Role Information" size="small">
              <Form form={form} layout="vertical">
                <Form.Item
                  name="name"
                  label="Role Name"
                  rules={[
                    { required: true, message: "Please enter role name" },
                  ]}
                >
                  <Input placeholder="Enter role name" />
                </Form.Item>
                <Form.Item
                  name="description"
                  label="Description"
                  rules={[
                    { required: true, message: "Please enter description" },
                  ]}
                >
                  <Input.TextArea
                    placeholder="Enter role description"
                    rows={3}
                  />
                </Form.Item>
                <Form.Item
                  name="permissionLevel"
                  label="Permission Level"
                  rules={[
                    {
                      required: true,
                      message: "Please select permission level",
                    },
                  ]}
                >
                  <Select placeholder="Select permission level">
                    <Select.Option value="MEMBER">
                      Member - Can view and interact with boards
                    </Select.Option>
                    <Select.Option value="OBSERVER">
                      Observer - Can view boards but not modify
                    </Select.Option>
                    <Select.Option value="MODERATOR">
                      Moderator - Can manage board content and members
                    </Select.Option>
                    <Select.Option value="ADMIN">
                      Admin - Full control over the board
                    </Select.Option>
                  </Select>
                </Form.Item>
              </Form>
            </Card>

            {/* Custom Fields Permissions */}
            <Card title="Custom Fields Permissions" size="small">
              <div className="overflow-y-auto">
                {rolePermissions?.data?.customFields &&
                rolePermissions?.data?.customFields.length > 0 ? (
                  <div className="grid grid-cols-3 gap-3">
                    {rolePermissions?.data?.customFields.map(
                      (field: CustomField) => (
                        <div
                          key={field.id}
                          className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50"
                        >
                          <div className="mb-2">
                            <Typography.Text strong className="text-sm">
                              {field.name}
                            </Typography.Text>
                          </div>
                          <div className="flex gap-2">
                            <Checkbox
                              checked={field.isViewAllowed}
                              onChange={(e) =>
                                handleCustomFieldPermissionChange(
                                  field.id,
                                  "view",
                                  e.target.checked
                                )
                              }
                            >
                              <Eye size={12} className="inline mr-1" />
                              View
                            </Checkbox>
                            <Checkbox
                              checked={field.isEditAllowed}
                              onChange={(e) =>
                                handleCustomFieldPermissionChange(
                                  field.id,
                                  "edit",
                                  e.target.checked
                                )
                              }
                            >
                              <Edit size={12} className="inline mr-1" />
                              Edit
                            </Checkbox>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Typography.Text type="secondary">
                      No custom fields available
                    </Typography.Text>
                  </div>
                )}
              </div>
            </Card>

            {/* Board Assignments */}
            <Card title="Board Access" size="small">
              <div className="overflow-y-auto">
                {rolePermissions?.data?.boards &&
                rolePermissions?.data?.boards.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {rolePermissions?.data?.boards.map((board: Board) => (
                      <div
                        key={board.id}
                        className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50"
                      >
                        <div className="mb-2">
                          <Typography.Text strong className="text-sm">
                            {board.name}
                          </Typography.Text>
                          <Typography.Text
                            type="secondary"
                            className="text-xs block mt-1"
                          >
                            {board.description}
                          </Typography.Text>
                        </div>
                        <Checkbox
                          checked={board.isAssigned}
                          onChange={(e) =>
                            handleBoardAssignmentChange(
                              board.id,
                              e.target.checked
                            )
                          }
                        >
                          Access
                        </Checkbox>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Typography.Text type="secondary">
                      No boards available
                    </Typography.Text>
                  </div>
                )}
              </div>
            </Card>
          </div>
        ) : (
          <div className="text-center py-8">
            <Typography.Text type="secondary">
              No permissions data available
            </Typography.Text>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default RolesPage;
