'use client';
import { Avatar, Button, Card, Col, Flex, Form, Input, Row, Tooltip, Typography, Upload } from "antd";
import { useState } from "react";
import { LoadingOutlined, PlusOutlined } from '@ant-design/icons';
import "./style.css"
import { useUpdateAccount } from "@/app/hooks/account";
import { Account as AccountDto } from "@/app/dto/account";
import useTaskService from "@/app/hooks/task";


const Account: React.FC = () => {

  const [isLoading, setIsLoading] = useState(false);
  const [editAbout, setEditAbout] = useState(false);
  const [editPassword, setEditPassword] = useState(false);
  const updateAccount = useUpdateAccount();
  const {currentUser} = useTaskService();

  const uploadButton = (
    <button style={{ border: 0, background: 'none' }} type="button">
      {isLoading ? <LoadingOutlined /> : <PlusOutlined />}
      <div style={{ marginTop: 8 }}>Upload</div>
    </button>
  );

  const enableEditAbout = () => {
    setEditAbout(true);
  }

  const applyAboutChanges = async (values: AccountDto) => {
    try {
      setIsLoading(true);
      const result = await updateAccount.mutateAsync(values);
      if (result) {

      }
    } catch (error) {

    } finally {
      setIsLoading(false);
    }
    setEditAbout(false);
  }

  const enableEditPassword = () => {
    setEditPassword(true);
  }

  const applyPasswordChanges = () => {
    setEditPassword(false);
  }

  const applyAvatarChanges = () => {

  }

  return (
    <div className="page scrollable-page">
      <div className="fx-h-sb-center" style={{marginBottom: "20px"}}>
        <div className="section-title fx-h-left-center">
          <Typography.Title level={4} className="m-0">Account</Typography.Title>
        </div>
      </div>

      <div className="fx-h=left-start" style={{marginBottom: "20px"}}>
        <Row align="stretch" style={{ height: '100%' }}>
          <Col
            xs={{ flex: '100%' }}  
            sm={{ flex: '100%' }}
            md={{ flex: '30%' }}
            lg={{ flex: '30%' }}
            xl={{ flex: '30%' }}
            style={{ 
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <Form onFinish={applyAvatarChanges}>
              <div className="section-avatar" style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                marginBottom: '20px'
              }}>
                <Typography.Title level={5} className="m-0">Avatar</Typography.Title>
                <Card style={{ 
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <div className="section-header" />
                  <Upload
                    name="avatar"
                    listType="picture-circle"
                    className="avatar-uploader"
                    showUploadList={false}
                    action="https://660d2bd96ddfa2943b33731c.mockapi.io/api/upload"
                  >
                    {currentUser?.avatar ? 
                      <Avatar 
                        src={currentUser.avatar} 
                        alt="avatar" 
                        shape="circle" 
                        style={{width:"100%", height:"100%"}}
                      /> : uploadButton}
                  </Upload>
                </Card>
              </div>
            </Form>
          </Col>
          
          <Col
            xs={{ flex: '100%' }}  
            sm={{ flex: '100%' }}
            md={{ flex: '70%' }}
            lg={{ flex: '70%' }}
            xl={{ flex: '70%' }}
            style={{ 
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <Form onFinish={applyAboutChanges}>
              <div className="section-about-you" style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                marginBottom: '20px'
              }}>
                <div className="fx-h-sb-center">
                  <Typography.Title level={5} className="m-0">About You</Typography.Title>
                  <Tooltip title="Update about you">
                    { editAbout ? (
                      <Form.Item>
                        <Button size="small" htmlType="submit">Apply changes</Button>
                      </Form.Item>
                    ) : (
                      <Button size="small" onClick={enableEditAbout}>Update</Button>
                    ) }
                  </Tooltip>
                </div>
                <Card style={{ 
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <table style={{ height: '100%' }} className="horizontal-table">
                    <tbody>
                      <tr>
                        <th>Full Name</th>
                        <td>
                          {editAbout ? (
                            <Form.Item
                              name="fullName"
                              className="m-0"
                              initialValue={currentUser?.fullname}
                            >
                              <Input
                                size="small"
                                type="text"
                              />
                            </Form.Item>
                          ) : (currentUser?.fullname)}
                        </td>
                      </tr>
                      <tr>
                        <th>Username</th>
                        <td>
                          {editAbout ? ( 
                            <Form.Item
                              name="username"
                              className="m-0"
                              initialValue={currentUser?.username}
                            >
                              <Input
                                size="small"
                                type="text"
                              />
                            </Form.Item>
                          ) : (currentUser?.username)}
                        </td>
                      </tr>
                      <tr>
                        <th>Email</th>
                        <td>
                          {editAbout ? ( 
                            <Form.Item
                              name="email"
                              className="m-0"
                              initialValue={currentUser?.email}
                            >
                            <Input
                              size="small"
                              type="text"
                            />
                          </Form.Item>
                          ) : (currentUser?.email)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                
                </Card>
              </div>
            </Form>
          </Col>
        </Row>

        <div className="section-reset-password" style={{marginBottom: "20px"}}>
          <div className="fx-h-sb-center">
            <Typography.Title level={5} className="m-0">Reset Password</Typography.Title>
            <Tooltip title="Set new password">
              { editPassword ? (
                <Button size="small" onClick={applyPasswordChanges}>Apply changes</Button>
              ) : (
                <Button size="small" onClick={enableEditPassword}>Update</Button>
              ) }
            </Tooltip>
          </div>
          <Card>
            <Form onFinish={applyPasswordChanges}>
              <table className="horizontal-table">
                { editPassword ? (
                  <>
                    <tr>
                      <th>Current Password</th>
                      <td>
                        <Form.Item
                          name="password"
                          rules={[{ required: true, message: 'Please enter your current password!' }]}
                          className="m-0"
                        >
                          <Input
                            placeholder="Current Password"
                            size="small"
                            type="password"
                          />
                        </Form.Item>
                      </td>
                    </tr>
                    <tr>
                      <th>New Password</th>
                      <td>
                        <Form.Item
                          name="newPassword"
                          rules={[{ required: true, message: 'Please enter your new password!' }]}
                          className="m-0"
                        >
                          <Input
                            placeholder="New Password"
                            size="small"
                            type="password"
                          />
                        </Form.Item>
                      </td>
                    </tr>
                    <tr>
                      <th>New Password Confirmation</th>
                      <td>
                        <Form.Item
                          name="newPasswordConfirmation"
                          rules={[{ required: true, message: 'Please enter your new password confirmation!' }]}
                          className="m-0"
                        >
                          <Input
                            placeholder="New Password confirmation"
                            size="small"
                            type="password"
                          />
                        </Form.Item>
                      </td>
                    </tr>
                  </>
                ) : (
                  <>
                    <tr>
                      <th>Password</th>
                      <td>***********</td>
                    </tr>
                  </>
                ) }
              </table>
            </Form>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default Account;