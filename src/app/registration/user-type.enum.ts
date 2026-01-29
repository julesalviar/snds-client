export enum UserType {
  StakeHolder = 'stakeholder',
  SchoolAdmin = 'schoolAdmin',
  DivisionAdmin = 'divisionAdmin',
  SystemAdmin = 'systemAdmin',
  System = 'system',
}

/** Display label for each UserType (e.g. for tooltips, selects). */
export const USER_TYPE_LABELS: Record<UserType, string> = {
  [UserType.StakeHolder]: 'Stakeholder',
  [UserType.SchoolAdmin]: 'School Admin',
  [UserType.DivisionAdmin]: 'Division Admin',
  [UserType.SystemAdmin]: 'System Admin',
  [UserType.System]: 'System',
};

/** Returns the display label for a role string (e.g. from UserType); falls back to the raw value. */
export function getRoleLabel(role: string): string {
  return USER_TYPE_LABELS[role as UserType] ?? role;
}
