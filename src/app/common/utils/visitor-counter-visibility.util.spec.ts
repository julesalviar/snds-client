import { UserType } from '../../registration/user-type.enum';
import { canShowHomeVisitorCounterWidget } from './visitor-counter-visibility.util';

describe('visitor-counter-visibility.util', () => {
  describe('canShowHomeVisitorCounterWidget', () => {
    it('returns true for allowed roles', () => {
      expect(canShowHomeVisitorCounterWidget(UserType.DivisionAdmin)).toBe(true);
      expect(canShowHomeVisitorCounterWidget(UserType.OfficeAdmin)).toBe(true);
      expect(canShowHomeVisitorCounterWidget(UserType.SystemAdmin)).toBe(true);
      expect(canShowHomeVisitorCounterWidget(UserType.StakeHolder)).toBe(true);
    });

    it('returns false for excluded roles', () => {
      expect(canShowHomeVisitorCounterWidget(UserType.SchoolAdmin)).toBe(false);
      expect(canShowHomeVisitorCounterWidget(UserType.ProgramHolder)).toBe(false);
      expect(canShowHomeVisitorCounterWidget(UserType.OfficeAdminAssistant)).toBe(
        false,
      );
      expect(canShowHomeVisitorCounterWidget(UserType.System)).toBe(false);
      expect(canShowHomeVisitorCounterWidget(undefined)).toBe(false);
    });
  });
});
