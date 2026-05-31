import { AipStatus } from '../enums/aip-status.enum';

export interface Aip {
  apn: string;
  schoolYear: string | string[];
  title: string;
  problemStatement?: string;
  objectives: string;
  /** Pillar config `name` (UI shows `displayName`). */
  pillars: string;
  responsiblePerson: string;
  materialsNeeded: string;
  totalBudget: string;
  budgetSource: string;
  status: AipStatus;

  _id: string;
}
