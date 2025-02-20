import { useMutation, useQueryClient } from "@tanstack/react-query";
import { currentAccount, updateAccount } from "../api/account";

export function useAccount() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: currentAccount,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['currentAccount'] });
    },
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateAccount,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['currentAccount'] });
    }
  })
}