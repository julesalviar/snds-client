import { UserRefValue } from './ppa-plan-user-display.util';

/** Normalize API/form value to user id string. */
export function normalizeUserIdFromRef(value: UserRefValue): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && '_id' in value) {
    return value._id ?? '';
  }
  return '';
}

/** Stakeholder field for create/update payload (omit on create when empty; null clears on edit). */
export function resolveStakeholderUserIdForSave(
  stakeholderId: string,
  isEdit: boolean,
): { stakeholderUserId?: string | null } {
  if (stakeholderId) return { stakeholderUserId: stakeholderId };
  if (isEdit) return { stakeholderUserId: null };
  return {};
}

/** Load/edit: keep stored assignee id; fall back to current user only when missing. */
export function resolveAssignedUserIdForFormLoad(
  value: UserRefValue,
  currentUserId: string | null | undefined,
): string {
  const id = normalizeUserIdFromRef(value);
  if (!id) return currentUserId ?? '';
  return id;
}

/** Save: send assignee id per role/mode; omit when backend owns assignee resolution. */
export function resolveAssignedUserIdForSave(
  raw: UserRefValue,
  isEdit: boolean,
  currentUserId: string | null | undefined,
  activeRole?: string,
): string | undefined {
  if (activeRole === 'programHolder') {
    return undefined;
  }
  if (
    isEdit &&
    (activeRole === 'officeAdmin' || activeRole === 'systemAdmin')
  ) {
    return undefined;
  }
  const id = normalizeUserIdFromRef(raw);
  if (id) return id;
  if (!isEdit) return currentUserId || undefined;
  return undefined;
}

/** Route segments for PPA plan list after cancel/success (non-dialog mode). */
export function getPpaPlansListRoute(activeRole: string): string[] {
  if (
    activeRole === 'officeAdmin' ||
    activeRole === 'officeAdminAssistant'
  ) {
    return ['/office-admin', 'ppa-plans'];
  }
  return ['/program-holder', 'ppa-plans'];
}

/** Duplicate action is program holder only and requires edit permission. */
export function canDuplicatePpaPlan(
  activeRole: string,
  canEdit: boolean,
): boolean {
  return activeRole === 'programHolder' && canEdit;
}

/** Report URLs for create/update payload (omit on create when empty; [] clears on edit). */
export function resolveReportUrlsForSave(
  reportUrls: string[],
  isEdit: boolean,
): { reportUrls?: string[] } {
  if (reportUrls.length > 0) return { reportUrls };
  if (isEdit) return { reportUrls: [] };
  return {};
}

/** Timeliness for create/update payload (omit on create when empty; null clears on edit). */
export function resolveTimelinessForSave(
  timeliness: string | null | undefined,
  isEdit: boolean,
): { timeliness?: string | null } {
  const value = typeof timeliness === 'string' ? timeliness.trim() : '';
  if (value) return { timeliness: value };
  if (isEdit) return { timeliness: null };
  return {};
}

/** Form toggle: hide from public when stored isPublic is explicitly false. */
export function toHideFromPublic(
  isPublic: boolean | null | undefined,
): boolean {
  return isPublic === false;
}

/** Payload isPublic from the hide-from-public toggle (off means public). */
export function toIsPublicFromHideToggle(
  hideFromPublic: boolean | null | undefined,
): boolean {
  return hideFromPublic !== true;
}
