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
} from "antd";
import { useEffect, useState } from "react";
import AddUserModal from "./add_user_modal";
import { accountList, userDetails } from "@api/account";
import { useParams } from "next/navigation";
import { Account } from "@dto/account";
import { Edit, Plus, Settings, Trash, Trash2, Users } from "lucide-react";
import { useAllRoles } from "../../../../hooks/board";
import { useUpdateAnyAccount, usePermissions } from "@hooks/account";

type MenuItem = Required<MenuProps>["items"][number];

const { Option } = Select;

const TableMembers: React.FC<{
  dataSource?: Account[];
  onEdit: (user: Account) => void;
}> = ({ dataSource = [], onEdit }) => {
  const { canManageUsers, isSuperAdmin } = usePermissions();
  const columns = [
    {
      title: "User",
      dataIndex: "name",
      key: "name",
      render: (_: any, record: Account) => {
        return (
          <div className="flex items-center gap-4">
            <Avatar
              size="small"
              src={
                record?.avatar ||
                `https://ui-avatars.com/api/?name=${record?.username}&background=random`
              }
            />
            <div>
              <Typography.Text strong>
                {(record as any).fullname || record.name || record.username}
              </Typography.Text>
              <div className="flex flex-col">
                {record.role?.name && (
                  <Typography.Text
                    type="secondary"
                    style={{ fontSize: "12px" }}
                  >
                    {record.role.name}
                  </Typography.Text>
                )}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      render: (_: any, record: Account) => record?.email || "-",
    },
    {
      title: "Action",
      key: "action",
      render: (_: any, record: Account) => {
        return (
          <Space size="middle">
            <Tooltip
              title={
                !canManageUsers()
                  ? "Insufficient permissions to edit users (requires super admin)"
                  : "Edit user"
              }
            >
              <Button
                type="text"
                icon={<Settings size={16} />}
                onClick={() => onEdit(record)}
                disabled={!canManageUsers()}
              />
            </Tooltip>
            <Tooltip
              title={
                !canManageUsers()
                  ? "Insufficient permissions to delete users (requires super admin)"
                  : "Delete user"
              }
            >
              <Button 
                type="text" 
                danger 
                icon={<Trash size={16} />} 
                disabled={!canManageUsers()}
              />
            </Tooltip>
          </Space>
        );
      },
    },
  ];

  return (
    <Table
      dataSource={dataSource}
      columns={columns}
      style={{ width: "100%" }}
      rowKey={(record) => record.id}
    />
  );
};

const Members: React.FC = () => {
  const { workspaceId, boardId } = useParams();
  const resolvedWorkspaceId = Array.isArray(workspaceId)
    ? workspaceId[0]
    : (workspaceId as string);
  
  // Get permissions
  const { canManageUsers, isSuperAdmin } = usePermissions();
  
  // All hooks must be declared before any conditional returns
  const { data: rolesResponse, isLoading: rolesLoading } = useAllRoles(
    resolvedWorkspaceId || ""
  );
  const allRoles = rolesResponse?.data || [];
  const [isFetching, setIsFetching] = useState<boolean>(true);
  const [data, setData] = useState<Account[] | []>([]);
  const [activeMenu, setActiveMenu] = useState<string>(
    "menu-workspace-members"
  );
  const [addUserModalVisible, setAddUserModalVisible] = useState(false);
  const [editUserModalVisible, setEditUserModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Account | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const updateAccountMutation = useUpdateAnyAccount();
  const [editForm] = Form.useForm();

  const memberCount = data.length;

  const menuItems: MenuItem[] = [
    {
      key: "menu-workspace-members",
      label: `Members (${memberCount})`,
    },
  ];

  const handleMenuClick: MenuProps["onClick"] = (e) => {
    setActiveMenu(e.key);
  };

  const openAddUserModal = () => {
    setAddUserModalVisible(true);
  };

  const closeAddUserModal = () => {
    setAddUserModalVisible(false);
  };

  const openEditUserModal = async (user: Account) => {
    setEditUserModalVisible(true);
    setDetailLoading(true);
    try {
      const res = await userDetails(user.id);
      const detail = res.data;
      const finalData = detail ?? user;
      setSelectedUser(finalData);
      editForm.setFieldsValue({
        username: finalData.username,
        email: finalData.email,
        phone: finalData.phone,
        role: finalData.role?.id,
      });
    } catch (err) {
      message.error("Failed to fetch user detail");
      setSelectedUser(user);
      editForm.setFieldsValue({
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role?.id,
      });
    } finally {
      setDetailLoading(false);
    }
  };

  const closeEditUserModal = () => {
    setEditUserModalVisible(false);
    setSelectedUser(null);
  };

  const handleSaveUser = async () => {
    try {
      const values = await editForm.validateFields();
      if (!selectedUser) return;
      await updateAccountMutation.mutateAsync({
        userId: selectedUser.id,
        updates: {
          username: values.username || undefined,
          email: values.email || undefined,
          phone: values.phone || undefined,
          roleIds: values.role ? [values.role] : undefined,
        },
      });
      message.success("User updated successfully");
      closeEditUserModal();
      setIsFetching(true); // refresh list
    } catch (error) {
      message.error("Failed to update user");
    }
  };

  useEffect(() => {
    const fecthData = async () => {
      const wsId = Array.isArray(workspaceId) ? workspaceId[0] : workspaceId;
      const bId = Array.isArray(boardId) ? boardId[0] : boardId;
      const result = await accountList(wsId, bId);
      console.log(result);

      if (result && result.data) {
        setData(result.data || []);
      }
    };

    if (isFetching) {
      setTimeout(() => {
        fecthData();
        setIsFetching(false);
      }, 500);
    }
  }, [isFetching]);

  // Check if user has access to this page
  if (!canManageUsers()) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-center">
          <Typography.Title level={3} type="secondary">
            Access Denied
          </Typography.Title>
          <Typography.Text type="secondary">
            You don't have permission to manage members in this workspace.
          </Typography.Text>
          <br />
          <Typography.Text type="secondary" className="text-sm">
            Access level: {isSuperAdmin() ? "Super Admin" : "Regular User"}
          </Typography.Text>
        </div>
      </div>
    );
  }

  return (
    <div className="page scrollable-page">
      <div
        className="flex justify-between items-center"
        style={{ marginBottom: "10px" }}
      >
        <div className="section-title flex items-center gap-4">
          <Typography.Title level={4} className="m-0">
            Collaborators
          </Typography.Title>
          {/* <Badge count={memberCount}></Badge> */}
        </div>
        <Tooltip
          title={
            !canManageUsers()
              ? "Insufficient permissions to add users (requires super admin)"
              : "Add a new user to the workspace"
          }
        >
          <Button 
            size="small" 
            onClick={openAddUserModal}
            disabled={!canManageUsers()}
          >
            <i className="fi fi-sr-user-add"></i> Add User
          </Button>
        </Tooltip>
      </div>

      <div className="flex">
        <Menu
          style={{ width: 256 }}
          defaultSelectedKeys={["menu-workspace-members"]}
          mode="inline"
          items={menuItems}
          onClick={handleMenuClick}
        />
        <div style={{ width: "100%" }}>
          {!isFetching && activeMenu === "menu-workspace-members" && (
            <TableMembers dataSource={data} onEdit={openEditUserModal} />
          )}

          {!isFetching && activeMenu === "menu-guest" && (
            <TableMembers dataSource={data} onEdit={openEditUserModal} />
          )}

          {!isFetching && activeMenu === "menu-join-request" && (
            <TableMembers dataSource={data} onEdit={openEditUserModal} />
          )}

          {/* skeleton */}
          {isFetching && <SkeletonTable />}
        </div>
      </div>

      <AddUserModal
        visible={addUserModalVisible}
        onCancel={closeAddUserModal}
        onSuccess={() => {
          setIsFetching(true);
        }}
      />

      <Modal
        title="Edit User"
        open={editUserModalVisible}
        onCancel={closeEditUserModal}
        footer={null}
        destroyOnClose
        bodyStyle={{ padding: 24 }}
        style={{ top: 40 }}
      >
        {detailLoading ? (
          <div
            className="flex justify-center items-center"
            style={{ minHeight: 120 }}
          >
            <Spin />
          </div>
        ) : selectedUser ? (
          <Form
            form={editForm}
            layout="vertical"
            initialValues={{
              username: selectedUser.username,
              email: selectedUser.email,
              phone: selectedUser.phone,
              role: selectedUser.role?.id,
            }}
          >
            <Form.Item label="Username" name="username">
              <Input />
            </Form.Item>
            <Form.Item label="Email" name="email">
              <Input />
            </Form.Item>
            <Form.Item label="Phone" name="phone">
              <Input />
            </Form.Item>
            <Form.Item label="Role" name="role">
              <Select loading={rolesLoading} placeholder="Select role">
                {allRoles.map((role: any) => (
                  <Option key={role.id} value={role.id}>
                    {role.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item className="text-right">
              <Button onClick={closeEditUserModal} style={{ marginRight: 8 }}>
                Close
              </Button>
              <Button
                type="primary"
                loading={updateAccountMutation.isPending}
                onClick={handleSaveUser}
              >
                Save
              </Button>
            </Form.Item>
          </Form>
        ) : null}
      </Modal>
    </div>
  );
};

export default Members;
