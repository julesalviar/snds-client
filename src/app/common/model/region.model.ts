export interface Division {
  name: string;
  active: boolean;
}

export interface Region {
  code: string;
  name: string;
  active: boolean;
  display?: boolean;
  divisions: Division[];
}

export interface RegionData {
  value: Region[];
}

export interface RegionOption {
  value: string;
  label: string;
  display?: boolean;
}
