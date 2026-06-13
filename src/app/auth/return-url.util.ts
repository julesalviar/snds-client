export function isSafeReturnUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }
  const trimmed = url.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return false;
  }
  return !trimmed.includes('://');
}

export function sanitizeReturnUrl(
  url: string | null | undefined,
  fallback = '/home',
): string {
  return isSafeReturnUrl(url) ? url!.trim() : fallback;
}
