'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { LockOutlined, UserOutlined } from '@ant-design/icons';

// Dynamic imports for Antd components
import Form from 'antd/es/form';
import Input from 'antd/es/input/Input';
import Button from 'antd/es/button';
import Space from 'antd/es/space';
import message from 'antd/es/message';
import Typography from 'antd/es/typography';

// Local imports
import { setAccessToken, setRefreshToken, setUser } from '@/app/store/slice';
import { users } from '@/dummy-data';
import Footer from '@/app/components/footer';
import { useLogin } from '../hooks/auth';
import { useAccount } from '../hooks/account';

const { Title, Text } = Typography;

interface LoginFormValues {
  email: string;
  password: string;
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const dispatch = useDispatch();
  const login = useLogin();

  // Prefetch the next page
  useEffect(() => {
    router.prefetch('/workspace/boards');
  }, [router]);


  const validateCredentials = async (email: string, password: string) => {
    try {
      const result = await login.mutateAsync({ email, password });
      if (result.data?.accessToken) {
        const foundUser = users.find((item) => item.email === 'johndoe@example.com');
        if (foundUser) {
          dispatch(setUser(foundUser));
          dispatch(setAccessToken(result.data.accessToken));
          dispatch(setRefreshToken(result.data.accessToken));
          await message.success(result.message);
          return true;
        }
      } else {
        await message.error(result.message);
      }
      return false;
    } catch (error) {
      message.error('An unexpected error occurred');
      console.error('Login error:', error);
      return false;
    }
  };

  const onFinish = async (values: LoginFormValues) => {
    setLoading(true);
    try {
      const isValid = await validateCredentials(values.email, values.password);
      if (isValid) {
        router.push("/workspace/boards");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const onFinishFailed = () => {
    message.error('Please check your input and try again.');
  };

  return (
    <div style={styles.container}>
      <div style={{display: "flex", justifyContent:"center"}}>
        <Space direction="vertical" size="large" align="center" style={styles.card}>
          <Title level={3} style={styles.title} className={"m-0"}>Welcome Back</Title>
          <Text type="secondary">Please login to your account</Text>
          <Form
            name="login-form"
            onFinish={onFinish}
            onFinishFailed={onFinishFailed}
            style={styles.form}
            layout="vertical"
          >
            <Form.Item
              name="email"
              rules={[{ required: true, message: 'Please enter your email!' }]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="Email"
                size="large"
              />
            </Form.Item>
            <Form.Item
              name="password"
              rules={[{ required: true, message: 'Please enter your password!' }]}
            >
              <Input
                prefix={<LockOutlined />}
                placeholder="Password"
                size="large"
                type="password"
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
                Login
              </Button>
            </Form.Item>
          </Form>
          <Space direction="vertical" size="small" align="center">
            <Link href={"/forgot-password"}>
              <Text type="secondary">Forgot Password?</Text>
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
    alignItems: 'space-between',
    height: '100vh',
    flexDirection: "column",
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