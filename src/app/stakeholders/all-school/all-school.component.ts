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
import { Router } from '@angular/router';
import { SchoolService } from '../../common/services/school.service';

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

  constructor(
    private readonly schoolService: SchoolService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.loadSchools();
  }

  loadSchools(): void {
    this.schoolService.getAllSchools().subscribe({
      next: (response) => {
        this.schoolList = (response.data ?? response) ?? [];
        this.filteredSchoolList = [...this.schoolList];
        this.updateDataSource();
        this.calculateSummaryStats();
      },
      error: (error) => {
        console.error('Error loading schools:', error);
        this.schoolList = [];
        this.filteredSchoolList = [];
        this.updateDataSource();
        this.calculateSummaryStats();
      }
    });
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
    this.loadSchoolsWithPagination();
  }

  loadSchoolsWithPagination(): void {
    this.schoolService.getSchools(this.pageIndex + 1, this.pageSize).subscribe({
      next: (response) => {
        this.schoolList = (response.data ?? response) ?? [];
        this.totalItems = (response.total ?? response.count) ?? this.schoolList.length;
        this.filteredSchoolList = [...this.schoolList];
        this.updateDataSource();
        this.calculateSummaryStats();
      },
      error: (error) => {
        console.error('Error loading schools with pagination:', error);
        this.schoolList = [];
        this.filteredSchoolList = [];
        this.updateDataSource();
        this.calculateSummaryStats();
      }
    });
  }

  viewNeeds(school: any): void {
    console.log('View needs for:', school);
    this.router.navigate(['/stakeholder']);
  }

  noEncodedNeeds(school: any): void {
    console.log('No encoded needs for:', school);
  }
}
