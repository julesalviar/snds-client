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
  createdAt?: string;
  updatedAt?: string;
}

export interface EngagementMeta {
  count: number;
  totalItems: number;
  currentPage: number;
  totalPages: number;
  timestamp: string;
  totalAmount?: number; // Total amount from backend
}

export interface EngagementsResponse {
  success: boolean;
  data: Engagement[];
  meta: EngagementMeta;
}

