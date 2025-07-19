export interface Aip {
  apn: string;
  schoolYear: number;
  title: string;
  objectives: string[];
  pillars: string;
  responsiblePerson: string;
  materialsNeeded: string;
  totalBudget: string;
  budgetSource: string;
  status: 'Ongoing' | 'For Implementation' | 'Completed';
}
