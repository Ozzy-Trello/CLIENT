"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";

import Button from "antd/es/button";
import Checkbox from "antd/es/checkbox";
import Form from "antd/es/form";
import Input from "antd/es/input";
import message from "antd/es/message";

import AuthShell from "./auth-shell";
import OtpStep from "./otp-step";
import { useCurrentAccount } from "@hooks/account";
import { useLogin } from "@hooks/auth";
import { isOtpChallenge } from "@dto/auth";
import { setUser } from "@store/app_slice";

interface LoginFormValues {
  identity: string;
  password: string;
  remember?: boolean;
}

const OTP_CHALLENGE_KEY = "login-otp-challenge";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const login = useLogin();
  const { refetch } = useCurrentAccount();

  const [otpChallenge, setOtpChallenge] = useState<{
    otpId: string;
    expiresAt: string;
    identity: string;
    rememberMe: boolean;
  } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const saved = sessionStorage.getItem(OTP_CHALLENGE_KEY);
    if (!saved) {
      return;
    }

    try {
      const parsed = JSON.parse(saved) as {
        otpId: string;
        expiresAt: string;
        identity: string;
        rememberMe: boolean;
      };
      if (parsed?.otpId && parsed?.expiresAt && parsed?.identity) {
        if (new Date(parsed.expiresAt).getTime() > Date.now()) {
          setOtpChallenge(parsed);
          return;
        }
      }
    } catch {
      // ignore invalid persisted OTP state
    }

    sessionStorage.removeItem(OTP_CHALLENGE_KEY);
  }, []);

  const persistOtpChallenge = (next: {
    otpId: string;
    expiresAt: string;
    identity: string;
    rememberMe: boolean;
  } | null) => {
    setOtpChallenge(next);
    if (typeof window === "undefined") {
      return;
    }

    if (next) {
      sessionStorage.setItem(OTP_CHALLENGE_KEY, JSON.stringify(next));
    } else {
      sessionStorage.removeItem(OTP_CHALLENGE_KEY);
    }
  };

  const finishAuth = async () => {
    persistOtpChallenge(null);
    try {
      const result = await refetch();
      if (result) {
        dispatch(setUser(result?.data?.data));
      }
    } catch (e) {
      console.error("Failed to refetch account after OTP verify:", e);
    }

    setTimeout(async () => {
      try {
        const { workspaceDefault } = await import("@api/workspace");
        const defaultWorkspaceResponse = await workspaceDefault();
        if (defaultWorkspaceResponse?.data) {
          window.location.href = `/workspace/${defaultWorkspaceResponse.data.id}/board`;
        } else {
          window.location.href = "/workspace";
        }
      } catch (error) {
        console.error("Failed to fetch default workspace:", error);
        window.location.href = "/workspace";
      }
    }, 200);
  };

  const onFinish = async (values: LoginFormValues) => {
    setLoading(true);
    const rememberMe = values.remember || false;
    try {
      const result = await login.mutateAsync({
        identity: values.identity,
        password: values.password,
        remember_me: rememberMe,
      });
      if (isOtpChallenge(result?.data)) {
        persistOtpChallenge({
          otpId: result.data.otpId,
          expiresAt: result.data.expiresAt,
          identity: result.data.identity,
          rememberMe,
        });
        message.success("OTP dikirim ke Telegram. Silakan cek dan masukkan.");
      } else {
        message.error(result?.message || "Login response tidak dikenali");
      }
    } catch (error: any) {
      let errorMessage = "Login gagal. Coba lagi.";
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const onFinishFailed = (_errorInfo: any) => {
    message.error("Periksa input Anda dan coba lagi.");
    setLoading(false);
  };

  const credentialsForm = (
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
          initialValue={true}
        >
          <Checkbox>Remember me</Checkbox>
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
  );

  const otpForm = otpChallenge ? (
    <OtpStep
      otpId={otpChallenge.otpId}
      identity={otpChallenge.identity}
      rememberMe={otpChallenge.rememberMe}
      expiresAt={otpChallenge.expiresAt}
      onOtpRotated={(next) =>
        persistOtpChallenge(otpChallenge ? { ...otpChallenge, ...next } : null)
      }
      onCancel={() => {
        persistOtpChallenge(null);
        form.resetFields();
      }}
      onVerified={finishAuth}
    />
  ) : null;

  const activePane = otpChallenge ? otpForm : credentialsForm;

  return (
    <AuthShell title={otpChallenge ? "Verifikasi OTP" : "Selamat Datang,"}>
      {activePane}
    </AuthShell>
  );
}
