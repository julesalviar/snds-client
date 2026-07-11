const NON_LETTER_REGEX = /[^\p{L}]/gu;

function lettersOnly(token: string): string {
  return token.replace(NON_LETTER_REGEX, '');
}

/**
 * Builds display initials from a name or other text. Only letters are used; symbols and digits are excluded.
 * Multi-word: first letter of the first word + first letter of the last word.
 * Single word: first two letters.
 */
export function getDisplayInitials(
  text: string | null | undefined,
  fallback = '?',
): string {
  const trimmed = text?.trim();
  if (!trimmed) {
    return fallback;
  }

  const letterWords = trimmed
    .split(/\s+/)
    .filter(Boolean)
    .map(lettersOnly)
    .filter((word) => word.length > 0);

  if (letterWords.length === 0) {
    return fallback;
  }

  if (letterWords.length === 1) {
    return letterWords[0].slice(0, 2).toUpperCase();
  }

  const firstInitial = letterWords[0][0];
  const lastInitial = letterWords[letterWords.length - 1][0];
  return `${firstInitial}${lastInitial}`.toUpperCase();
}

export function maskContactNumber(contactNumber: string): string {
  if (!contactNumber) return '';

  const cleanNumber = contactNumber.replace(/\s/g, '');

  const isTooShort = (visibleLength: number) => cleanNumber.length <= visibleLength;
  const maskRest = (visiblePart: string) =>
    visiblePart + '*'.repeat(cleanNumber.length - visiblePart.length);

  if (cleanNumber.startsWith('+')) {
    const areaCodeLength = getAreaCodeLength(cleanNumber);
    const digitsAfterAreaCode = 2;
    const totalVisibleLength = areaCodeLength + digitsAfterAreaCode;

    if (isTooShort(totalVisibleLength)) return contactNumber;

    const areaCode = cleanNumber.substring(0, areaCodeLength);
    const nextDigits = cleanNumber.substring(areaCodeLength, totalVisibleLength);
    return `${areaCode} ${nextDigits} *** ****`;
  }

  if (cleanNumber.startsWith('0')) {
    if (isTooShort(4)) return contactNumber;
    return maskRest(cleanNumber.substring(0, 4));
  }

  if (isTooShort(2)) return contactNumber;
  return maskRest(cleanNumber.substring(0, 2));
}

function getAreaCodeLength(number: string): number {
  let length = 1;
  while (length < number.length && /\d/.test(number[length]) && length <= 3) {
    length++;
  }
  return length;
}
