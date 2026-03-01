/** Must match backend PlanClassification enum values. */
export const PLAN_CLASSIFICATION = [
  'Enabling Learning Environment',
  'Teacher Welfare',
  'Learner Well-being',
  'Efficient Learning Delivery',
  'Future-ready Force',
] as const;
export type PlanClassification = (typeof PLAN_CLASSIFICATION)[number];

/**
 * Display labels for gensan/dev tenants only.
 * Keys are PLAN_CLASSIFICATION values; values are display text.
 * Stored value remains the same as PLAN_CLASSIFICATION.
 */
export const PLAN_CLASSIFICATION_GENSAN_DISPLAY_MAP: Record<PlanClassification, string> = {
  'Enabling Learning Environment': 'GOLD (Governance)',
  'Teacher Welfare': 'COACH (Teacher Welfare)',
  'Learner Well-being': 'SAFE (Learner Well-being)',
  'Efficient Learning Delivery': 'AGILE (Efficient Learning Delivery)',
  'Future-ready Force': 'GILAS (Future-Ready Workforce)',
};
