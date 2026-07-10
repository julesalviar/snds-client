/** 24-char hex MongoDB ObjectId string. */
const OBJECT_ID_PATTERN = /^[a-fA-F0-9]{24}$/;

export type UserRefValue =
  | string
  | { _id?: string; name?: string; userName?: string; email?: string }
  | null
  | undefined;

/** Display a populated user ref; raw ObjectId strings show as Unknown user. */
export function formatUserRefDisplay(value: UserRefValue): string {
  if (value == null) return '—';
  if (typeof value === 'object') {
    const u = value;
    return u.name || u.userName || u.email || 'Unknown user';
  }
  const trimmed = value.trim();
  if (!trimmed) return '—';
  if (OBJECT_ID_PATTERN.test(trimmed)) return 'Unknown user';
  return trimmed;
}

/** Whether the active role may edit/delete a plan (matches list canActOnPlan rules). */
export function canActOnPpaPlan(
  activeRole: string,
  currentUserId: string | null | undefined,
  assignedUserId: string | null | undefined,
): boolean {
  if (activeRole === 'officeAdmin') return true;
  if (activeRole === 'programHolder') {
    return !!(
      assignedUserId &&
      currentUserId &&
      assignedUserId === currentUserId
    );
  }
  return false;
}

export function resolveAssignedUserIdFromPlan(
  assignedUserId: UserRefValue,
): string | null {
  if (assignedUserId == null) return null;
  if (typeof assignedUserId === 'string') {
    const trimmed = assignedUserId.trim();
    return trimmed || null;
  }
  const id = assignedUserId._id;
  return id?.trim?.() || null;
}
