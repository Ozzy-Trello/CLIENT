"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { LockOutlined, UserOutlined } from "@ant-design/icons";

// Dynamic imports for Antd components
import Form from "antd/es/form";
import Input from "antd/es/input/Input";
import Button from "antd/es/button";
import message from "antd/es/message";
import Typography from "antd/es/typography";

// Local imports
import { setUser } from "@store/app_slice";
import { useCurrentAccount } from "@hooks/account";
import { useLogin } from "@hooks/auth";
import Footer from "@components/footer";

const { Title, Text } = Typography;

interface LoginFormValues {
  identity: string;
  password: string;
  role: string;
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const router = useRouter();
  const dispatch = useDispatch();
  const login = useLogin();
  const { refetch } = useCurrentAccount();

  const validateCredentials = async (identity: string, password: string) => {
    try {
      const result = await login.mutateAsync({ identity, password });
      if (result.data?.accessToken) {
        message.success(result.message || "Login successful!");
        return true;
      } else {
        message.error(result.message || "Login failed");
        return false;
      }
    } catch (error: any) {
      console.error("Login validation error:", error);
      // Handle different types of errors
      let errorMessage = "An unexpected error occurred";

      if (error?.response?.data?.message) {
        // API error with specific message
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        // General error message
        errorMessage = error.message;
      } else if (typeof error === "string") {
        // String error
        errorMessage = error;
      }

      message.error(errorMessage);
      return false;
    }
  };

  const onFinish = async (values: LoginFormValues) => {
    console.log("Form submitted with values:", values);
    setLoading(true);

    try {
      const isValid = await validateCredentials(
        values.identity,
        values.password
      );

      console.log("Login validation result:", isValid);

      if (isValid) {
        const result = await refetch();
        if (result) {
          dispatch(setUser(result?.data?.data));
        }

        // Fix: Add timing safety to ensure authentication state is fully established
        // Wait for Redux state to be persisted before redirecting
        setTimeout(async () => {
          // Fetch default workspace after authentication and redirect to board list
          try {
            const { workspaceDefault } = await import("@api/workspace");
            const defaultWorkspaceResponse = await workspaceDefault();

            if (defaultWorkspaceResponse?.data) {
              window.location.href = `/workspace/${defaultWorkspaceResponse.data.id}/board`;
            } else {
              // Fallback to workspace page if no default workspace available
              window.location.href = "/workspace";
            }
          } catch (error) {
            console.error("Failed to fetch default workspace:", error);
            // Fallback to workspace page if workspace fetching fails
            window.location.href = "/workspace";
          }
        }, 200); // Small delay to ensure state persistence
      } else {
        // Login failed, but error message already shown in validateCredentials
        console.log("Login failed - error message already displayed");
      }
    } catch (error: any) {
      console.error("Unexpected login error:", error);
      // Display error message if not already handled by validateCredentials
      let errorMessage = "Login failed. Please try again.";

      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      message.error(errorMessage);
    } finally {
      setLoading(false);
      console.log("Login process completed, loading set to false");
    }
  };

  const onFinishFailed = (errorInfo: any) => {
    console.log("Form validation failed:", errorInfo);
    message.error("Please check your input and try again.");
    setLoading(false); // Ensure loading state is reset
  };

  return (
    <div className="h-screen flex flex-col justify-between items-center bg-gradient-to-br from-gray-100 to-blue-100 overflow-y-scroll">
      <div className="flex justify-center w-full mt-20">
        <div className="flex flex-col items-center p-10 bg-white rounded-lg shadow-md">
          <Title level={3} className="text-gray-800 mb-2">
            Ozzy Workflow
          </Title>
          <Text type="secondary">Please login to your account</Text>
          <div className="mb-2"></div>
          <Form
            form={form}
            name="login-form"
            onFinish={onFinish}
            onFinishFailed={onFinishFailed}
            layout="vertical"
            className="w-72"
            preserve={false}
          >
            <Form.Item
              name="identity"
              rules={[
                {
                  required: true,
                  message: "Please enter your email or username!",
                },
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="Email/Username"
                size="large"
                className="rounded"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                { required: true, message: "Please enter your password!" },
              ]}
            >
              <Input
                prefix={<LockOutlined />}
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
            <Link
              href="/forgot-password"
              className="text-gray-500 hover:text-blue-500"
            >
              Forgot Password?
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
