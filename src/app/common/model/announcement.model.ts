export type AnnouncementTargetAudience = 'all' | 'roles';
export type AnnouncementLocation = 'home';

export interface Announcement {
  _id: string;
  title: string;
  description?: string;
  announcement: string;
  effectiveFrom: string;
  effectiveUntil?: string;
  location: AnnouncementLocation;
  forceShowEveryVisit: boolean;
  active: boolean;
  targetAudience: AnnouncementTargetAudience;
  targetRoles: string[];
  createdBy?: string;
  createdByRole?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AnnouncementListResponse {
  success?: boolean;
  data: Announcement[];
  meta?: {
    count: number;
    totalItems: number;
    currentPage: number;
    totalPages: number;
    search?: string;
    timestamp?: string;
  };
}

export interface AnnouncementResponse {
  success?: boolean;
  data: Announcement;
  meta?: { timestamp?: string };
}

export interface RoleSubordinatesResponse {
  role: string;
  subordinateRoles: string[];
}

export interface AnnouncementAiStatus {
  tenantCode: string;
  envKey: string;
  aiEnabledEnvKey: string;
  configured: boolean;
  aiEnabled: boolean;
  valid: boolean;
  error?: string;
  quota?: AnnouncementAiQuota;
}

export interface AnnouncementAiQuota {
  userDailyLimitUsd: number;
  tenantDailyLimitUsd: number;
  userDailySpendUsd: number;
  tenantDailySpendUsd: number;
  userLimitReached: boolean;
  tenantLimitReached: boolean;
  canGenerate: boolean;
}

export interface GenerateAnnouncementContentRequest {
  title: string;
  description: string;
  additionalContext?: string;
}

export interface GenerateAnnouncementImageResponse {
  imageUrl: string;
}

export const ANNOUNCEMENT_ROLE_LABELS: Record<string, string> = {
  system: 'System',
  systemAdmin: 'System Admin',
  superAdmin: 'Super Admin',
  stakeholder: 'Stakeholder',
  divisionAdmin: 'Division Admin',
  divisionStaff: 'Division Staff',
  divisionGuest: 'Division Guest',
  schoolAdmin: 'School Admin',
  schoolStaff: 'School Staff',
  schoolGuest: 'School Guest',
  programHolder: 'Program Holder',
  officeAdmin: 'Office Admin',
  officeAdminAssistant: 'Office Admin Assistant',
  guest: 'Guest',
};

export function getAnnouncementRoleLabel(role: string): string {
  return ANNOUNCEMENT_ROLE_LABELS[role] ?? role;
}
