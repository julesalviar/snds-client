export interface SchoolInfo {
  _id: string;
  division: string;
  districtOrCluster: string;
  schoolName: string;
}

export interface MyContribution {
  totalAmount: number;
  totalQuantity: number;
  engagementCount: number;
  engagementDates: string;
  specificContribution: string;
  schoolYear: string;
  schoolId: SchoolInfo;
}

export interface MyContributionMeta {
  count: number;
  timestamp: string;
}

export interface MyContributionsResponse {
  success: boolean;
  data: MyContribution[];
  meta: MyContributionMeta;
}
