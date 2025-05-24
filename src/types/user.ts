export interface User {
  id: string;
  username: string;
  fullname: string;
  email: string;
  phone: string;
  refreshToken?: string;
  accessToken?: string;
  avatar?: string;
  roleName?: string;
}