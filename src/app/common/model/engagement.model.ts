import { SchoolNeedImage } from "./school-need.model";
import { SchoolInfo } from "./school-need.model";

export interface PopulatedSchoolNeed {
  _id: string;
  schoolId: string;
  code: number;
  description: string;
  specificContribution: string;
  images: SchoolNeedImage[];
  schoolYear: string;
}

export interface PopulatedStakeholderUser {
  _id: string;
  name?: string;
  email?: string;
  [key: string]: any;
}

export interface Engagement {
  _id?: string;
  amount: number;
  quantity: number;
  stakeholderUserId: string | PopulatedStakeholderUser;
  unit: string;
  signingDate: string;
  startDate: string;
  endDate: string;
  schoolNeedId: string | PopulatedSchoolNeed;
  schoolId: string | SchoolInfo;
  schoolYear: string;
  specificContribution: string;
  stakeholderRepCount?: number | null;
  agreementType?: string;
  signatoryName?: string;
  signatoryDesignation?: string;
  projectCategory?: string;
  projectName?: string;
  agreementStatus?: string;
  initiatedBy?: string;
  rating?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface EngagementMeta {
  count: number;
  totalItems: number;
  currentPage: number;
  totalPages: number;
  timestamp: string;
  totalAmount?: number;
}

export interface EngagementRatingSummary {
  totalRated: number;
  totalUnrated: number;
  averageRating: number | null;
}

export interface EngagementRatingSummaryResponse {
  success: boolean;
  data: EngagementRatingSummary;
  meta?: {
    timestamp?: string | Date;
  };
}

export interface EngagementsResponse {
  success: boolean;
  data: Engagement[];
  meta: EngagementMeta;
}

export interface EngagementStatisticsQuery {
  schoolYear?: string;
  sector?: string;
  schoolId?: string;
}

export interface EngagementStatisticsData {
  engaged: number;
  notEngaged: number;
  filters?: Record<string, unknown>;
}

export interface EngagementStatisticsResponse {
  success: boolean;
  data: EngagementStatisticsData;
  meta?: {
    timestamp?: string | Date;
  };
}

