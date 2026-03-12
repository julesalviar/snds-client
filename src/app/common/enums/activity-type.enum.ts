export enum ActivityType {
  PartnershipEngagement = 'partnershipEngagement',
  Other = 'other',
}

/** Display label for each ActivityType (e.g. for tooltips, selects). */
export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  [ActivityType.PartnershipEngagement]: 'Partnership Engagement',
  [ActivityType.Other]: 'Other',
};

/** Returns the display label for an activity type string; falls back to the raw value. */
export function getActivityTypeLabel(type: string): string {
  return ACTIVITY_TYPE_LABELS[type as ActivityType] ?? type;
}
