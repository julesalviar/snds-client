export interface JwtPayload {
  exp: number;
  iat: number;
  username: string;
  role: string;
  [key: string]: any;
}
