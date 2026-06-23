import {
  isSessionExpiredRedirect,
  SESSION_EXPIRED_QUERY_PARAM,
  signInSessionExpiredQueryParams,
} from './sign-in-session.util';

describe('sign-in-session.util', () => {
  it('builds session expired query params', () => {
    expect(signInSessionExpiredQueryParams()).toEqual({
      [SESSION_EXPIRED_QUERY_PARAM]: '1',
    });
  });

  it('detects session expired redirect', () => {
    expect(
      isSessionExpiredRedirect({
        get: (name) => (name === SESSION_EXPIRED_QUERY_PARAM ? '1' : null),
      }),
    ).toBe(true);
    expect(
      isSessionExpiredRedirect({
        get: () => null,
      }),
    ).toBe(false);
  });
});
