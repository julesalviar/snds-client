export const USER_TAGS_REF_DATA_KEY = 'user-tags';

export interface UserTagRef {
  key: string;
  label: string;
}

export function parseUserTagsRefData(value: unknown): UserTagRef[] {
  if (value == null || !Array.isArray(value)) return [];

  const result: UserTagRef[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const obj = item as Record<string, unknown>;
    const key = typeof obj['key'] === 'string' ? obj['key'].trim() : '';
    const label = typeof obj['label'] === 'string' ? obj['label'].trim() : '';
    if (!key || !label) continue;
    result.push({ key, label });
  }
  return result;
}

export function getUserTagLabelMap(value: unknown): Map<string, string> {
  const map = new Map<string, string>();
  for (const { key, label } of parseUserTagsRefData(value)) {
    map.set(key, label);
  }
  return map;
}

export function getUserTagLabel(
  key: string,
  labelMap: Map<string, string>,
): string {
  return labelMap.get(key) ?? key;
}
