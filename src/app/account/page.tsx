"use client";
import { Button, Card, Col, Form, Input, Row, Typography, Divider } from "antd";
import { useState } from "react";
import {
  EditOutlined,
  UserOutlined,
  LockOutlined,
  PlusOutlined,
  SaveOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";
import "./style.css";
import { useUpdateAccount } from "@hooks/account";
import { Account as AccountDto } from "@dto/account";
import { selectUser } from "@store/app_slice";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";

const Account: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [editAbout, setEditAbout] = useState(false);
  const [editPassword, setEditPassword] = useState(false);
  const updateAccount = useUpdateAccount();
  const currentUser = useSelector(selectUser);
  const router = useRouter();

  // Avatar functionality removed as per requirements

  const enableEditAbout = () => {
    setEditAbout(true);
  };

  const applyAboutChanges = async (values: AccountDto) => {
    try {
      setIsLoading(true);
      await updateAccount.mutateAsync(values);
    } catch (error) {
      // Error handling is now done in the mutation hook
    } finally {
      setIsLoading(false);
    }
    setEditAbout(false);
  };

  const enableEditPassword = () => {
    setEditPassword(true);
  };

  const applyPasswordChanges = async (values: { newPassword: string; newPasswordConfirmation: string }) => {
    try {
      setIsLoading(true);
      await updateAccount.mutateAsync({ password: values.newPassword });
    } catch (error) {
      // Error handling is done in the mutation hook
    } finally {
      setIsLoading(false);
    }
    setEditPassword(false);
  };

  return (
    <div className="page scrollable-page modern-account-page">
      {/* Back Button */}
      <div className="back-button-container">
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => router.push("/")}
          className="back-button"
        >
          Back
        </Button>
      </div>

      <div className="account-content">
        <Row gutter={[20, 20]}>
          {/* Profile Section */}
          <Col xs={24}>
            <Card className="profile-card" bordered={false}>
              <div className="card-header">
                <div className="fx-h-left-center">
                  <UserOutlined className="section-icon" />
                  <Typography.Title level={4} className="m-0">
                    Profile Information
                  </Typography.Title>
                </div>
                {editAbout ? (
                  <div
                    className="flex flex-row fx-h-left-center"
                    style={{ gap: "8px" }}
                  >
                    <Button
                      type="default"
                      onClick={() => setEditAbout(false)}
                      className="edit-button"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="primary"
                      icon={<SaveOutlined />}
                      htmlType="submit"
                      form="profile-form"
                      className="edit-button"
                    >
                      Save Changes
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="default"
                    icon={<EditOutlined />}
                    onClick={enableEditAbout}
                    className="edit-button"
                  >
                    Edit Profile
                  </Button>
                )}
              </div>

              <Divider className="card-divider" />

              <Form
                id="profile-form"
                onFinish={applyAboutChanges}
                layout="vertical"
                className="profile-form"
              >
                <Row gutter={[16, 0]}>
                  <Col xs={24} md={8}>
                    <Form.Item
                      label="Username"
                      name="username"
                      initialValue={currentUser?.username}
                      className="form-item-modern"
                    >
                      {editAbout ? (
                        <Input
                          placeholder="Enter your username"
                          className="modern-input"
                        />
                      ) : (
                        <div className="display-value">
                          {currentUser?.username || "Not provided"}
                        </div>
                      )}
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item
                      label="Email Address"
                      name="email"
                      initialValue={currentUser?.email}
                      className="form-item-modern"
                    >
                      {editAbout ? (
                        <Input
                          type="email"
                          placeholder="Enter your email address"
                          className="modern-input"
                        />
                      ) : (
                        <div className="display-value">
                          {currentUser?.email || "Not provided"}
                        </div>
                      )}
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item
                      label="Phone Number"
                      name="phone"
                      initialValue={currentUser?.phone}
                      className="form-item-modern"
                    >
                      {editAbout ? (
                        <Input
                          placeholder="Enter your phone number"
                          className="modern-input"
                        />
                      ) : (
                        <div className="display-value">
                          {currentUser?.phone || "Not provided"}
                        </div>
                      )}
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item
                      label="Role"
                      name="role"
                      className="form-item-modern"
                    >
                      <div className="display-value role-display">
                        {currentUser?.role?.name || "Not assigned"}
                      </div>
                    </Form.Item>
                  </Col>
                </Row>
              </Form>
            </Card>
          </Col>
        </Row>

        {/* Security Section */}
        <Row gutter={[20, 20]} style={{ marginTop: 20 }}>
          <Col xs={24}>
            <Card className="security-card" bordered={false}>
              <div className="card-header">
                <div className="fx-h-left-center">
                  <LockOutlined className="section-icon" />
                  <Typography.Title level={4} className="m-0">
                    Security Settings
                  </Typography.Title>
                </div>
                {!editPassword && (
                  <Button
                    type="default"
                    icon={<EditOutlined />}
                    onClick={enableEditPassword}
                    className="edit-button"
                  >
                    Change Password
                  </Button>
                )}
              </div>

              <Divider className="card-divider" />

              {editPassword ? (
                <Form
                  onFinish={applyPasswordChanges}
                  layout="vertical"
                  className="password-form"
                >
                  <Row gutter={[16, 0]}>
                    <Col xs={24} md={12}>
                      <Form.Item
                        label="New Password"
                        name="newPassword"
                        rules={[
                          {
                            required: true,
                            message: "Please enter your new password!",
                          },
                        ]}
                        className="form-item-modern"
                      >
                        <Input.Password
                          placeholder="Enter new password"
                          className="modern-input"
                        />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={12}>
                      <Form.Item
                        label="Confirm New Password"
                        name="newPasswordConfirmation"
                        dependencies={['newPassword']}
                        rules={[
                          {
                            required: true,
                            message: "Please confirm your new password!",
                          },
                          ({ getFieldValue }) => ({
                            validator(_, value) {
                              if (!value || getFieldValue('newPassword') === value) {
                                return Promise.resolve();
                              }
                              return Promise.reject(new Error('The two passwords do not match!'));
                            },
                          }),
                        ]}
                        className="form-item-modern"
                      >
                        <Input.Password
                          placeholder="Confirm new password"
                          className="modern-input"
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  
                  <div className="form-actions" style={{ marginTop: '16px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <Button
                      type="default"
                      onClick={() => setEditPassword(false)}
                      className="edit-button"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="primary"
                      icon={<SaveOutlined />}
                      htmlType="submit"
                      className="edit-button"
                      loading={isLoading}
                    >
                      Save Changes
                    </Button>
                  </div>
                </Form>
              ) : (
                <div className="password-display">
                  <div className="password-info">
                    <Typography.Text strong>Password</Typography.Text>
                    <Typography.Text
                      type="secondary"
                      className="password-masked"
                    >
                      ••••••••••••
                    </Typography.Text>
                  </div>
                </div>
              )}
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default Account;
