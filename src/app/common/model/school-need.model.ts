export interface SchoolNeed {
  code: string;
  year: number;
  specificContribution: string;
  quantity: number;
  amount: number;
  beneficiaryStudents: number;
  beneficiaryPersonnel: number;
  implementationStatus: string;
  engaged?: boolean;
}
