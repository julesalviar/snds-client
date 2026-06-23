export const SESSION_EXPIRED_QUERY_PARAM = 'sessionExpired';

export const SESSION_EXPIRED_MESSAGE =
  'Your session has expired or is no longer valid. Please sign in again to continue.';

export function isSessionExpiredRedirect(
  queryParamMap: { get: (name: string) => string | null },
): boolean {
  return queryParamMap.get(SESSION_EXPIRED_QUERY_PARAM) === '1';
}

export function signInSessionExpiredQueryParams(): Record<string, string> {
  return { [SESSION_EXPIRED_QUERY_PARAM]: '1' };
}
