import React, { useState } from "react";
import { Modal, Form, Input, Button, message } from "antd";
import {
  UserOutlined,
  MailOutlined,
  LockOutlined,
  PhoneOutlined,
} from "@ant-design/icons";
import { register } from "@/app/api/auth";

interface AddUserModalProps {
  visible: boolean;
  onCancel: () => void;
}

const AddUserModal: React.FC<AddUserModalProps> = ({ visible, onCancel }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      const result = await register(values);
      if (result) {
        if (result?.message?.includes("success")) {
          message.success(result.message);
          form.resetFields();
          onCancel();
        } else {
          message.error(result.message);
        }
      } else {
        message.error("Failed to add user");
      }
    } catch (error) {
      message.error("Failed to add user");
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
      destroyOnClose
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
