import { ActivityType } from './activity-type.enum';

/** Material icon name per ActivityType for display in lists/tables. */
export const ACTIVITY_TYPE_ICONS: Partial<Record<ActivityType, string>> = {
  [ActivityType.PartnershipEngagement]: 'handshake',
  [ActivityType.Other]: 'category',
};

/** Color per ActivityType for icon display. */
export const ACTIVITY_TYPE_COLORS: Partial<Record<ActivityType, string>> = {
  [ActivityType.PartnershipEngagement]: '#1976d2',
  [ActivityType.Other]: '#757575',
};

/** Returns the Material icon name for an activity type; falls back to 'event' for unknown types. */
export function getActivityTypeIcon(type: string): string {
  return ACTIVITY_TYPE_ICONS[type as ActivityType] ?? 'event';
}

/** Returns the color for an activity type; falls back to default grey for unknown types. */
export function getActivityTypeColor(type: string): string {
  return ACTIVITY_TYPE_COLORS[type as ActivityType] ?? '#757575';
}
