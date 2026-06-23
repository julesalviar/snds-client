import {
  getRefreshBufferSeconds,
  REFRESH_BUFFER_MAX_SECONDS,
  REFRESH_BUFFER_MIN_SECONDS,
  shouldRefreshTokenSoon,
} from './auth-session.util';

describe('auth-session.util', () => {
  const now = 1_700_000_000;

  it('clamps refresh buffer between 5 and 30 minutes', () => {
    expect(getRefreshBufferSeconds({ iat: now, exp: now + 15 * 60 })).toBe(
      REFRESH_BUFFER_MIN_SECONDS,
    );
    expect(getRefreshBufferSeconds({ iat: now, exp: now + 12 * 60 * 60 })).toBe(
      REFRESH_BUFFER_MAX_SECONDS,
    );
  });

  it('uses 5% of token lifetime inside the clamp range', () => {
    expect(getRefreshBufferSeconds({ iat: now, exp: now + 2 * 60 * 60 })).toBe(
      6 * 60,
    );
  });

  it('detects when a token is inside the refresh window', () => {
    const payload = { iat: now, exp: now + 12 * 60 * 60 };
    expect(shouldRefreshTokenSoon(payload, now + 12 * 60 * 60 - 20 * 60)).toBe(
      true,
    );
    expect(shouldRefreshTokenSoon(payload, now + 60 * 60)).toBe(false);
  });
});
