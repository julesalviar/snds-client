export interface JwtPayload {
  exp: number;
  iat: number;
  username: string;
  role: string;
  activeRole: string;
  roles: string[];
  [key: string]: any;
}
