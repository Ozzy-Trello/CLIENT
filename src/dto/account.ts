export interface AccountListRequest {
  workspaceId: string;
  boardId: string;
}

export interface Account {
  id: string;
  username: string;
  email: string;
  phone: string;
}