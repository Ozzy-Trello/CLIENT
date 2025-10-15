"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import {
  Button,
  Card,
  Col,
  Row,
  Table,
  Typography,
  Space,
  Tag,
  Tooltip,
  message,
  Popconfirm,
  Badge,
  Input,
} from "antd";
import { Edit, Trash2, Plus, Eye, EyeOff, Search } from "lucide-react";
import { useCustomFields } from "@hooks/custom_field";
import { CustomField, EnumCustomFieldType } from "@myTypes/custom-field";
import { useSelector } from "react-redux";
import { selectCurrentWorkspace } from "@store/workspace_slice";
import { useCurrentAccount } from "@hooks/account";
import { useRoles } from "@hooks/useRoles";
import { useBoards } from "@hooks/board";
import { LookupCache } from "@utils/lookup-cache";
import CustomFieldModal from "../../../../components/custom-field-modal";
import React from "react";

const { Title, Text } = Typography;

const CustomFieldsPage = () => {
  const { workspaceId } = useParams();
  const currentWorkspace = useSelector(selectCurrentWorkspace);
  const { data: currentAccountData } = useCurrentAccount();
  const currentUser = currentAccountData?.data;
  const userRole = currentUser?.role?.name || "";
  const isSuperAdmin = userRole === "Super Admin";

  const [selectedField, setSelectedField] = useState<CustomField | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [pageSize, setPageSize] = useState(10);

  const { customFields, isLoading, deleteCustomField, isDeleting } =
    useCustomFields(
      Array.isArray(workspaceId) ? workspaceId[0] : workspaceId || ""
    );

  const { roles } = useRoles(
    Array.isArray(workspaceId) ? workspaceId[0] : workspaceId || ""
  );
  
  const { boards } = useBoards(
    Array.isArray(workspaceId) ? workspaceId[0] : workspaceId || ""
  );

  const getFieldTypeLabel = (type: string) => {
    switch (type) {
      case EnumCustomFieldType.Text:
        return "Text";
      case EnumCustomFieldType.Number:
        return "Number";
      case EnumCustomFieldType.Date:
        return "Date";
      case EnumCustomFieldType.Checkbox:
        return "Checkbox";
      case EnumCustomFieldType.Dropdown:
        return "Dropdown";
      default:
        return type;
    }
  };

  // Filter custom fields based on search term
  const filteredCustomFields = customFields.filter((field) => {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();
    return (
      field.name?.toLowerCase().includes(searchLower) ||
      field.description?.toLowerCase().includes(searchLower) ||
      getFieldTypeLabel(field.type || "")
        .toLowerCase()
        .includes(searchLower)
    );
  });

  // Cache role names for display
  React.useEffect(() => {
    if (roles.length > 0) {
      LookupCache.rememberMany(
        "role",
        roles.map((role) => ({ id: role.id, name: role.name }))
      );
    }
  }, [roles]);

  // Cache board names for display
  React.useEffect(() => {
    if (boards.length > 0) {
      LookupCache.rememberMany(
        "board",
        boards
          .filter((board) => board.name !== undefined)
          .map((board) => ({ id: board.id, name: board.name as string }))
      );
    }
  }, [boards]);

  // Redirect if not super admin
  if (!isSuperAdmin) {
    return (
      <div className="page scrollable-page">
        <div className="section-workspace">
          <Title level={3} className="m-0">
            Access Denied
          </Title>
          <Text>You don't have permission to access this page.</Text>
        </div>
      </div>
    );
  }

  const handleEdit = (field: CustomField) => {
    setSelectedField(field);
    setIsModalOpen(true);
  };

  const handleDelete = async (fieldId: string) => {
    try {
      await deleteCustomField(fieldId);
      message.success("Custom field deleted successfully");
    } catch (error) {
      message.error("Failed to delete custom field");
    }
  };

  const handleCreate = () => {
    setSelectedField(null);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedField(null);
  };

  const getVisibilityLabel = (field: CustomField) => {
    const isPrivate = field.canView && field.canView.length > 0;
    return isPrivate ? "Private" : "Public";
  };

  const getVisibilityColor = (field: CustomField) => {
    const isPrivate = field.canView && field.canView.length > 0;
    return isPrivate ? "orange" : "green";
  };

  const getCanViewDisplay = (field: CustomField) => {
    if (!field.canView || field.canView.length === 0) {
      return <Text type="secondary">All roles</Text>;
    }
    return (
      <Space wrap>
        {field.canView.map((roleId) => {
          const roleName = LookupCache.label("role", roleId) || roleId;
          return (
            <Tag key={roleId} color="blue">
              {roleName}
            </Tag>
          );
        })}
      </Space>
    );
  };

  const getCanEditDisplay = (field: CustomField) => {
    // Special case logic:
    // - If canView is empty and canEdit is empty: everyone can edit
    // - If canView has IDs and canEdit is empty: only Super Admin can edit
    // - If canEdit has IDs: only those specific roles can edit

    if (!field.canEdit || field.canEdit.length === 0) {
      if (!field.canView || field.canView.length === 0) {
        return <Text type="secondary">All roles</Text>;
      } else {
        return <Text type="secondary">Super Admin only</Text>;
      }
    }

    return (
      <Space wrap>
        {field.canEdit.map((roleId) => {
          const roleName = LookupCache.label("role", roleId) || roleId;
          return (
            <Tag key={roleId} color="green">
              {roleName}
            </Tag>
          );
        })}
      </Space>
    );
  };

  const getBoardViewDisplay = (field: CustomField) => {
    if (!field.canViewBoards || field.canViewBoards.length === 0) {
      return <Text type="secondary">All boards</Text>;
    }
    return (
      <Space wrap>
        {field.canViewBoards.map((boardId) => {
          const boardName = LookupCache.label("board", boardId) || boardId;
          return (
            <Tag key={boardId} color="purple">
              {boardName}
            </Tag>
          );
        })}
      </Space>
    );
  };

  const getBoardEditDisplay = (field: CustomField) => {
    if (!field.canEditBoards || field.canEditBoards.length === 0) {
      if (!field.canViewBoards || field.canViewBoards.length === 0) {
        return <Text type="secondary">All boards</Text>;
      } else {
        return <Text type="secondary">Same as view</Text>;
      }
    }
    return (
      <Space wrap>
        {field.canEditBoards.map((boardId) => {
          const boardName = LookupCache.label("board", boardId) || boardId;
          return (
            <Tag key={boardId} color="cyan">
              {boardName}
            </Tag>
          );
        })}
      </Space>
    );
  };

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      render: (text: string) => <Text>{text || "-"}</Text>,
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      render: (type: string) => (
        <Tag color="blue">{getFieldTypeLabel(type)}</Tag>
      ),
    },
    {
      title: "Visibility",
      key: "visibility",
      render: (field: CustomField) => (
        <Tag color={getVisibilityColor(field)}>{getVisibilityLabel(field)}</Tag>
      ),
    },
    {
      title: "Can View",
      key: "canView",
      render: (field: CustomField) => getCanViewDisplay(field),
    },
    {
      title: "Can Edit",
      key: "canEdit",
      render: (field: CustomField) => getCanEditDisplay(field),
    },
    {
      title: "Board View",
      key: "canViewBoards",
      render: (field: CustomField) => getBoardViewDisplay(field),
    },
    {
      title: "Board Edit",
      key: "canEditBoards",
      render: (field: CustomField) => getBoardEditDisplay(field),
    },
    {
      title: "Actions",
      key: "actions",
      render: (field: CustomField) => (
        <Space>
          <Tooltip title="Edit">
            <Button
              type="text"
              size="small"
              icon={<Edit size={16} />}
              onClick={() => handleEdit(field)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete custom field"
            description="Are you sure you want to delete this custom field? This action cannot be undone."
            onConfirm={() => handleDelete(field.id)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete">
              <Button
                type="text"
                size="small"
                danger
                icon={<Trash2 size={16} />}
                loading={isDeleting}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="page scrollable-page">
      <div className="section-workspace">
        <div className="flex justify-between items-center mb-4">
          <Title level={3} className="m-0">
            Custom Fields
          </Title>
          <div className="flex items-center space-x-4">
            <Input
              placeholder="Search custom fields..."
              prefix={<Search size={16} />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: 300 }}
              allowClear
            />
            <Button
              type="primary"
              icon={<Plus size={16} />}
              onClick={handleCreate}
            >
              Add Custom Field
            </Button>
          </div>
        </div>
      </div>

      <div className="section-card">
        <Card>
          <Table
            columns={columns}
            dataSource={filteredCustomFields}
            rowKey="id"
            loading={isLoading}
            pagination={{
              pageSize,
              onChange: (page, size) => {
                setPageSize(size);
              },
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} of ${total} items`,
            }}
          />
        </Card>
      </div>

      {isModalOpen && (
        <CustomFieldModal
          open={isModalOpen}
          onClose={handleModalClose}
          field={selectedField}
          workspaceId={
            Array.isArray(workspaceId) ? workspaceId[0] : workspaceId
          }
        />
      )}
    </div>
  );
};

export default CustomFieldsPage;
