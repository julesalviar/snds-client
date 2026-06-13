const TOKEN_STORAGE_KEY = 'token';

export class TokenHolder {
  private static sessionToken: string | null = null;

  static setSessionToken(token: string | null): void {
    this.sessionToken = token;
    if (typeof sessionStorage === 'undefined') {
      return;
    }
    if (token) {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  }

  static getToken(): string | null {
    if (this.sessionToken) {
      return this.sessionToken;
    }
    if (typeof sessionStorage === 'undefined') {
      return null;
    }
    return sessionStorage.getItem(TOKEN_STORAGE_KEY);
  }

  static clear(): void {
    this.sessionToken = null;
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  }
}
