import { AipStatus } from '../enums/aip-status.enum';

export interface Aip {
  apn: string;
  schoolYear: string | string[];
  title: string;
  objectives: string;
  pillars: string;
  responsiblePerson: string;
  materialsNeeded: string;
  totalBudget: string;
  budgetSource: string;
  status: AipStatus;

  _id: string;
}
