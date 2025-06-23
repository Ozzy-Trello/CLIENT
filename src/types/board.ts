import { User } from "./user";

export interface Board {
  id: string;
  workspaceId?: string;
  roleIds?: string[];
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
}
