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
