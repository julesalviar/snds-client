import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
@Component({
  selector: 'app-school-need-view',
  standalone: true,
   imports: [
    MatCardModule,
    MatIconModule, 
    MatButtonModule,
    MatTableModule,
    MatProgressBarModule

  ] ,
  templateUrl: './school-need-view.component.html',
  styleUrls: ['./school-need-view.component.css']
 
})
export class SchoolNeedViewComponent implements OnInit {
  code: string | null = null;
  
  // Properties for school information
  schoolName = 'NATIONAL HIGH SCHOOL';
  category = 'Infrastructure';
  schoolNeeds = 'Chairs';
  quantity = 2;
  estimatedAmount = '₱500,000';
  noOfBeneficiaryStudents = 30;
  noOfBeneficiaryPersonnel = 5;
  implementationDate = '2025-10-30';
  accountablePerson = 'John John';
  contactNumber = '(083) 552-8909';
  
  progressValue = 40; // Example progress value (from 10% to 100%)
  
  // Project description
  projectDescription = 'For accessible coordination of inquiries for our beloved learners in need of assistance.';
  
  // Stakeholders data
  stakeholders = [
    { name: 'PACIFIC BOARD - DEPT. FOUNDATION, INC.', quantity: 1, amount: '₱15,000' },
    { name: 'SAMPLE PRIVATE ORG.', quantity: 1, amount: '₱45,000' },
  ];

  // Columns for the stakeholder table
  displayedColumns: string[] = ['contributor', 'quantity', 'amount', 'action'];

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.code = this.route.snapshot.paramMap.get('code');
    console.log('View component code:', this.code);
  }

  // delete a stakeholder
  deleteStakeholder(element: any) {
    const index = this.stakeholders.indexOf(element);
    if (index >= 0) {
      this.stakeholders.splice(index, 1);
    }
  }
}