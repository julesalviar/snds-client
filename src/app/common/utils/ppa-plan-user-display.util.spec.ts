import {
  canActOnPpaPlan,
  formatUserRefDisplay,
  resolveAssignedUserIdFromPlan,
} from './ppa-plan-user-display.util';

describe('ppa-plan-user-display.util', () => {
  describe('formatUserRefDisplay', () => {
    it('returns em dash for null/undefined', () => {
      expect(formatUserRefDisplay(null)).toBe('—');
      expect(formatUserRefDisplay(undefined)).toBe('—');
    });

    it('returns Unknown user for raw ObjectId string', () => {
      expect(formatUserRefDisplay('507f1f77bcf86cd799439011')).toBe(
        'Unknown user',
      );
    });

    it('returns name from populated object', () => {
      expect(formatUserRefDisplay({ _id: '1', name: 'Jane' })).toBe('Jane');
    });

    it('returns Unknown user for unpopulated object without display fields', () => {
      expect(formatUserRefDisplay({ _id: '507f1f77bcf86cd799439011' })).toBe(
        'Unknown user',
      );
    });
  });

  describe('canActOnPpaPlan', () => {
    it('allows office admin on any plan', () => {
      expect(canActOnPpaPlan('officeAdmin', 'a', 'b')).toBe(true);
    });

    it('allows program holder only when assigned', () => {
      expect(canActOnPpaPlan('programHolder', 'u1', 'u1')).toBe(true);
      expect(canActOnPpaPlan('programHolder', 'u1', 'u2')).toBe(false);
    });

    it('denies program holder when assignee is orphan id string', () => {
      expect(
        canActOnPpaPlan('programHolder', 'u1', '507f1f77bcf86cd799439011'),
      ).toBe(false);
    });

    it('denies other roles', () => {
      expect(canActOnPpaPlan('divisionAdmin', 'u1', 'u1')).toBe(false);
      expect(canActOnPpaPlan('stakeholder', 'u1', 'u1')).toBe(false);
    });
  });

  describe('resolveAssignedUserIdFromPlan', () => {
    it('resolves string and object ids', () => {
      expect(resolveAssignedUserIdFromPlan('abc')).toBe('abc');
      expect(resolveAssignedUserIdFromPlan({ _id: 'xyz' })).toBe('xyz');
    });

    it('returns null for empty values', () => {
      expect(resolveAssignedUserIdFromPlan(null)).toBeNull();
      expect(resolveAssignedUserIdFromPlan('')).toBeNull();
      expect(resolveAssignedUserIdFromPlan({ _id: '' })).toBeNull();
    });
  });
});
