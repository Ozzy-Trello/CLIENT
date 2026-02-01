export interface Permission {
  id: string;
  level: string;
  description: string;
  permissions: {
    card: {
      move: boolean;
      read: boolean;
      create: boolean;
      delete: boolean;
      update: boolean;
    };
    list: {
      move: boolean;
      read: boolean;
      create: boolean;
      delete: boolean;
      update: boolean;
    };
    board: {
      read: boolean;
      create: boolean;
      delete: boolean;
      update: boolean;
    };
  };
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permission: Permission;
}

export interface User {
  id: string;
  username?: string;
  fullname?: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: Role;
  refreshToken?: string;
  accessToken?: string;
  avatar?: string;
  roleName?: string;
}