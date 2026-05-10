export interface JwtPayload {
  exp: number;
  iat: number;
  username: string;
  name?: string;
  role: string;
  activeRole: string;
  roles: string[];
  sub?: string;
  userId?: string;
  sid?: string;
  oids?: string | string[];
  /** When false, backend denies protected API access. Omitted on older tokens (treated as verified for compatibility). */
  emailVerified?: boolean;
  [key: string]: any;
}
