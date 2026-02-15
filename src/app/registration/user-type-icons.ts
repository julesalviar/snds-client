import { UserType } from './user-type.enum';

/** Material icon name per UserType for role display (e.g. roles column, switch role dialog). */
export const ROLE_ICONS: Partial<Record<UserType, string>> = {
  [UserType.StakeHolder]: 'people',
  [UserType.SchoolAdmin]: 'school',
  [UserType.DivisionAdmin]: 'domain',
  [UserType.OfficeAdmin]: 'account_balance',
  [UserType.SystemAdmin]: 'admin_panel_settings',
  [UserType.System]: 'dns',
  [UserType.ProgramHolder]: 'assignment',
};

/** Color per UserType for role icon display. */
export const ROLE_COLORS: Partial<Record<UserType, string>> = {
  [UserType.StakeHolder]: '#1976d2',
  [UserType.SchoolAdmin]: '#2e7d32',
  [UserType.DivisionAdmin]: '#7b1fa2',
  [UserType.OfficeAdmin]: '#00838f',
  [UserType.SystemAdmin]: '#c62828',
  [UserType.System]: '#616161',
  [UserType.ProgramHolder]: '#ef6c00',
};

/** Returns the Material icon name for a role string; falls back to 'person' for unknown roles. */
export function getRoleIcon(role: string): string {
  return ROLE_ICONS[role as UserType] ?? 'person';
}

/** Returns the color for a role string; falls back to default grey for unknown roles. */
export function getRoleColor(role: string): string {
  return ROLE_COLORS[role as UserType] ?? '#757575';
}
