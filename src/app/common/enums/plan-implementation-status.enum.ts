/** Must match backend PlanImplementationStatus enum values. */
export const PLAN_IMPLEMENTATION_STATUS = [
  'Fully Implemented',
  'Partially Implemented',
  'Not Implemented',
] as const;
export type PlanImplementationStatus = (typeof PLAN_IMPLEMENTATION_STATUS)[number];
