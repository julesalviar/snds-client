export interface Division {
  name: string;
  active: boolean;
}

export interface DivisionData {
  value: Division[];
}

export interface DivisionOption {
  value: string;
  label: string;
  active: boolean;
}
