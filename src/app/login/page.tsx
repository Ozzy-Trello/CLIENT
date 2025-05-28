'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { LockOutlined, UserOutlined } from '@ant-design/icons';

// Dynamic imports for Antd components
import Form from 'antd/es/form';
import Input from 'antd/es/input/Input';
import Button from 'antd/es/button';
import message from 'antd/es/message';
import Typography from 'antd/es/typography';

// Local imports
import { setUser } from '@store/app_slice';
import { useCurrentAccount } from '@hooks/account';
import { useLogin } from '@hooks/auth';
import Footer from '@components/footer';

const { Title, Text } = Typography;

interface LoginFormValues {
  identity: string;
  password: string;
  role: string;
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const dispatch = useDispatch();
  const login = useLogin();
  const {refetch} = useCurrentAccount();

  const validateCredentials = async (identity: string, password: string) => {
    try {
      const result = await login.mutateAsync({ identity, password });
      if (result.data?.accessToken) {
        await message.success(result.message);
        return true;
      } else {
        await message.error(result.message);
      }
      return false;
    } catch (error) {
      message.error('An unexpected error occurred');
      return false;
    }
  };

  const onFinish = async (values: LoginFormValues) => {
    setLoading(true);
    try {
      const isValid = await validateCredentials(values.identity, values.password);
      if (isValid) {
        const result = await refetch();
        if (result) {
          dispatch(setUser(result?.data?.data));
        }
        router.push("/workspace");
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
    <div className="h-screen flex flex-col justify-between items-center bg-gradient-to-br from-gray-100 to-blue-100 overflow-y-scroll">
      <div className="flex justify-center w-full mt-20">
        <div className="flex flex-col items-center p-10 bg-white rounded-lg shadow-md">
          <Title level={3} className="text-gray-800 mb-2">Ozzy Workflow</Title>
          <Text type="secondary">Please login to your account</Text>
          <div className='mb-2'></div>
          <Form
            name="login-form"
            onFinish={onFinish}
            onFinishFailed={onFinishFailed}
            layout="vertical"
            className="w-72"
          >
            <Form.Item
              name="identity"
              rules={[{ required: true, message: 'Please enter your email or username!' }]}
            >
              <Input
                prefix={<UserOutlined  />}
                placeholder="Email/Username"
                size="large"
                className="rounded"
              />
            </Form.Item>
            
            <Form.Item
              name="password"
              rules={[{ required: true, message: 'Please enter your password!' }]}
            >
              <Input
                prefix={<LockOutlined  />}
                placeholder="Password"
                size="large"
                type="password"
                className="rounded"
              />
            </Form.Item>
            
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                block
                size="large"
                loading={loading}
                className="rounded h-10"
              >
                Login
              </Button>
            </Form.Item>
          </Form>
          
          <div className="mt-2 text-center">
            <Link href="/forgot-password" className="text-gray-500 hover:text-blue-500">
              Forgot Password?
            </Link>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}