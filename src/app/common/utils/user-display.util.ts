export const SYSTEM_REFERENCE_EMAIL_DOMAIN = 'mysnds.com';

export type UserEmailDisplaySource = {
  email?: string | null;
  created?: string;
  isReferenceAccount?: boolean;
} | null | undefined;

export function isMysndsEmail(email: string | null | undefined): boolean {
  const trimmed = email?.trim();
  if (!trimmed) {
    return false;
  }

  const at = trimmed.lastIndexOf('@');
  if (at < 0) {
    return false;
  }

  return trimmed.slice(at + 1).toLowerCase() === SYSTEM_REFERENCE_EMAIL_DOMAIN;
}

export function isSystemCreatedUser(user: UserEmailDisplaySource): boolean {
  if (!user) {
    return false;
  }
  return user.created === 'system' || user.isReferenceAccount === true;
}

export function shouldHideUserEmail(user: UserEmailDisplaySource): boolean {
  if (!user) {
    return false;
  }
  return isSystemCreatedUser(user) && isMysndsEmail(user.email);
}

export function formatUserEmailForDisplay(
  user: UserEmailDisplaySource,
  emptyValue = '—',
): string {
  if (!user || shouldHideUserEmail(user)) {
    return emptyValue;
  }

  const trimmed = user.email?.trim();
  return trimmed || emptyValue;
}

export function hasDisplayableUserEmail(user: UserEmailDisplaySource): boolean {
  if (!user || shouldHideUserEmail(user)) {
    return false;
  }

  return !!user.email?.trim();
}
