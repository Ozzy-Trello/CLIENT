import { useMutation, useQueryClient } from '@tanstack/react-query';
import { login, register } from '@api/auth';
import TokenStorage from '@utils/token-storage';


export function useLogin() {
  const queryClient = useQueryClient();
 
  return useMutation({
    mutationFn: ({ credentials, rememberMe }: { credentials: any; rememberMe?: boolean }) => 
      login({ ...credentials, remember_me: rememberMe }),
    onSuccess: (data, variables) => {
      // Store auth token if returned
      if (data?.data?.accessToken && data?.data?.refreshToken) {
        const rememberMe = variables.rememberMe || false;
        TokenStorage.setTokens(data.data.accessToken, data.data.refreshToken, rememberMe);
      }
      
      // Invalidate any queries that depend on authentication
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
    onError: (error) => {
      // Handle login errors
      console.error('Login failed:', error);
    }
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: register,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['register'] });
    },
  });
}