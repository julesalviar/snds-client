export interface SchoolNeedImage {
  id: string;
  category: string;
  originalUrl: string;
  thumbnailUrl: string;
}

export interface SchoolNeed {
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

  projectId: string;
  schoolId: string;
  images: SchoolNeedImage[];
}
