import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  accountList,
  currentAccount,
  updateAccount,
  updateAccountById,
} from "../api/account";
import TokenStorage from "@utils/token-storage";
import { Account } from "../dto/account";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { setUser } from "@store/app_slice";
import { useEffect } from "react";

export function useCurrentAccount() {
  // Check if we're on the client side
  const isClient = typeof window !== "undefined";

  const router = useRouter();
  const dispatch = useDispatch();

  const query = useQuery({
    queryKey: ["currentAccount"],
    queryFn: currentAccount,
    staleTime: 30 * 60 * 1000, // 30 minutes - data stays fresh
    refetchOnWindowFocus: true, // Auto-refresh when tab becomes active
    refetchOnMount: false, // Don't refetch if data is fresh
    enabled: isClient && !!TokenStorage.getAccessToken(), // Only run if we're on client and have a valid access token
    retry: (failureCount, error: any) => {
      // Don't retry on auth errors
      if (error?.status === 401 || error?.status === 403) {
        return false;
      }
      return failureCount < 3;
    },
  });

  // Handle errors by clearing tokens and redirecting to login
  useEffect(() => {
    if (isClient && query.isError && query.error) {
      const error = query.error as any;
      // Only clear tokens and redirect on authentication errors (401, 403)
      if (error?.status === 401 || error?.status === 403) {
        console.error("Authentication error:", error);
        TokenStorage.clearTokens();
        dispatch(setUser(null));
        router.push("/login");
      }
    }
  }, [query.isError, query.error, dispatch, router, isClient]);

  return query;
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

export function useUpdateAnyAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      userId: string;
      updates: Partial<Account & { roleIds?: string[] }>;
    }) => updateAccountById(payload.userId, payload.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accountList"] });
    },
  });
}

export function useAccountList({
  workspaceId,
  boardId,
  roleIds = [],
}: {
  workspaceId: string;
  boardId: string;
  roleIds?: string[];
}) {
  return useQuery({
    queryKey: ["accountList", workspaceId, boardId, roleIds],
    queryFn: () => accountList(workspaceId, boardId, roleIds),
    enabled: !!workspaceId && !!boardId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
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
