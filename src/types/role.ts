export interface Role {
  id: string;
  name: string;
  description: string;
  default: boolean;
}

export interface RoleResponse {
  data: Role[];
  message: string;
  paginate?: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface SingleRoleResponse {
  data: Role;
  message: string;
}
