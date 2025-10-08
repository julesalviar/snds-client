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
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router } from '@angular/router';
import { SchoolService } from '../../common/services/school.service';
import { AuthService } from '../../auth/auth.service';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { maskContactNumber } from '../../common/string-utils';

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
    FormsModule,
    MatProgressBarModule
  ],
  templateUrl: './all-school.component.html',
  styleUrls: ['./all-school.component.css']
})
export class AllSchoolComponent implements OnInit {
  displayedColumns: string[] = ['needsIndicator', 'schoolName', 'schoolId', 'accountableName', 'designation', 'contactNumber', 'actions'];
  schoolList: any[] = [];
  filteredSchoolList: any[] = [];
  dataSource = new MatTableDataSource<any>();
  pageIndex: number = 0;
  pageSize: number = 10;
  totalItems: number = 0;
  schoolsWithNeeds: number = 0;
  searchTerm: string = '';
  isLoading: boolean = true;
  private searchSubject = new Subject<string>();

  constructor(
    private readonly schoolService: SchoolService,
    private readonly router: Router,
    private readonly authService: AuthService
  ) {
  }

  ngOnInit(): void {
    this.loadSchools();

    // Set up debounced search
    this.searchSubject.pipe(
      debounceTime(300), // Wait 300ms after user stops typing
      distinctUntilChanged() // Only emit if the value has changed
    ).subscribe(searchTerm => {
      this.searchTerm = searchTerm;
      this.applyFilter();
    });
  }

  loadSchools(): void {
    this.isLoading = true;
    this.schoolService.getAllSchools().subscribe({
      next: (response) => {
        this.schoolList = (response.data ?? response) ?? [];
        this.filteredSchoolList = [...this.schoolList];
        this.updateDataSource();
        this.calculateSummaryStats();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading schools:', error);
        this.schoolList = [];
        this.filteredSchoolList = [];
        this.updateDataSource();
        this.calculateSummaryStats();
        this.isLoading = false;
      }
    });
  }

  onSearchInput(searchTerm: string): void {
    this.searchSubject.next(searchTerm);
  }

  applyFilter(): void {
    this.isLoading = true;
    this.pageIndex = 0; // Reset to first page when filtering

    this.schoolService.getAllSchools(undefined, this.searchTerm).subscribe({
      next: (response) => {
        this.schoolList = (response.data ?? response) ?? [];
        this.filteredSchoolList = [...this.schoolList];
        this.updateDataSource();
        this.calculateSummaryStats();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error searching schools:', error);
        this.schoolList = [];
        this.filteredSchoolList = [];
        this.updateDataSource();
        this.calculateSummaryStats();
        this.isLoading = false;
      }
    });
  }

  updateDataSource(): void {
    this.dataSource.data = this.filteredSchoolList;
    this.totalItems = this.filteredSchoolList.length;
  }

  calculateSummaryStats(): void {
    this.schoolsWithNeeds = this.filteredSchoolList.filter(school => school.additionalInfo?.needCount > 0).length;
  }

  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
    this.loadSchoolsWithPagination();
  }

  loadSchoolsWithPagination(): void {
    this.isLoading = true;
    this.schoolService.getSchools(this.pageIndex + 1, this.pageSize).subscribe({
      next: (response) => {
        this.schoolList = (response.data ?? response) ?? [];
        this.totalItems = (response.total ?? response.count) ?? this.schoolList.length;
        this.filteredSchoolList = [...this.schoolList];
        this.updateDataSource();
        this.calculateSummaryStats();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading schools with pagination:', error);
        this.schoolList = [];
        this.filteredSchoolList = [];
        this.updateDataSource();
        this.calculateSummaryStats();
        this.isLoading = false;
      }
    });
  }

  viewNeeds(school: any): void {
    const userRole = this.authService.getRole();
    const schoolId = school._id || school.id;

    if (userRole === 'stakeholder') {
      this.router.navigate(['/stakeholder/school-needs'], {
        queryParams: {schoolId: schoolId}
      });
    } else {
      this.router.navigate(['/guest/school-needs'], {
        queryParams: {schoolId: schoolId}
      });
    }
  }

  maskContactNumber(contactNumber: string): string {
    return maskContactNumber(contactNumber);
  }
}
