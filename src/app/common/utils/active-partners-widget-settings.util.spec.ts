import {
  normalizeActivePartnersWidgetSetting,
  resolveActivePartnersSchoolYear,
  validateActivePartnersWidgetSettingInput,
  hasActivePartnersWidgetSettingValidationErrors,
  DEFAULT_MIN_ACTIVE_PARTNER_AMOUNT,
  DEFAULT_ACTIVE_PARTNERS_WIDGET_SETTING,
} from './active-partners-widget-settings.util';

describe('active-partners-widget-settings.util', () => {
  describe('normalizeActivePartnersWidgetSetting', () => {
    it('returns defaults for invalid input', () => {
      expect(normalizeActivePartnersWidgetSetting(null)).toEqual(
        DEFAULT_ACTIVE_PARTNERS_WIDGET_SETTING,
      );
    });

    it('normalizes valid settings', () => {
      expect(
        normalizeActivePartnersWidgetSetting({
          minEngagementAmount: 250,
          defaultSchoolYear: '2024-2025',
        }),
      ).toEqual({
        minEngagementAmount: 250,
        defaultSchoolYear: '2024-2025',
        excludedTagKeys: [],
        excludedSectors: [],
        excludePreInstalledStakeholders: true,
        rotateIntervalSeconds: 6,
      });
    });

    it('normalizes exclusion lists', () => {
      expect(
        normalizeActivePartnersWidgetSetting({
          minEngagementAmount: 100,
          defaultSchoolYear: null,
          excludedTagKeys: ['excluded-from-active-partners', 'bad tag'],
          excludedSectors: ['Private Sector', ' Private Sector '],
        }),
      ).toEqual({
        minEngagementAmount: 100,
        defaultSchoolYear: null,
        excludedTagKeys: ['excluded-from-active-partners'],
        excludedSectors: ['Private Sector'],
        excludePreInstalledStakeholders: true,
        rotateIntervalSeconds: 6,
      });
    });

    it('allows disabling pre-installed stakeholder exclusion', () => {
      expect(
        normalizeActivePartnersWidgetSetting({
          minEngagementAmount: 100,
          defaultSchoolYear: null,
          excludePreInstalledStakeholders: false,
        }).excludePreInstalledStakeholders,
      ).toBe(false);
    });

    it('normalizes rotate interval seconds', () => {
      expect(
        normalizeActivePartnersWidgetSetting({
          minEngagementAmount: 100,
          defaultSchoolYear: null,
          rotateIntervalSeconds: 45,
        }).rotateIntervalSeconds,
      ).toBe(45);
    });

    it('rejects invalid school year and negative amounts', () => {
      expect(
        normalizeActivePartnersWidgetSetting({
          minEngagementAmount: -5,
          defaultSchoolYear: 'invalid',
        }),
      ).toEqual({
        minEngagementAmount: DEFAULT_MIN_ACTIVE_PARTNER_AMOUNT,
        defaultSchoolYear: null,
        excludedTagKeys: [],
        excludedSectors: [],
        excludePreInstalledStakeholders: true,
        rotateIntervalSeconds: 6,
      });
    });
  });

  describe('validateActivePartnersWidgetSettingInput', () => {
    it('flags negative minimum engagement amount', () => {
      const errors = validateActivePartnersWidgetSettingInput({
        minEngagementAmount: -1,
        defaultSchoolYear: null,
        excludedTagKeys: [],
        excludedSectors: [],
        excludePreInstalledStakeholders: true,
        rotateIntervalSeconds: 6,
      });

      expect(errors.minEngagementAmount).toContain('negative');
      expect(hasActivePartnersWidgetSettingValidationErrors(errors)).toBe(true);
    });

    it('flags invalid school year format', () => {
      const errors = validateActivePartnersWidgetSettingInput({
        minEngagementAmount: 100,
        defaultSchoolYear: 'invalid',
        excludedTagKeys: [],
        excludedSectors: [],
        excludePreInstalledStakeholders: true,
        rotateIntervalSeconds: 6,
      });

      expect(errors.defaultSchoolYear).toContain('YYYY-YYYY');
    });

    it('flags rotation interval below minimum', () => {
      const errors = validateActivePartnersWidgetSettingInput({
        minEngagementAmount: 100,
        defaultSchoolYear: null,
        excludedTagKeys: [],
        excludedSectors: [],
        excludePreInstalledStakeholders: true,
        rotateIntervalSeconds: 2,
      });

      expect(errors.rotateIntervalSeconds).toContain('at least 3');
    });

    it('flags rotation interval above maximum', () => {
      const errors = validateActivePartnersWidgetSettingInput({
        minEngagementAmount: 100,
        defaultSchoolYear: null,
        excludedTagKeys: [],
        excludedSectors: [],
        excludePreInstalledStakeholders: true,
        rotateIntervalSeconds: 301,
      });

      expect(errors.rotateIntervalSeconds).toContain('cannot exceed 300');
    });

    it('returns no errors for valid input', () => {
      const errors = validateActivePartnersWidgetSettingInput(
        DEFAULT_ACTIVE_PARTNERS_WIDGET_SETTING,
      );

      expect(hasActivePartnersWidgetSettingValidationErrors(errors)).toBe(false);
    });
  });

  describe('resolveActivePartnersSchoolYear', () => {
    const options = ['2023-2024', '2024-2025', '2025-2026'];

    it('uses resolvedDefaultSchoolYear when present in options', () => {
      expect(
        resolveActivePartnersSchoolYear(
          {
            minEngagementAmount: 100,
            defaultSchoolYear: null,
            excludedTagKeys: [],
            excludedSectors: [],
            excludePreInstalledStakeholders: true,
            rotateIntervalSeconds: 6,
            resolvedDefaultSchoolYear: '2024-2025',
          },
          options,
          '2025-2026',
        ),
      ).toBe('2024-2025');
    });

    it('falls back to current school year when configured year is unavailable', () => {
      expect(
        resolveActivePartnersSchoolYear(
          {
            minEngagementAmount: 100,
            defaultSchoolYear: '2099-2100',
            excludedTagKeys: [],
            excludedSectors: [],
            excludePreInstalledStakeholders: true,
            rotateIntervalSeconds: 6,
            resolvedDefaultSchoolYear: '2099-2100',
          },
          options,
          '2025-2026',
        ),
      ).toBe('2025-2026');
    });
  });
});
