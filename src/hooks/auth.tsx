import { useMutation, useQueryClient } from '@tanstack/react-query';
import { login, register } from '@api/auth';
import TokenStorage from '@utils/token-storage';


export function useLogin() {
  const queryClient = useQueryClient();
 
  return useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      // Store auth token if returned
      if (data?.data?.accessToken && data?.data?.refreshToken) {
        TokenStorage.setTokens(data.data.accessToken, data.data.refreshToken)
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