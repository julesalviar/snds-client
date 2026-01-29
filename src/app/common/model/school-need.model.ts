export interface SchoolNeedImage {
  id: string;
  category: string;
  originalUrl: string;
  thumbnailUrl: string;
}

export interface ProjectInfo {
  _id: string;
  schoolYear: string;
  title: string;
  objectives: string;
  pillars: string;
}

import { SchoolInfo } from './school.model';

export { SchoolInfo } from './school.model';

export interface SchoolNeed {
  _id?: string;
  code?: string;
  description: string;
  specificContribution: string;
  contributionType: string,
  quantity: number;
  amount?: number;
  estimatedCost: number;
  studentBeneficiaries: number;
  personnelBeneficiaries: number;
  implementationStatus?: string;
  targetDate?: string;
  engaged?: boolean;
  unit: string;
  schoolYear?: string;
  createdAt?: string;
  updatedAt?: string;



  projectId: (ProjectInfo | string)[];
  schoolId: SchoolInfo | string;
  school?: SchoolInfo;
  project?: ProjectInfo;
  images: SchoolNeedImage[];

  engagements?: any[];
}
