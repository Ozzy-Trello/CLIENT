export interface LoginRequest {
  identity: string;
  password: string;
  remember_me?: boolean;
}

export interface VerifyOtpRequest {
  otp_id: string;
  code: string;
}

export interface ResendOtpRequest {
  otp_id: string;
}

export interface LoginTokens {
  accessToken: string;
  refreshToken: string;
  user?: {
    id: string;
    username?: string;
    email?: string;
    phone?: string;
    role?: {
      id: string;
      name: string;
      description?: string;
      designAccess?: boolean;
    };
  };
}

export interface OtpChallenge {
  otpRequired: true;
  otpId: string;
  expiresAt: string;
  identity: string;
}

export type LoginResponse = LoginTokens | OtpChallenge;

export function isOtpChallenge(
  value: LoginResponse | undefined | null,
): value is OtpChallenge {
  return (
    !!value &&
    ((value as any).otpRequired === true || (value as any).otp_required === true)
  );
}

export function normalizeOtpChallenge(
  value: LoginResponse | undefined | null,
): OtpChallenge | null {
  if (!isOtpChallenge(value)) {
    return null;
  }

  const challenge = value as any;
  return {
    otpRequired: true,
    otpId: challenge.otpId ?? challenge.otp_id,
    expiresAt: challenge.expiresAt ?? challenge.expires_at,
    identity: challenge.identity,
  };
}
