export interface AccountListRequest {
  workspaceId: string;
  boardId: string;
}

export interface Permission {
  id: string;
  level: "MEMBER" | "OBSERVER" | "MODERATOR" | "ADMIN";
  description: string;
  permissions: {
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
    };
    card: {
      create: boolean;
      read: boolean;
      update: boolean;
      delete: boolean;
    };
  };
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permission: Permission;
}

export interface Account {
  id: string;
  username: string;
  email: string;
  phone: string;
  name?: string;
  avatar?: string;
  role?: {
    id: string;
    name: string;
    description: string;
    permission: {
      id: string;
      level: string;
      description: string;
      permissions: {
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
      };
    };
  };
}
