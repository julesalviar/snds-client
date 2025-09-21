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
  implementationDate?: string;
  engaged?: boolean;
  unit: string;

  projectId: string;
  schoolId: string;
  images: string[];
}
