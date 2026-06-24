import { OnlineVisitorUserDto } from '../services/visitor-count.service';
import { buildOnlineUsersDisplay } from './visitor-counter-online-display.util';

function user(id: string, name: string): OnlineVisitorUserDto {
  return {
    userId: id,
    displayName: name,
    activeRole: 'divisionAdmin',
    lastSeen: '2026-01-01T00:00:00.000Z',
  };
}

describe('visitor-counter-online-display.util', () => {
  describe('buildOnlineUsersDisplay', () => {
    it('uses activeCount as total', () => {
      const result = buildOnlineUsersDisplay({
        activeCount: 12,
        anonymousSessionCount: 5,
        users: [user('1', 'Alice')],
      });

      expect(result.total).toBe(12);
    });

    it('includes anonymousSessionCount in the display', () => {
      const result = buildOnlineUsersDisplay({
        activeCount: 3,
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
          anonymousSessionCount: 3,
          users: namedUsers,
        },
        10,
      );

      expect(result.anonymousSessionCount).toBe(3);
      expect(result.users.length).toBe(8);
      expect(result.overflowCount).toBe(4);
    });

    it('shows all named users when they fit alongside the guest chip', () => {
      const result = buildOnlineUsersDisplay(
        {
          activeCount: 4,
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
