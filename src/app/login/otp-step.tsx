"use client";

import { useEffect, useRef, useState } from "react";
import Button from "antd/es/button";
import Form from "antd/es/form";
import Input from "antd/es/input";
import message from "antd/es/message";
import Typography from "antd/es/typography";
import { useResendOtp, useVerifyOtp } from "@hooks/auth";

interface OtpStepProps {
  otpId: string;
  identity: string;
  rememberMe: boolean;
  expiresAt: string;
  onVerified: () => void | Promise<void>;
  onCancel: () => void;
  onOtpRotated: (next: { otpId: string; expiresAt: string }) => void;
}

const RESEND_COOLDOWN_SECONDS = 15;

function computeSecondsLeft(expiresAt: string): number {
  const diff = new Date(expiresAt).getTime() - Date.now();
  return diff <= 0 ? 0 : Math.floor(diff / 1000);
}

export default function OtpStep({
  otpId,
  identity,
  rememberMe,
  expiresAt,
  onVerified,
  onCancel,
  onOtpRotated,
}: OtpStepProps) {
  const [form] = Form.useForm();
  const verify = useVerifyOtp();
  const resend = useResendOtp();
  const [secondsLeft, setSecondsLeft] = useState<number>(() =>
    computeSecondsLeft(expiresAt),
  );
  const [resendCooldown, setResendCooldown] = useState<number>(
    RESEND_COOLDOWN_SECONDS,
  );
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setSecondsLeft(computeSecondsLeft(expiresAt));
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setSecondsLeft((s) => (s <= 0 ? 0 : s - 1));
    }, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [expiresAt]);

  useEffect(() => {
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((s) => (s <= 0 ? 0 : s - 1));
    }, 1000);
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, [otpId]);

  const expired = secondsLeft <= 0;

  const onFinish = async ({ code }: { code: string }) => {
    try {
      await verify.mutateAsync({ otpId, code, rememberMe });
      message.success("OTP verified");
      await onVerified();
    } catch (e: any) {
      message.error(
        e?.response?.data?.message || e?.message || "OTP verification failed",
      );
    }
  };

  const onResend = async () => {
    if (resendCooldown > 0) return;
    try {
      const res = await resend.mutateAsync({ otpId });
      if (res?.data?.otpId) {
        message.success("A new OTP has been sent");
        onOtpRotated({
          otpId: res.data.otpId,
          expiresAt: res.data.expiresAt,
        });
        form.resetFields(["code"]);
      } else {
        message.error(res?.message || "Failed to resend OTP");
      }
    } catch (e: any) {
      message.error(
        e?.response?.data?.message || e?.message || "Failed to resend OTP",
      );
    }
  };

  return (
    <div>
      <Typography.Title level={3} style={{ marginBottom: 8 }}>
        Masukkan OTP
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        Kami kirim kode 6 digit ke Telegram untuk <b>{identity}</b>.{" "}
        {expired ? (
          <span style={{ color: "#d93025" }}>Kode kedaluwarsa.</span>
        ) : (
          <>
            Berlaku <b>{secondsLeft}s</b> lagi.
          </>
        )}
      </Typography.Paragraph>

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        className="w-full"
      >
        <Form.Item
          label="OTP Code"
          name="code"
          rules={[
            { required: true, message: "Masukkan kode 6 digit" },
            { pattern: /^\d{6}$/, message: "OTP harus 6 digit angka" },
          ]}
        >
          <Input
            inputMode="numeric"
            maxLength={6}
            autoComplete="one-time-code"
            autoFocus
            size="large"
            placeholder="123456"
            className="rounded-lg h-12 bg-gray-50 border-gray-200 tracking-[0.5em] text-center text-lg"
          />
        </Form.Item>

        <div className="flex gap-2 mb-2">
          <Button
            type="primary"
            htmlType="submit"
            block
            size="large"
            loading={verify.isPending}
            disabled={expired}
            className="rounded-lg h-12 bg-blue-600 hover:bg-blue-700 border-none font-medium"
          >
            Verify
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <Button
            type="link"
            onClick={onResend}
            loading={resend.isPending}
            disabled={resendCooldown > 0 && !expired}
          >
            {resendCooldown > 0 && !expired
              ? `Resend in ${resendCooldown}s`
              : "Resend OTP"}
          </Button>
          <Button type="text" onClick={onCancel}>
            Batal
          </Button>
        </div>
      </Form>
    </div>
  );
}
