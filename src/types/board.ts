import { User } from "./user";

export interface FineGrainedPermissions {
  board: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
  };
  list: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
    move: boolean;
  };
  card: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
    move: boolean;
  };
}

export interface Board {
  id: string;
  workspaceId?: string;
  roleIds?: string[];
  rolePermissions?: Record<string, string>;
  name?: string;
  cover?: string;
  background?: string;
  isStarred?: boolean;
  description?: string;
  visibility?: string;
  createdBy?: User;
  createdAt: string;
  updatedBy?: User;
  upatedAt?: string;
  user_permission?: "OBSERVER" | "MEMBER" | "MODERATOR" | "ADMIN" | null;
  user_permissions?: FineGrainedPermissions | null;
  userPermission?: "OBSERVER" | "MEMBER" | "MODERATOR" | "ADMIN" | null;
  userPermissions?: FineGrainedPermissions | null;
  isFavorite?: boolean;
  orderIndex?: number;
  favoriteOrderIndex?: number;
}
