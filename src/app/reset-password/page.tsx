'use client';

import React, { useState } from 'react';
import { Form, Input, Button, Typography, Space, message } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Footer from '../components/footer';

const { Title, Text } = Typography;

const ResetPassword: React.FC = () => {
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();

  const onFinish = (values: { email: string; password: string }) => {
    setLoading(true);
    setTimeout(() => {
      // Simulate login
      message.success('Login successful!');
      setLoading(false);
      router.push("/workspace/boards");
    }, 2000);
  };

  const onFinishFailed = () => {
    message.error('Please check your input and try again.');
  };

  return (
    <div style={styles.container}>
      <div style={{display: "flex", justifyContent:"center"}}>
        <Space direction="vertical" size="large" align="center" style={styles.card}>
        <Title level={3} style={styles.title} className={"m-0"}>Reset Password</Title>
          <Text type="secondary">Please provide a new password for tour account</Text>
          <Form
            name="login-form"
            onFinish={onFinish}
            onFinishFailed={onFinishFailed}
            style={styles.form}
            layout="vertical"
          >
            <Form.Item
              name="password"
              rules={[{ required: true, message: 'Please enter your new password!' }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Password"
                size="large"
              />
            </Form.Item>
            <Form.Item
              name="passwordConfirmation"
              rules={[{ required: true, message: 'Please enter your new password confirmation!' }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Password Confirmation"
                size="large"
              />
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                block
                size="large"
                loading={loading}
              >
                Reset Password
              </Button>
            </Form.Item>
          </Form>
          <Space direction="vertical" size="small" align="center">
            <Link href={"/login"}>
              <Text type="secondary">Back to Login?</Text>
            </Link>
          </Space>
        </Space>
      </div>
      <Footer />
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'sapce-between',
    flexDirection: "column",
    height: '100vh',
    background: 'linear-gradient(135deg, #f5f7fa, #c3cfe2)',
  },
  card: {
    padding: '40px',
    background: '#fff',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    textAlign: 'center',
  },
  title: {
    color: '#333',
    marginBottom: '10px',
  },
  form: {
    width: '300px',
  },
  link: {
    color: '#1890ff',
    textDecoration: 'underline',
  },
};

export default ResetPassword;
