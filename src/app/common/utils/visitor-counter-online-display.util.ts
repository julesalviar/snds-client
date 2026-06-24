import { OnlineVisitorUserDto } from '../services/visitor-count.service';

export interface OnlineUsersSnapshot {
  activeCount: number;
  signedInUserCount: number;
  anonymousSessionCount: number;
  users: OnlineVisitorUserDto[];
}

export interface OnlineUsersDisplay {
  total: number;
  signedInUserCount: number;
  users: OnlineVisitorUserDto[];
  anonymousSessionCount: number;
  overflowCount: number;
}

function buildOnlineTotal(
  signedInUserCount: number,
  anonymousSessionCount: number,
): number {
  return signedInUserCount + anonymousSessionCount;
}

export function buildOnlineUsersDisplay(
  snapshot: OnlineUsersSnapshot,
  maxSlots = 10,
): OnlineUsersDisplay {
  const { users, anonymousSessionCount } = snapshot;
  const signedInUserCount =
    snapshot.signedInUserCount ??
    users.reduce((sum, user) => sum + (user.sessionCount ?? 1), 0);
  const total = buildOnlineTotal(signedInUserCount, anonymousSessionCount);
  const guestSlot = anonymousSessionCount > 0 ? 1 : 0;
  const slotsForNamed = maxSlots - guestSlot;

  if (users.length <= slotsForNamed) {
    return {
      total,
      signedInUserCount,
      users,
      anonymousSessionCount,
      overflowCount: 0,
    };
  }

  const overflowSlotReserved = slotsForNamed > 1 ? 1 : 0;
  const maxVisibleUsers = slotsForNamed - overflowSlotReserved;

  return {
    total,
    signedInUserCount,
    users: users.slice(0, maxVisibleUsers),
    anonymousSessionCount,
    overflowCount: users.length - maxVisibleUsers,
  };
}
