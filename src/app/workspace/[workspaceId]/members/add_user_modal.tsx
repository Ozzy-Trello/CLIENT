import React, { useState } from "react";
import { Modal, Form, Input, Button, message, Select } from "antd";
import {
  UserOutlined,
  MailOutlined,
  LockOutlined,
  PhoneOutlined,
} from "@ant-design/icons";
import { createAccount as apiCreateAccount } from "@api/account";
import { useAllRoles } from "../../../../hooks/board";
import { useParams } from "next/navigation";

interface AddUserModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
}

const { Option } = Select;

const AddUserModal: React.FC<AddUserModalProps> = ({
  visible,
  onCancel,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // fetch roles
  const { workspaceId } = useParams();
  const resolvedWs = Array.isArray(workspaceId)
    ? workspaceId[0]
    : (workspaceId as string);
  const { data: rolesRes, isLoading: rolesLoading } = useAllRoles(
    resolvedWs || ""
  );
  const roles = rolesRes?.data || [];

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      const payload = { ...values } as any;
      if (values.role) {
        payload.roleIds = [values.role];
      }
      delete payload.role;
      const result = await apiCreateAccount(payload);
      if (result) {
        if (result?.message?.includes("success")) {
          message.success(result.message);
          form.resetFields();
          onCancel();
          onSuccess && onSuccess();
        } else {
          message.error(result.message);
        }
      } else {
        message.error("Failed to add user");
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || "Failed to add user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Add New User"
      open={visible}
      onCancel={onCancel}
      footer={null}
      maskClosable={false}
      destroyOnHidden
      style={{ padding: "20px", top: 20 }}
    >
      <Form
        form={form}
        layout="vertical"
        name="add_user_form"
        style={{
          paddingInline: "1rem",
        }}
      >
        <Form.Item
          name="username"
          label="Username"
          rules={[{ required: true, message: "Please enter username" }]}
        >
          <Input
            prefix={<UserOutlined className="site-form-item-icon" />}
            placeholder="Enter username"
          />
        </Form.Item>

        <Form.Item
          name="email"
          label="Email"
          rules={[
            { required: true, message: "Please enter email" },
            { type: "email", message: "Please enter a valid email" },
          ]}
        >
          <Input
            prefix={<MailOutlined className="site-form-item-icon" />}
            placeholder="Enter email address"
          />
        </Form.Item>

        <Form.Item
          name="password"
          label="Password"
          rules={[
            { required: true, message: "Please enter password" },
            { min: 6, message: "Password must be at least 6 characters" },
          ]}
        >
          <Input.Password
            prefix={<LockOutlined className="site-form-item-icon" />}
            placeholder="Enter password"
          />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          label="Confirm Password"
          dependencies={["password"]}
          rules={[
            { required: true, message: "Please confirm your password" },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("password") === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error("The passwords do not match"));
              },
            }),
          ]}
        >
          <Input.Password
            prefix={<LockOutlined className="site-form-item-icon" />}
            placeholder="Confirm password"
          />
        </Form.Item>

        <Form.Item
          name="phone"
          label="Phone Number"
          rules={[
            { required: true, message: "Please enter phone number" },
            {
              pattern: /^[0-9-+()]*$/,
              message: "Please enter a valid phone number",
            },
          ]}
        >
          <Input
            prefix={<PhoneOutlined className="site-form-item-icon" />}
            placeholder="Enter phone number"
          />
        </Form.Item>

        <Form.Item name="role" label="Role">
          <Select loading={rolesLoading} placeholder="Select role">
            {roles.map((role: any) => (
              <Option key={role.id} value={role.id}>
                {role.name}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item className="text-right">
          <Button onClick={onCancel} style={{ marginRight: 8 }}>
            Cancel
          </Button>
          <Button type="primary" onClick={handleSubmit} loading={loading}>
            Add User
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AddUserModal;
