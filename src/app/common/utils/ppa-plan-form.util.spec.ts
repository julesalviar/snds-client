import {
  canDuplicatePpaPlan,
  getPpaPlansListRoute,
  normalizeUserIdFromRef,
  resolveAssignedUserIdForFormLoad,
  resolveAssignedUserIdForSave,
  resolveReportUrlsForSave,
  resolveStakeholderUserIdForSave,
  resolveTimelinessForSave,
  toHideFromPublic,
  toIsPublicFromHideToggle,
} from './ppa-plan-form.util';

describe('ppa-plan-form.util', () => {
  describe('normalizeUserIdFromRef', () => {
    it('returns empty string for null/undefined', () => {
      expect(normalizeUserIdFromRef(null)).toBe('');
      expect(normalizeUserIdFromRef(undefined)).toBe('');
    });

    it('returns string id as-is', () => {
      expect(normalizeUserIdFromRef('507f1f77bcf86cd799439011')).toBe(
        '507f1f77bcf86cd799439011',
      );
    });

    it('extracts _id from populated object', () => {
      expect(normalizeUserIdFromRef({ _id: 'abc', name: 'Jane' })).toBe('abc');
    });
  });

  describe('resolveStakeholderUserIdForSave', () => {
    it('includes id when stakeholder is selected', () => {
      expect(resolveStakeholderUserIdForSave('507f1f77bcf86cd799439011', false)).toEqual({
        stakeholderUserId: '507f1f77bcf86cd799439011',
      });
    });

    it('omits field on create when empty', () => {
      expect(resolveStakeholderUserIdForSave('', false)).toEqual({});
    });

    it('sends null on edit when cleared', () => {
      expect(resolveStakeholderUserIdForSave('', true)).toEqual({
        stakeholderUserId: null,
      });
    });
  });

  describe('resolveAssignedUserIdForFormLoad', () => {
    it('keeps unpopulated string assignee id', () => {
      expect(
        resolveAssignedUserIdForFormLoad(
          '507f1f77bcf86cd799439011',
          'current-user',
        ),
      ).toBe('507f1f77bcf86cd799439011');
    });

    it('keeps populated object assignee id', () => {
      expect(
        resolveAssignedUserIdForFormLoad(
          { _id: 'other-user', name: 'Other' },
          'current-user',
        ),
      ).toBe('other-user');
    });

    it('keeps orphan ObjectId assignee id on form load without overwriting', () => {
      expect(
        resolveAssignedUserIdForFormLoad(
          '507f1f77bcf86cd799439011',
          'current-user',
        ),
      ).toBe('507f1f77bcf86cd799439011');
    });

    it('falls back to current user when assignee is missing', () => {
      expect(resolveAssignedUserIdForFormLoad(null, 'current-user')).toBe(
        'current-user',
      );
      expect(resolveAssignedUserIdForFormLoad('', 'current-user')).toBe(
        'current-user',
      );
    });
  });

  describe('resolveAssignedUserIdForSave', () => {
    it('returns form assignee when set for office admin create', () => {
      expect(
        resolveAssignedUserIdForSave(
          'assignee-1',
          false,
          'current-user',
          'officeAdmin',
        ),
      ).toBe('assignee-1');
    });

    it('omits assignee for program holder create even when form has value', () => {
      expect(
        resolveAssignedUserIdForSave(
          'assignee-1',
          false,
          'current-user',
          'programHolder',
        ),
      ).toBeUndefined();
    });

    it('omits assignee for program holder edit even when form has value', () => {
      expect(
        resolveAssignedUserIdForSave(
          'assignee-1',
          true,
          'current-user',
          'programHolder',
        ),
      ).toBeUndefined();
    });

    it('omits assignee for office admin edit when form has value', () => {
      expect(
        resolveAssignedUserIdForSave(
          'assignee-1',
          true,
          'current-user',
          'officeAdmin',
        ),
      ).toBeUndefined();
    });

    it('omits assignee for system admin edit when form has value', () => {
      expect(
        resolveAssignedUserIdForSave(
          'assignee-1',
          true,
          'current-user',
          'systemAdmin',
        ),
      ).toBeUndefined();
    });

    it('falls back to current user on office admin create when empty', () => {
      expect(
        resolveAssignedUserIdForSave('', false, 'current-user', 'officeAdmin'),
      ).toBe('current-user');
    });

    it('includes assignee for system admin create when set', () => {
      expect(
        resolveAssignedUserIdForSave(
          'assignee-1',
          false,
          'current-user',
          'systemAdmin',
        ),
      ).toBe('assignee-1');
    });

    it('omits assignee on edit when empty and no role override', () => {
      expect(
        resolveAssignedUserIdForSave('', true, 'current-user'),
      ).toBeUndefined();
    });
  });

  describe('getPpaPlansListRoute', () => {
    it('routes program holder to program-holder list', () => {
      expect(getPpaPlansListRoute('programHolder')).toEqual([
        '/program-holder',
        'ppa-plans',
      ]);
    });

    it('routes office roles to office-admin list', () => {
      expect(getPpaPlansListRoute('officeAdmin')).toEqual([
        '/office-admin',
        'ppa-plans',
      ]);
      expect(getPpaPlansListRoute('officeAdminAssistant')).toEqual([
        '/office-admin',
        'ppa-plans',
      ]);
    });
  });

  describe('canDuplicatePpaPlan', () => {
    it('allows duplicate for program holder with edit permission', () => {
      expect(canDuplicatePpaPlan('programHolder', true)).toBe(true);
    });

    it('denies duplicate for office admin', () => {
      expect(canDuplicatePpaPlan('officeAdmin', true)).toBe(false);
    });

    it('denies duplicate when cannot edit', () => {
      expect(canDuplicatePpaPlan('programHolder', false)).toBe(false);
    });
  });

  describe('resolveReportUrlsForSave', () => {
    it('includes urls when present', () => {
      expect(resolveReportUrlsForSave(['https://example.com/r.pdf'], false)).toEqual({
        reportUrls: ['https://example.com/r.pdf'],
      });
    });

    it('omits field on create when empty', () => {
      expect(resolveReportUrlsForSave([], false)).toEqual({});
    });

    it('sends empty array on edit when cleared so the report does not come back', () => {
      expect(resolveReportUrlsForSave([], true)).toEqual({ reportUrls: [] });
    });
  });

  describe('resolveTimelinessForSave', () => {
    it('includes selected value', () => {
      expect(resolveTimelinessForSave('On-time', false)).toEqual({
        timeliness: 'On-time',
      });
      expect(resolveTimelinessForSave('Delayed', true)).toEqual({
        timeliness: 'Delayed',
      });
    });

    it('omits field on create when empty', () => {
      expect(resolveTimelinessForSave('', false)).toEqual({});
      expect(resolveTimelinessForSave(null, false)).toEqual({});
    });

    it('sends null on edit when cleared so the previous value does not come back', () => {
      expect(resolveTimelinessForSave('', true)).toEqual({ timeliness: null });
      expect(resolveTimelinessForSave('   ', true)).toEqual({ timeliness: null });
    });
  });

  describe('toHideFromPublic', () => {
    it('is on only when isPublic is explicitly false', () => {
      expect(toHideFromPublic(false)).toBe(true);
      expect(toHideFromPublic(true)).toBe(false);
      expect(toHideFromPublic(undefined)).toBe(false);
      expect(toHideFromPublic(null)).toBe(false);
    });
  });

  describe('toIsPublicFromHideToggle', () => {
    it('sends false when hide is on and true otherwise', () => {
      expect(toIsPublicFromHideToggle(true)).toBe(false);
      expect(toIsPublicFromHideToggle(false)).toBe(true);
      expect(toIsPublicFromHideToggle(undefined)).toBe(true);
    });
  });
});
