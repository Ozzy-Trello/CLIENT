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
import { ChangeEvent, useEffect, useState } from "react";
import AddUserModal from "./add_user_modal";
import { accountList, userDetails } from "@api/account";
import { useParams } from "next/navigation";
import { Account } from "@dto/account";
import { Edit, Plus, Settings, Trash, Trash2, Users } from "lucide-react";
import { useAllRoles } from "../../../../hooks/board";
import {
  useUpdateAnyAccount,
  usePermissions,
  useDeleteAccount,
  useCurrentAccount,
} from "@hooks/account";
import UploadModal from "@components/modal-upload/modal-upload";
import { createAccount } from "@api/account";

type MenuItem = Required<MenuProps>["items"][number];

const { Option } = Select;

const TableMembers: React.FC<{
  dataSource?: Account[];
  onEdit: (user: Account) => void;
  onDelete: (user: Account) => void;
  pagination?: any;
  onPaginationChange?: (page: number, pageSize: number) => void;
}> = ({
  dataSource = [],
  onEdit,
  onDelete,
  pagination,
  onPaginationChange,
}) => {
  const { canManageUsers, isSuperAdmin } = usePermissions();
  const { data: currentAccountData } = useCurrentAccount();
  const currentUser = currentAccountData?.data;
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
            {/* Hide delete button for current user */}
            {currentUser?.id !== record.id && (
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
                  onClick={() => onDelete(record)}
                />
              </Tooltip>
            )}
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
      pagination={pagination}
      onChange={(paginationConfig) => {
        if (onPaginationChange) {
          onPaginationChange(
            paginationConfig.current || 1,
            paginationConfig.pageSize || 10
          );
        }
      }}
    />
  );
};

const Members: React.FC = () => {
  const { workspaceId, boardId } = useParams();
  const resolvedWorkspaceId = Array.isArray(workspaceId)
    ? workspaceId[0]
    : (workspaceId as string);
  const resolvedBoardId = Array.isArray(boardId)
    ? boardId[0]
    : (boardId as string | undefined);

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
  const deleteAccountMutation = useDeleteAccount();
  const [editForm] = Form.useForm();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const memberCount = data.length;
  const selectedRoleIds = roleFilter ? [roleFilter] : [];

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

  const handleMembersParseComplete = async (_file: File, rows: any[]) => {
    if (!Array.isArray(rows) || rows.length === 0) return;
    setIsImporting(true);
    try {
      const created: string[] = [];
      for (const row of rows) {
        const keys = Object.keys(row || {}).reduce((acc: any, k: string) => {
          acc[k.toLowerCase().trim()] = row[k];
          return acc;
        }, {});
        const email = keys["email"] || keys["e-mail"] || "";
        const username = keys["username"] || keys["user"] || keys["name"] || "";
        const phone = keys["phone"] || keys["no hp"] || keys["hp"] || "";
        const fullname =
          keys["fullname"] || keys["full name"] || keys["name"] || "";
        if (!email && !username) continue;
        const payload: any = {
          email: email || undefined,
          username: username || undefined,
          phone: phone || undefined,
          name: fullname || undefined,
          password: "12345",
        };
        try {
          const res = await createAccount(payload);
          if (res?.data?.id) {
            created.push(res.data.id);
          }
        } catch (_err) {
          continue;
        }
      }
      if (created.length > 0) {
        message.success(`Imported ${created.length} member(s)`);
        setIsFetching(true);
      } else {
        message.info("No new members created");
      }
      setImportModalOpen(false);
    } finally {
      setIsImporting(false);
    }
  };

  const handleSaveUser = async () => {
    try {
      const values = await editForm.validateFields();
      if (!selectedUser) return;

      const updates: any = {
        username: values.username || undefined,
        email: values.email || undefined,
        phone: values.phone || undefined,
        roleIds: values.role ? [values.role] : undefined,
      };

      // Only include password if it's provided
      if (values.password && values.password.trim() !== "") {
        updates.password = values.password;
      }

      await updateAccountMutation.mutateAsync({
        userId: selectedUser.id,
        updates,
      });
      message.success("User updated successfully");
      closeEditUserModal();
      setIsFetching(true); // refresh list
    } catch (error: any) {
      message.error(error.response?.data?.message || "Unknown error occurred");
    }
  };

  const handleDeleteUser = (user: Account) => {
    Modal.confirm({
      title: "Delete User",
      content: `Are you sure you want to delete user "${user.username}"? This action cannot be undone.`,
      okText: "Delete",
      okType: "danger",
      cancelText: "Cancel",
      styles: {
        body: {
          padding: "1rem",
        },
      },
      onOk: async () => {
        try {
          await deleteAccountMutation.mutateAsync(user.id);
          setIsFetching(true); // refresh list
        } catch (error: any) {
          message.error(
            error.response?.data?.message || "Failed to delete user"
          );
        }
      },
    });
  };

  useEffect(() => {
    const fecthData = async () => {
      const wsId = Array.isArray(workspaceId) ? workspaceId[0] : workspaceId;
      const bId = Array.isArray(boardId) ? boardId[0] : boardId;
      if (!wsId) return;
      const safeBoardId = bId || "";
      const result = await accountList(
        wsId,
        safeBoardId,
        selectedRoleIds,
        searchTerm
      );

      if (result && result.data) {
        setData(result.data || []);
        setPagination((prev) => ({
          ...prev,
          total: result.data?.length || 0,
        }));
      }
    };

    if (isFetching) {
      setTimeout(() => {
        fecthData();
        setIsFetching(false);
      }, 500);
    }
  }, [isFetching, workspaceId, boardId, roleFilter, searchTerm]);

  const handleRoleFilterChange = (value: string | null) => {
    setRoleFilter(value);
    setPagination((prev) => ({ ...prev, current: 1 }));
    setIsFetching(true);
  };

  const triggerSearch = (value: string) => {
    const trimmed = value.trim();
    setSearchTerm(trimmed);
    setPagination((prev) => ({ ...prev, current: 1 }));
    setIsFetching(true);
  };

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);
    if (value === "") {
      triggerSearch("");
    }
  };

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
        {canManageUsers() && (
          <Button
            size="small"
            onClick={() => setImportModalOpen(true)}
            disabled={isImporting}
            style={{ marginLeft: 8 }}
          >
            Import Members
          </Button>
        )}
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
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <Typography.Text type="secondary">
              Filter workspace members by role or search by name/email
            </Typography.Text>
            <Space wrap size={12}>
              <Input.Search
                allowClear
                placeholder="Search members..."
                value={searchValue}
                style={{ minWidth: 220, maxWidth: 320 }}
                onChange={handleSearchChange}
                onSearch={(value) => {
                  setSearchValue(value);
                  triggerSearch(value);
                }}
                enterButton
              />
              <Select
                allowClear
                showSearch
                placeholder="All roles"
                value={roleFilter || undefined}
                style={{ minWidth: 220, maxWidth: 320 }}
                onChange={(value) => handleRoleFilterChange(value || null)}
                loading={rolesLoading}
                optionFilterProp="children"
              >
                {allRoles.map((role: any) => (
                  <Option key={role.id} value={role.id}>
                    {role.name}
                  </Option>
                ))}
              </Select>
            </Space>
          </div>
          {!isFetching && activeMenu === "menu-workspace-members" && (
            <TableMembers
              dataSource={data}
              onEdit={openEditUserModal}
              onDelete={handleDeleteUser}
              pagination={pagination}
              onPaginationChange={(page, pageSize) => {
                setPagination((prev) => ({ ...prev, current: page, pageSize }));
              }}
            />
          )}

          {!isFetching && activeMenu === "menu-guest" && (
            <TableMembers
              dataSource={data}
              onEdit={openEditUserModal}
              onDelete={handleDeleteUser}
              pagination={pagination}
              onPaginationChange={(page, pageSize) => {
                setPagination((prev) => ({ ...prev, current: page, pageSize }));
              }}
            />
          )}

          {!isFetching && activeMenu === "menu-join-request" && (
            <TableMembers
              dataSource={data}
              onEdit={openEditUserModal}
              onDelete={handleDeleteUser}
              pagination={pagination}
              onPaginationChange={(page, pageSize) => {
                setPagination((prev) => ({ ...prev, current: page, pageSize }));
              }}
            />
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
        destroyOnHidden
        styles={{
          body: { padding: 24 },
        }}
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
            <Form.Item label="Password" name="password">
              <Input.Password placeholder="Leave empty to keep current password" />
            </Form.Item>
            <Form.Item
              label="Confirm Password"
              name="confirmPassword"
              dependencies={["password"]}
              rules={[
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue("password") === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(
                      new Error("The two passwords do not match!")
                    );
                  },
                }),
              ]}
            >
              <Input.Password placeholder="Confirm new password" />
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
