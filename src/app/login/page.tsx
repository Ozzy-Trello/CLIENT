"use client";
import { useState } from "react";
import { useDispatch } from "react-redux";

// Dynamic imports for Antd components
import Button from "antd/es/button";
import Form from "antd/es/form";
import Input from "antd/es/input";
import message from "antd/es/message";

// Local imports
import { useCurrentAccount } from "@hooks/account";
import { useLogin } from "@hooks/auth";
import { setUser } from "@store/app_slice";

interface LoginFormValues {
  identity: string;
  password: string;
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const login = useLogin();
  const { refetch } = useCurrentAccount();

  const validateCredentials = async (identity: string, password: string) => {
    try {
      const result = await login.mutateAsync({ 
        credentials: { identity, password }, 
        rememberMe: false,
      });
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
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white shadow-xl rounded-2xl p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-gray-800 mb-2">
            Welcome back
          </h1>
          <p className="text-sm text-gray-500">
            Please sign in to continue
          </p>
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
              className="rounded-lg h-11"
            />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[{ required: true, message: "Please enter your password!" }]}
          >
            <Input.Password
              placeholder="Password"
              size="large"
              className="rounded-lg h-11"
            />
          </Form.Item>

          <Form.Item className="mt-8">
            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              loading={loading}
              className="rounded-lg h-11"
            >
              Sign in
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
}
