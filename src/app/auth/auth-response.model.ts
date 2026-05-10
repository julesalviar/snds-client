export interface AuthResponse {
  access_token: string;
  /** From database (`user.emailVerified`). JWT may treat system reference accounts as verified for access. */
  emailVerified: boolean;
}
