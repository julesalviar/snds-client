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
  'Teacher Welfare': 'Outcome 1: (High-Performing Teachers) Project COACH',
  'Learner Well-being': 'Outcome 2: (Improved Learning Environment) Project SAFE',
  'Enabling Learning Environment': 'Outcome 3: (Enhanced Governance Structure) Project GOLD',
  'Efficient Learning Delivery': 'Outcome 4: (Improved Education Quality) Project AGILE',
  'Future-ready Force': 'Outcome 5: (Empowered Graduates) Project GILAS',
};
