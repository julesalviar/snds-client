export interface MyContributionEngagement {
  stakeholderId: string;
  signingDate: string;
  unitMeasure: string;
  donatedAmount: number;
  startDate: string;
  endDate: string;
}

export interface SchoolInfo {
  _id: string;
  division: string;
  districtOrCluster: string;
  schoolName: string;
}

export interface MyContribution {
  _id: string;
  schoolId: SchoolInfo;
  code: number;
  description: string;
  myEngagements: MyContributionEngagement[];
}

export interface MyContributionSummary {
  totalDonatedAmt: number;
  numberOfSchools: number;
}

export interface MyContributionMeta {
  summary: MyContributionSummary;
  count: number;
  totalItems: number;
  currentPage: number;
  totalPages: number;
}

export interface MyContributionsResponse {
  success: boolean;
  data: MyContribution[];
  meta: MyContributionMeta;
}
