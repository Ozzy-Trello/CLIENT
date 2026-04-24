import { useMutation, useQueryClient } from "@tanstack/react-query";
import { login, register, resendOtp, verifyOtp } from "@api/auth";
import TokenStorage from "@utils/token-storage";
import { LoginRequest } from "@dto/auth";

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: LoginRequest) => login(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth"] });
    },
    onError: (error) => {
      console.error("Login failed:", error);
    },
  });
}

export function useVerifyOtp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      otpId,
      code,
      rememberMe,
    }: {
      otpId: string;
      code: string;
      rememberMe: boolean;
    }) => {
      return verifyOtp({ otp_id: otpId, code }).then((res) => ({
        res,
        rememberMe,
      }));
    },
    onSuccess: ({ res, rememberMe }) => {
      if (res?.data?.accessToken && res?.data?.refreshToken) {
        TokenStorage.setTokens(
          res.data.accessToken,
          res.data.refreshToken,
          rememberMe,
        );
      }
      queryClient.invalidateQueries({ queryKey: ["auth"] });
    },
    onError: (error) => {
      console.error("OTP verification failed:", error);
    },
  });
}

export function useResendOtp() {
  return useMutation({
    mutationFn: ({ otpId }: { otpId: string }) => resendOtp({ otp_id: otpId }),
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: register,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["register"] });
    },
  });
}
