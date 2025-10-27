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

export interface SchoolInfo {
  _id: string;
  division: string;
  districtOrCluster: string;
  schoolName: string;
  schoolOffering: string;
  officialEmailAddress: string;
  accountablePerson: string;
  contactNumber: string;
  designation: string;
}

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
