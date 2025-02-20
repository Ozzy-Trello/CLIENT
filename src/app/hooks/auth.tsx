// hooks/useAuth.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { login, register } from '@/app/api/auth';

export function useLogin() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['login'] });
    },
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