import { UserType } from './user-type.enum';

/** Material icon name per UserType for role display (e.g. roles column, switch role dialog). */
export const ROLE_ICONS: Partial<Record<UserType, string>> = {
  [UserType.StakeHolder]: 'people',
  [UserType.SchoolAdmin]: 'school',
  [UserType.DivisionAdmin]: 'domain',
  [UserType.SystemAdmin]: 'admin_panel_settings',
  [UserType.System]: 'dns',
  [UserType.ProgramHolder]: 'business_center',
};

/** Returns the Material icon name for a role string; falls back to 'person' for unknown roles. */
export function getRoleIcon(role: string): string {
  return ROLE_ICONS[role as UserType] ?? 'person';
}
