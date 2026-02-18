/** Office from backend CRUD. */
export interface Office {
  _id: string;
  code: string;
  name: string;
  division: string;

  ppaPlanCount?: number;
}

export interface OfficeListResponse {
  data: Office[];
  totalItems?: number;
  total?: number;
}
