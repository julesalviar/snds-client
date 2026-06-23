/** 5% of token lifetime; clamped below to avoid excessive /auth/refresh calls. */
export const REFRESH_BUFFER_LIFETIME_RATIO = 0.05;
export const REFRESH_BUFFER_MIN_SECONDS = 5 * 60;
export const REFRESH_BUFFER_MAX_SECONDS = 30 * 60;
/** Minimum time between proactive refreshes (tab focus, timers). */
export const MIN_REFRESH_INTERVAL_MS = 30 * 60 * 1000;

export function getRefreshBufferSeconds(payload: {
  iat?: number;
  exp?: number;
}): number {
  const { iat, exp } = payload;
  if (iat == null || exp == null || exp <= iat) {
    return REFRESH_BUFFER_MIN_SECONDS;
  }

  const lifetime = exp - iat;
  const buffer = Math.floor(lifetime * REFRESH_BUFFER_LIFETIME_RATIO);
  return Math.min(
    Math.max(buffer, REFRESH_BUFFER_MIN_SECONDS),
    REFRESH_BUFFER_MAX_SECONDS,
  );
}

export function shouldRefreshTokenSoon(
  payload: { iat?: number; exp?: number } | null,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  if (!payload?.exp) {
    return true;
  }
  if (payload.exp <= nowSeconds) {
    return true;
  }
  return payload.exp - nowSeconds <= getRefreshBufferSeconds(payload);
}
