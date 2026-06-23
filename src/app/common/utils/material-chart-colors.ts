/** Material Design palette (~500) — distinct hues, readable on light backgrounds. */
export const MATERIAL_CHART_COLORS: readonly string[] = [
  '#f44336',
  '#e91e63',
  '#9c27b0',
  '#673ab7',
  '#3f51b5',
  '#2196f3',
  '#03a9f4',
  '#00bcd4',
  '#009688',
  '#4caf50',
  '#8bc34a',
  '#ff9800',
  '#ff5722',
  '#795548',
  '#607d8b',
  '#ffc107',
];

const DEFAULT_ROLE_CHART_COLOR =
  MATERIAL_CHART_COLORS[MATERIAL_CHART_COLORS.length - 1];

/** Stable foreground color per role for icons and compact role indicators. */
const ROLE_CHART_COLOR_BY_TYPE: Record<string, string> = {
  divisionAdmin: MATERIAL_CHART_COLORS[3],
  schoolAdmin: MATERIAL_CHART_COLORS[9],
  stakeholder: MATERIAL_CHART_COLORS[5],
  systemAdmin: MATERIAL_CHART_COLORS[0],
  system: MATERIAL_CHART_COLORS[14],
  programHolder: MATERIAL_CHART_COLORS[11],
  officeAdmin: MATERIAL_CHART_COLORS[7],
  officeAdminAssistant: MATERIAL_CHART_COLORS[4],
  divisionStaff: MATERIAL_CHART_COLORS[10],
  divisionGuest: MATERIAL_CHART_COLORS[12],
  schoolStaff: MATERIAL_CHART_COLORS[8],
  schoolGuest: MATERIAL_CHART_COLORS[13],
};

export function getRoleChartColor(role: string): string {
  return ROLE_CHART_COLOR_BY_TYPE[role] ?? DEFAULT_ROLE_CHART_COLOR;
}

/** Fisher–Yates shuffle copy; returns the first `count` colors (random order each call). */
export function pickRandomMaterialColors(count: number): string[] {
  const pool = [...MATERIAL_CHART_COLORS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const out: string[] = [];
  for (let k = 0; k < count; k++) {
    out.push(pool[k % pool.length]);
  }
  return out;
}
