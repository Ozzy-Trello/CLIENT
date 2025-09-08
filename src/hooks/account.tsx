import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  accountList,
  currentAccount,
  updateAccount,
  updateAccountById,
} from "../api/account";
import TokenStorage from "@utils/token-storage";
import { Account } from "../dto/account";
import { message } from "antd";

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
      message.success('Profile updated successfully!');
    },
    onError: (error) => {
      message.error('Failed to update profile. Please try again.');
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
  const permissionLevel = account?.data?.role?.permission?.level;
  const permissions = account?.data?.role?.permission?.permissions;

  // Role level checks
  const isObserver = () => permissionLevel === "OBSERVER";
  const isMember = () => permissionLevel === "MEMBER";
  const isModerator = () => ["MODERATOR", "ADMIN"].includes(permissionLevel || "");
  const isAdmin = () => permissionLevel === "ADMIN";

  // Basic CRUD permissions
  const canCreate = (resource: "board" | "list" | "card") =>
    permissions?.[resource]?.create ?? false;
  const canRead = (resource: "board" | "list" | "card") =>
    permissions?.[resource]?.read ?? false;
  const canUpdate = (resource: "board" | "list" | "card") =>
    permissions?.[resource]?.update ?? false;
  const canDelete = (resource: "board" | "list" | "card") =>
    permissions?.[resource]?.delete ?? false;
  const canMove = (resource: "list" | "card") =>
    permissions?.[resource]?.move ?? false;

  // Specific action permissions
  const canArchiveCard = () => canUpdate("card") || isModerator();
  const canDeleteCard = () => canDelete("card");
  const canCopyCard = () => canCreate("card");
  const canMoveCard = () => canMove("card");
  const canMirrorCard = () => canCreate("card");
  
  const canManageCardMembers = () => canUpdate("card");
  const canManageCardLabels = () => canUpdate("card");
  const canManageCardDates = () => canUpdate("card");
  const canManageCardAttachments = () => canUpdate("card");
  const canManageCardChecklists = () => canUpdate("card");
  const canManageCardCustomFields = () => canUpdate("card");
  const canManageCardLocation = () => canUpdate("card");

  const canCreateList = () => canCreate("list");
  const canUpdateList = () => canUpdate("list");
  const canDeleteList = () => canDelete("list");
  const canMoveList = () => canMove("list");
  const canArchiveList = () => canUpdate("list") || isModerator();

  const canCreateBoard = () => canCreate("board");
  const canUpdateBoard = () => canUpdate("board");
  const canDeleteBoard = () => canDelete("board") || isAdmin();
  const canManageBoardSettings = () => canUpdate("board") || isModerator();
  const canManageBoardAutomation = () => isModerator();
  const canManageBoardCustomFields = () => isModerator();
  const canManageBoardLabels = () => canUpdate("board") || isModerator();
  const canViewArchivedItems = () => canRead("card") && canRead("list");

  // Share and export permissions
  const canShareCard = () => canRead("card");
  const canGenerateQR = () => canRead("card");
  const canExportBoard = () => canRead("board");

  // Administrative permissions
  const canManageWorkspace = () => isAdmin();
  const canManageRoles = () => isAdmin();
  const canManageUsers = () => isAdmin();

  return {
    // Raw data
    permissions,
    user: account?.data,
    role: account?.data?.role,
    permissionLevel,

    // Role checks
    isObserver,
    isMember,
    isModerator,
    isAdmin,

    // Basic CRUD
    canCreate,
    canRead,
    canUpdate,
    canDelete,
    canMove,

    // Card permissions
    canArchiveCard,
    canDeleteCard,
    canCopyCard,
    canMoveCard,
    canMirrorCard,
    canManageCardMembers,
    canManageCardLabels,
    canManageCardDates,
    canManageCardAttachments,
    canManageCardChecklists,
    canManageCardCustomFields,
    canManageCardLocation,

    // List permissions
    canCreateList,
    canUpdateList,
    canDeleteList,
    canMoveList,
    canArchiveList,

    // Board permissions
    canCreateBoard,
    canUpdateBoard,
    canDeleteBoard,
    canManageBoardSettings,
    canManageBoardAutomation,
    canManageBoardCustomFields,
    canManageBoardLabels,
    canViewArchivedItems,

    // Share/Export permissions
    canShareCard,
    canGenerateQR,
    canExportBoard,

    // Administrative permissions
    canManageWorkspace,
    canManageRoles,
    canManageUsers,

    // Utility functions
    hasAnyPermission: (resource: "board" | "list" | "card") => 
      canCreate(resource) || canRead(resource) || canUpdate(resource) || canDelete(resource),
    
    hasMinimumRole: (minRole: "OBSERVER" | "MEMBER" | "MODERATOR" | "ADMIN") => {
      const roleHierarchy = { OBSERVER: 1, MEMBER: 2, MODERATOR: 3, ADMIN: 4 };
      const currentRoleLevel = roleHierarchy[permissionLevel as keyof typeof roleHierarchy] || 0;
      const minRoleLevel = roleHierarchy[minRole];
      return currentRoleLevel >= minRoleLevel;
    }
  };
}
