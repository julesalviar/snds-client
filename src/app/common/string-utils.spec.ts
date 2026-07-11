import { getDisplayInitials } from './string-utils';

describe('getDisplayInitials', () => {
  it('returns first and last word initials for multi-word names', () => {
    expect(getDisplayInitials('John Doe')).toBe('JD');
    expect(getDisplayInitials('Mary Jane Watson')).toBe('MW');
  });

  it('returns first two letters for single-word names', () => {
    expect(getDisplayInitials('John')).toBe('JO');
    expect(getDisplayInitials('Maria')).toBe('MA');
  });

  it('excludes symbols and digits from initials', () => {
    expect(getDisplayInitials("@#$ Symbol User")).toBe('SU');
    expect(getDisplayInitials('123 ABC')).toBe('AB');
    expect(getDisplayInitials('john.doe')).toBe('JO');
    expect(getDisplayInitials("O'Brien Patrick")).toBe('OP');
    expect(getDisplayInitials('Mary-Jane Watson')).toBe('MW');
  });

  it('returns fallback for empty or symbol-only text', () => {
    expect(getDisplayInitials('')).toBe('?');
    expect(getDisplayInitials('   ')).toBe('?');
    expect(getDisplayInitials('@#$')).toBe('?');
    expect(getDisplayInitials(null)).toBe('?');
    expect(getDisplayInitials(undefined)).toBe('?');
  });

  it('uses a custom fallback when provided', () => {
    expect(getDisplayInitials('', 'U')).toBe('U');
    expect(getDisplayInitials('@#$', 'U')).toBe('U');
  });
});
