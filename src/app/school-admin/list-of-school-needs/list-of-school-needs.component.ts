import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatCard, MatCardTitle } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatMenu } from '@angular/material/menu';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { SharedDataService } from '../../services/shared-data.service';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { ImplementationStatusDialogComponent } from '../implementation-status-dialog/implementation-status-dialog.component';
import { MatDialog } from '@angular/material/dialog';

interface SchoolNeed {
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

@Component({
  selector: 'app-list-of-school-needs',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatCard,
    MatCardTitle,
    MatIcon,
    MatTooltipModule,
    MatMenu,
    MatMenuModule,
    RouterModule
  ],
  templateUrl: './list-of-school-needs.component.html',
  styleUrls: ['./list-of-school-needs.component.css']
})
export class ListOfSchoolNeedsComponent implements OnInit {
  displayedColumns: string[] = [
    'code', 
    'year', 
    'specificContribution', 
    'quantity', 
    'amount', 
    'beneficiaryStudents', 
    'beneficiaryPersonnel', 
    'implementationStatus', 
    'actions'
  ];
  schoolNeeds: SchoolNeed[] = [];
  schoolName: string = ''; 

  constructor(private sharedDataService: SharedDataService, private router: Router, private dialog: MatDialog) {}

  ngOnInit(): void {
    this.schoolName = this.sharedDataService.getSchoolName(); // Fetch the school name

    // Fetch school needs from the shared data service
    this.schoolNeeds = this.sharedDataService.getSchoolNeeds();
  }
  
  openStatusDialog(need: SchoolNeed): void { 
    const dialogRef = this.dialog.open(ImplementationStatusDialogComponent, {
      data: {
        implementationStatus: need.implementationStatus,
        schoolName: this.schoolName, // Pass the school name
      },
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('Dialog closed with result:', result);
    });
  }

  navigateToEngage(code: string): void {
    this.router.navigate(['/school-admin/school-needs-engage', code]);
  }

  engage(need: SchoolNeed): void {
    need.engaged = true; // Mark as engaged locally
    console.log('Engaging with:', need);
  }

  progress(need: SchoolNeed): void {
    const dialogRef = this.dialog.open(ImplementationStatusDialogComponent, {
      data: {
        implementationStatus: need.implementationStatus,
        schoolName: this.schoolName,
        code: need.code,
        engaged: need.engaged
      }
    });
  
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Update the implementation status in the list
        const updatedNeed = this.schoolNeeds.find(n => n.code === need.code);
        if (updatedNeed) {
          updatedNeed.implementationStatus = result.implementationStatus; // Update status
        }
        console.log('Dialog closed with updated status:', result);
      }
    });
  }
  view(need: SchoolNeed): void {
    console.log('Viewing:', need);
  }

  edit(need: SchoolNeed): void {
    console.log('Editing:', need);
  }

  delete(need: SchoolNeed): void {
    console.log('Deleting:', need);
    this.schoolNeeds = this.schoolNeeds.filter(n => n.code !== need.code);
  }
}