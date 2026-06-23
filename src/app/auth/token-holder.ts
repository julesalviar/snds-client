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

  static getValidToken(): string | null {
    const token = this.getToken();
    if (!token) {
      return null;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1])) as { exp?: number };
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp != null && payload.exp > now) {
        return token;
      }
    } catch {
      return null;
    }

    return null;
  }

  static clear(): void {
    this.sessionToken = null;
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  }
}
