export const SECTOR_REF_DATA_KEY = 'sector';

export interface SectorCategory {
  category: string;
  options: string[];
}

/** Parses reference data key "sector": array of { "Sector Name": ["Subsector", ...] }. */
export function parseSectorReferenceData(value: unknown): SectorCategory[] {
  if (value == null || !Array.isArray(value)) return [];

  const result: SectorCategory[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    for (const [category, subsectors] of Object.entries(
      item as Record<string, unknown>,
    )) {
      const options = Array.isArray(subsectors)
        ? subsectors.filter((s): s is string => typeof s === 'string')
        : [];
      result.push({ category, options });
    }
  }
  return result;
}

export function getSectorNames(value: unknown): string[] {
  return parseSectorReferenceData(value).map((s) => s.category);
}

export function getSubsectorsForSector(
  value: unknown,
  sectorName: string,
): string[] {
  const entry = parseSectorReferenceData(value).find(
    (s) => s.category === sectorName,
  );
  return entry?.options ?? [];
}
