import { Engagement } from './engagement.model';

export type StakeholderEngagementStatus = 'Engaged' | 'Not Engaged';

export interface ContributionItem {
  schoolYear: string;
  school: string;
  specificContribution: string;
  amount: string;
  movs: string;
  images: unknown[];
}

export interface StakeholderProfile {
  _id: string;
  name: string;
  email: string;
  contactNumber: string;
  address: string;
  sector: string;
  subsector?: string;
  engagementStatus: StakeholderEngagementStatus;
  engagements: Engagement[];
  isReferenceAccount: boolean;
}

export interface StakeholderProfileListMeta {
  count: number;
  totalItems: number;
  currentPage: number;
  totalPages: number;
  filters?: {
    search?: string;
    sector?: string;
    schoolYear?: string;
    engaged?: boolean;
    schoolId?: string;
    includeReferenceAccounts?: boolean;
  };
}

export interface StakeholderProfileListResponse {
  success: boolean;
  data: StakeholderProfile[];
  meta: StakeholderProfileListMeta;
}

export interface StakeholderProfileStatisticsResponse {
  success: boolean;
  data: {
    engaged: number;
    notEngaged: number;
    filters: {
      sector: string | null;
      schoolYear: string | null;
      schoolId: string | null;
      includeReferenceAccounts: boolean;
    };
  };
}

export interface ListStakeholderProfilesParams {
  page?: number;
  limit?: number;
  search?: string;
  sector?: string;
  schoolYear?: string;
  engaged?: boolean;
  includeReferenceAccounts?: boolean;
}

export interface StakeholderProfileStatisticsParams {
  sector?: string;
  schoolYear?: string;
  includeReferenceAccounts?: boolean;
}
