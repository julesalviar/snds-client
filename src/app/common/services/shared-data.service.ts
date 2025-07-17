import { Injectable } from '@angular/core';

interface SchoolNeed {
  code: string;
  year: number;
  specificContribution: string;
  quantity: number;
  amount: number;
  beneficiaryStudents: number;
  beneficiaryPersonnel: number;
  implementationStatus: string;
  engaged?: boolean; // Track engagement status
}

@Injectable({
  providedIn: 'root',
})
export class SharedDataService {
  private schoolName: string = '';
  private readonly schoolNeeds: SchoolNeed[] = [
    {
      code: '35541',
      year: 2023,
      specificContribution: 'Books',
      quantity: 100,
      amount: 5000,
      beneficiaryStudents: 80,
      beneficiaryPersonnel: 5,
      implementationStatus: 'Looking for Partners',
      engaged: false, // Initial engagement status
    },
    {
      code: '35542',
      year: 2023,
      specificContribution: 'Stationery',
      quantity: 200,
      amount: 3000,
      beneficiaryStudents: 150,
      beneficiaryPersonnel: 10,
      implementationStatus: 'Looking for Partners',
      engaged: false, // Initial engagement status
    },
  ];

  setSchoolName(name: string): void {
    this.schoolName = name;
  }

  getSchoolName(): string {
    return this.schoolName;
  }

  updateEngagementStatus(code: string, engaged: boolean): void {
    const need = this.schoolNeeds.find(n => n.code === code);
    if (need) {
      need.engaged = engaged;
    }
  }

  getSchoolNeeds(): SchoolNeed[] {
    return this.schoolNeeds;
  }
}
