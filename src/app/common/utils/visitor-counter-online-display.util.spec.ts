import { OnlineVisitorUserDto } from '../services/visitor-count.service';
import { buildOnlineUsersDisplay } from './visitor-counter-online-display.util';

function user(id: string, name: string, sessionCount = 1): OnlineVisitorUserDto {
  return {
    userId: id,
    displayName: name,
    activeRole: 'divisionAdmin',
    lastSeen: '2026-01-01T00:00:00.000Z',
    sessionCount,
  };
}

describe('visitor-counter-online-display.util', () => {
  describe('buildOnlineUsersDisplay', () => {
    it('uses signed-in sessions plus guest sessions as total', () => {
      const result = buildOnlineUsersDisplay({
        activeCount: 12,
        signedInUserCount: 2,
        anonymousSessionCount: 5,
        users: [user('1', 'Alice', 2)],
      });

      expect(result.total).toBe(7);
      expect(result.signedInUserCount).toBe(2);
    });

    it('matches collection totals when one user has multiple sessions', () => {
      const result = buildOnlineUsersDisplay({
        activeCount: 3,
        signedInUserCount: 2,
        anonymousSessionCount: 1,
        users: [user('6821b29f29248c3aeab05415', 'Alice Admin', 2)],
      });

      expect(result.total).toBe(3);
      expect(result.signedInUserCount).toBe(2);
      expect(result.anonymousSessionCount).toBe(1);
      expect(result.users.length).toBe(1);
    });

    it('includes anonymousSessionCount in the display', () => {
      const result = buildOnlineUsersDisplay({
        activeCount: 3,
        signedInUserCount: 0,
        anonymousSessionCount: 2,
        users: [],
      });

      expect(result.anonymousSessionCount).toBe(2);
      expect(result.users).toEqual([]);
    });

    it('reserves one slot for the guest chip when counting overflow', () => {
      const namedUsers = Array.from({ length: 12 }, (_, index) =>
        user(String(index), `User ${index}`),
      );

      const result = buildOnlineUsersDisplay(
        {
          activeCount: 20,
          signedInUserCount: 12,
          anonymousSessionCount: 3,
          users: namedUsers,
        },
        10,
      );

      expect(result.total).toBe(15);
      expect(result.anonymousSessionCount).toBe(3);
      expect(result.users.length).toBe(8);
      expect(result.overflowCount).toBe(4);
    });

    it('shows all named users when they fit alongside the guest chip', () => {
      const result = buildOnlineUsersDisplay(
        {
          activeCount: 4,
          signedInUserCount: 2,
          anonymousSessionCount: 1,
          users: [user('1', 'Alice'), user('2', 'Bob')],
        },
        10,
      );

      expect(result.users.length).toBe(2);
      expect(result.overflowCount).toBe(0);
    });
  });
});
