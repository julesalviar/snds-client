export function getSchoolYear(offset: number = 0): string {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0 = January

  // Determine the base school year
  const baseYear = currentMonth >= 5 ? currentYear : currentYear - 1;

  // Apply the optional offset
  const startYear = baseYear + offset;
  const endYear = startYear + 1;

  return `${startYear}-${endYear}`;
}
