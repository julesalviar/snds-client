export interface Division {
  name: string;
  active: boolean;
  display?: boolean;
  clusters?: string[];
}

export interface DivisionData {
  value: Division[];
}

export interface DivisionOption {
  value: string;
  label: string;
  active: boolean;
  display?: boolean;
}
