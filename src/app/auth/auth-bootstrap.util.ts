export const AUTH_BOOTSTRAP_PATHS = [
  '/auth/refresh',
  '/auth/login',
  '/auth/signup',
  '/auth/logout',
];

export function isAuthBootstrapUrl(url: string): boolean {
  return AUTH_BOOTSTRAP_PATHS.some((path) => url.includes(path));
}
