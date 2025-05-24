import { useMutation, useQueryClient } from '@tanstack/react-query';
import { login, register } from '@api/auth';
import { useDispatch } from 'react-redux';
import { setAccessToken } from '../store/app_slice';import { useCurrentAccount } from './account';


export function useLogin() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
 
  return useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      // Store auth token if returned
      if (data?.data?.accessToken) {
        dispatch(setAccessToken(data?.data?.accessToken));
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