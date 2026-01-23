export interface SchoolInfo {
  _id: string;
  division: string;
  districtOrCluster: string;
  schoolName: string;
  profileDocUrl?: string;
}

export interface MyContribution {
  amount: number;
  quantity: number;
  signingDate: string;
  startDate: string;
  endDate: string;
  unit: string;
  schoolYear: string;
  schoolId: SchoolInfo;
  schoolNeedId: {
    _id: string;
    code: number;
    specificContribution: string;
    images: Image[];
  }
}

export interface Image {
  id: string;
  category: string;
  originalUrl: string;
  thumbnailUrl: string;
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
