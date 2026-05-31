export interface PillarItem {
  name: string;
  code: string;
  displayName: string;
}

export interface PillarConfigResponse {
  _id: string;
  pillars: PillarItem[];
  active: boolean;
  default: boolean;
  effectiveDate: string;
}
