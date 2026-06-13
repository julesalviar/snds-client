import {
  isSafeReturnUrl,
  sanitizeReturnUrl,
} from './return-url.util';

describe('return-url.util', () => {
  it('accepts safe relative paths', () => {
    expect(isSafeReturnUrl('/home')).toBe(true);
    expect(sanitizeReturnUrl('/profile')).toBe('/profile');
  });

  it('rejects protocol-relative and absolute URLs', () => {
    expect(isSafeReturnUrl('//evil.com')).toBe(false);
    expect(isSafeReturnUrl('https://evil.com')).toBe(false);
    expect(sanitizeReturnUrl('//evil.com', '/home')).toBe('/home');
  });
});
