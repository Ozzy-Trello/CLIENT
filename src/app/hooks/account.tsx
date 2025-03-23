import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { currentAccount, updateAccount } from "../api/account";

export function useCurrentAccount() {
  return useQuery({
    queryKey: ['currentAccount'],
    queryFn: currentAccount,
    enabled: false,
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateAccount,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['currentAccount'] });
    }
  });
}