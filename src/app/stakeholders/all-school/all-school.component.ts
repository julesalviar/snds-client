import { Component, OnInit } from '@angular/core';
import { MatTable, MatTableModule, MatTableDataSource } from '@angular/material/table';
import { CommonModule } from '@angular/common';
import { MatCard, MatCardTitle } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-all-school',
  standalone: true,
  imports: [
    MatTable, 
    CommonModule, 
    MatTableModule, 
    MatCard,
    MatCardTitle,
    MatIcon,
    MatTooltipModule,
    MatIconButton,
    MatPaginator,
    MatFormFieldModule,
    MatInputModule,
    FormsModule
  ],
  templateUrl: './all-school.component.html',
  styleUrls: ['./all-school.component.css']
})
export class AllSchoolComponent implements OnInit {
  displayedColumns: string[] = ['schoolName', 'schoolId', 'accountableName', 'designation', 'contactNumber', 'actions'];
  schoolList: any[] = [];
  filteredSchoolList: any[] = [];
  dataSource = new MatTableDataSource<any>();
  pageIndex: number = 0;
  pageSize: number = 10;
  totalItems: number = 0;
  schoolsWithNeeds: number = 0;
  searchTerm: string = '';

  constructor() {}

  ngOnInit(): void {
    // Temporary data for testing
    this.schoolList = [
      {
        schoolName: 'Green Valley High School',
        schoolId: 'GVHS123',
        accountableName: 'John Doe',
        designation: 'Principal',
        contactNumber: '123-456-7890',
        hasEncodedNeeds: true // Indicates if there are encoded needs
      },
      {
        schoolName: 'National High School',
        schoolId: 'NH456',
        accountableName: 'Jane Smith',
        designation: 'Administrator',
        contactNumber: '987-654-3210',
        hasEncodedNeeds: false // No encoded needs
      },
      {
        schoolName: 'Elementary School',
        schoolId: 'ES789',
        accountableName: 'Emily Johnson',
        designation: 'Vice Principal',
        contactNumber: '555-123-4567',
        hasEncodedNeeds: true // Indicates if there are encoded needs
      },
      {
        schoolName: 'Central High School',
        schoolId: 'CHS001',
        accountableName: 'Michael Brown',
        designation: 'Principal',
        contactNumber: '111-222-3333',
        hasEncodedNeeds: true
      },
      {
        schoolName: 'Westside Elementary',
        schoolId: 'WES002',
        accountableName: 'Sarah Wilson',
        designation: 'Administrator',
        contactNumber: '444-555-6666',
        hasEncodedNeeds: false
      }
    ];
    
    this.filteredSchoolList = [...this.schoolList];
    this.updateDataSource();
    this.calculateSummaryStats();
    
    //user servicde subscibe
    // this.userService.schools$.subscribe(schools => {
    //   this.schoolList = schools;
    //   this.filteredSchoolList = [...this.schoolList];
    //   this.updateDataSource();
    //   this.calculateSummaryStats();
    // });
  }

  applyFilter(): void {
    if (!this.searchTerm.trim()) {
      this.filteredSchoolList = [...this.schoolList];
    } else {
      const searchLower = this.searchTerm.toLowerCase().trim();
      this.filteredSchoolList = this.schoolList.filter(school => 
        school.schoolName.toLowerCase().includes(searchLower) ||
        school.schoolId.toLowerCase().includes(searchLower) ||
        school.accountableName.toLowerCase().includes(searchLower) ||
        school.designation.toLowerCase().includes(searchLower) ||
        school.contactNumber.includes(searchLower)
      );
    }
    
    this.pageIndex = 0; // Reset to first page when filtering
    this.updateDataSource();
    this.calculateSummaryStats();
  }

  updateDataSource(): void {
    this.dataSource.data = this.filteredSchoolList;
    this.totalItems = this.filteredSchoolList.length;
  }

  calculateSummaryStats(): void {
    this.schoolsWithNeeds = this.filteredSchoolList.filter(school => school.hasEncodedNeeds).length;
  }

  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
    // In a real implementation, you would load data from a service here
    // this.loadSchools();
  }

  viewNeeds(school: any): void {
    console.log('View needs for:', school);
  }

  noEncodedNeeds(school: any): void {
    console.log('No encoded needs for:', school);
  }
}
