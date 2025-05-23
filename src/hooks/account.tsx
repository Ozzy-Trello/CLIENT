import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { accountList, currentAccount, updateAccount } from "../api/account";

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

export function useAccountList({workspaceId, boardId}: {workspaceId: string, boardId: string}) {
  return useQuery({
    queryKey: ['accountList'],
    queryFn: () => accountList(workspaceId, boardId),
    enabled: !!workspaceId && !!boardId,
  });
}