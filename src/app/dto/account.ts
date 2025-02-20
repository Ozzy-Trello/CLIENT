export interface AccountListRequest {
  workspaceId: string;
  boardId: string;
}

export interface Account {
  username: string;
  email: string;
  phone: string;
}