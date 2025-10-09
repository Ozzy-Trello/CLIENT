"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { LockOutlined, UserOutlined } from "@ant-design/icons";

// Dynamic imports for Antd components
import Form from "antd/es/form";
import Input from "antd/es/input";
import Button from "antd/es/button";
import message from "antd/es/message";
import Typography from "antd/es/typography";

// Local imports
import { setUser } from "@store/app_slice";
import { useCurrentAccount } from "@hooks/account";
import { useLogin } from "@hooks/auth";
import Footer from "@components/footer";
import ProductionSection from "@components/production-section";

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
    <div className="min-h-screen">
      {/* Mobile Layout: Production image on top, form below */}
      <div className="lg:hidden">
        {/* Mobile: Show production image on top */}
        <ProductionSection variant="mobile" />

        {/* Mobile: Login Form */}
        <div className="flex flex-col justify-center items-center p-8 bg-white min-h-[calc(100vh-16rem)]">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <h1 className="text-2xl font-semibold text-gray-800 mb-2">
                Selamat Datang,
              </h1>
            </div>

            <Form
              form={form}
              name="login-form"
              onFinish={onFinish}
              onFinishFailed={onFinishFailed}
              layout="vertical"
              className="w-full"
              preserve={false}
            >
              <Form.Item
                label="Username or email"
                name="identity"
                rules={[
                  {
                    required: true,
                    message: "Please enter your email or username!",
                  },
                ]}
              >
                <Input
                  placeholder="Username or email"
                  size="large"
                  className="rounded-lg h-12 bg-gray-50 border-gray-200"
                />
              </Form.Item>

              <Form.Item
                label="Password"
                name="password"
                rules={[
                  { required: true, message: "Please enter your password!" },
                ]}
              >
                <Input.Password
                  placeholder="Password"
                  size="large"
                  className="rounded-lg h-12 bg-gray-50 border-gray-200"
                />
              </Form.Item>

              <div className="flex items-center justify-between mb-6">
                <Form.Item
                  name="remember"
                  valuePropName="checked"
                  className="mb-0"
                >
                  <input type="checkbox" id="remember" className="mr-2" />
                  <label htmlFor="remember" className="text-sm text-gray-600">
                    Remember me
                  </label>
                </Form.Item>
                <Link
                  href="/forgot-password"
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Forgot password ?
                </Link>
              </div>

              <Form.Item className="mb-0">
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  size="large"
                  loading={loading}
                  className="rounded-lg h-12 bg-blue-600 hover:bg-blue-700 border-none font-medium"
                >
                  Login
                </Button>
              </Form.Item>
            </Form>
          </div>
        </div>
      </div>

      {/* Desktop Layout: Full background with small centered form and right side card */}
      <div className="hidden lg:block min-h-screen relative">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('/background-login.jpg')`,
          }}
        >
          <div className="absolute inset-0 bg-black/20">
            <div className="flex justify-center items-center min-h-screen p-8">
              <div className="flex bg-white rounded-4xl shadow-2xl overflow-hidden max-w-4xl w-full">
                <div className="flex-1 p-8 max-w-md">
                  <div className="mb-8">
                    <h1 className="text-2xl font-semibold text-gray-800 mb-2">
                      Selamat Datang,
                    </h1>
                  </div>

                  <Form
                    form={form}
                    name="login-form"
                    onFinish={onFinish}
                    onFinishFailed={onFinishFailed}
                    layout="vertical"
                    className="w-full"
                    preserve={false}
                  >
                    <Form.Item
                      label="Username or email"
                      name="identity"
                      rules={[
                        {
                          required: true,
                          message: "Please enter your email or username!",
                        },
                      ]}
                    >
                      <Input
                        placeholder="Username or email"
                        size="large"
                        className="rounded-lg h-12 bg-gray-50 border-gray-200"
                      />
                    </Form.Item>

                    <Form.Item
                      label="Password"
                      name="password"
                      rules={[
                        {
                          required: true,
                          message: "Please enter your password!",
                        },
                      ]}
                    >
                      <Input.Password
                        placeholder="Password"
                        size="large"
                        className="rounded-lg h-12 bg-gray-50 border-gray-200"
                      />
                    </Form.Item>

                    <div className="flex items-center justify-between mb-6">
                      <Form.Item
                        name="remember"
                        valuePropName="checked"
                        className="mb-0"
                      >
                        <input type="checkbox" id="remember" className="mr-2" />
                        <label
                          htmlFor="remember"
                          className="text-sm text-gray-600"
                        >
                          Remember me
                        </label>
                      </Form.Item>
                      <Link
                        href="/forgot-password"
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Forgot password ?
                      </Link>
                    </div>

                    <Form.Item className="mb-0">
                      <Button
                        type="primary"
                        htmlType="submit"
                        block
                        size="large"
                        loading={loading}
                        className="rounded-lg h-12 bg-blue-600 hover:bg-blue-700 border-none font-medium"
                      >
                        Login
                      </Button>
                    </Form.Item>
                  </Form>
                </div>

                {/* Right side - Production Image */}
                <ProductionSection variant="desktop" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
