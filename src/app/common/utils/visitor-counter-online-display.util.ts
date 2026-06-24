import { OnlineVisitorUserDto } from '../services/visitor-count.service';

export interface OnlineUsersSnapshot {
  activeCount: number;
  anonymousSessionCount: number;
  users: OnlineVisitorUserDto[];
}

export interface OnlineUsersDisplay {
  total: number;
  users: OnlineVisitorUserDto[];
  anonymousSessionCount: number;
  overflowCount: number;
}

export function buildOnlineUsersDisplay(
  snapshot: OnlineUsersSnapshot,
  maxSlots = 10,
): OnlineUsersDisplay {
  const { users, activeCount, anonymousSessionCount } = snapshot;
  const guestSlot = anonymousSessionCount > 0 ? 1 : 0;
  const slotsForNamed = maxSlots - guestSlot;

  if (users.length <= slotsForNamed) {
    return {
      total: activeCount,
      users,
      anonymousSessionCount,
      overflowCount: 0,
    };
  }

  const overflowSlotReserved = slotsForNamed > 1 ? 1 : 0;
  const maxVisibleUsers = slotsForNamed - overflowSlotReserved;

  return {
    total: activeCount,
    users: users.slice(0, maxVisibleUsers),
    anonymousSessionCount,
    overflowCount: users.length - maxVisibleUsers,
  };
}
