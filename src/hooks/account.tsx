import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { accountList, currentAccount, updateAccount } from "../api/account";
import TokenStorage from "@utils/token-storage";

export function useCurrentAccount() {
  return useQuery({
    queryKey: ["currentAccount"],
    queryFn: currentAccount,
    staleTime: 30 * 60 * 1000, // 30 minutes - data stays fresh
    refetchOnWindowFocus: true, // Auto-refresh when tab becomes active
    refetchOnMount: false, // Don't refetch if data is fresh
    enabled: !!TokenStorage.getAccessToken(), // Only run if a valid access token exists
    retry: (failureCount, error: any) => {
      // Don't retry on auth errors
      if (error?.status === 401 || error?.status === 403) {
        return false;
      }
      return failureCount < 3;
    },
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateAccount,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["currentAccount"] });
    },
  });
}

export function useAccountList({
  workspaceId,
  boardId,
}: {
  workspaceId: string;
  boardId: string;
}) {
  return useQuery({
    queryKey: ["accountList"],
    queryFn: () => accountList(workspaceId, boardId),
    enabled: !!workspaceId && !!boardId,
  });
}

// Permission helpers hook
export function usePermissions() {
  const { data: account } = useCurrentAccount();

  return {
    permissions: account?.data?.role?.permission?.permissions,
    canCreate: (resource: "board" | "list" | "card") =>
      account?.data?.role?.permission?.permissions?.[resource]?.create ?? false,
    canUpdate: (resource: "board" | "list" | "card") =>
      account?.data?.role?.permission?.permissions?.[resource]?.update ?? false,
    canDelete: (resource: "board" | "list" | "card") =>
      account?.data?.role?.permission?.permissions?.[resource]?.delete ?? false,
    canMove: (resource: "list" | "card") =>
      account?.data?.role?.permission?.permissions?.[resource]?.move ?? false,
    isAdmin: () => account?.data?.role?.permission?.level === "ADMIN",
    isModerator: () =>
      ["ADMIN", "MODERATOR"].includes(
        account?.data?.role?.permission?.level || ""
      ),
    user: account?.data,
    role: account?.data?.role,
    permissionLevel: account?.data?.role?.permission?.level,
  };
}
