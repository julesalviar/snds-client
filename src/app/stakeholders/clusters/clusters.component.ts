import { Component, OnInit } from '@angular/core';
import { MatTable, MatTableModule, MatTableDataSource } from '@angular/material/table';
import { CommonModule } from '@angular/common';
import { MatCard, MatCardTitle } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconButton } from '@angular/material/button';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router } from '@angular/router';
import { SchoolService } from '../../common/services/school.service';
import {InternalReferenceDataService} from "../../common/services/internal-reference-data.service";
import {AuthService} from "../../auth/auth.service";

@Component({
  selector: 'app-clusters',
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
    MatSelectModule,
    FormsModule,
    MatProgressBarModule
  ],
  templateUrl: './clusters.component.html',
  styleUrls: ['./clusters.component.css']
})
export class ClustersComponent implements OnInit {
  displayedColumns: string[] = ['schoolName', 'schoolId', 'accountableName', 'designation', 'ppasEncoded', 'ppasAccomplished', 'needsEncoded', 'needsAccomplished', 'generatedResources', 'actions'];
  schoolList: any[] = [];
  filteredSchoolList: any[] = [];
  dataSource = new MatTableDataSource<any>();
  pageIndex: number = 0;
  pageSize: number = 10;
  totalItems: number = 0;
  schoolsWithNeeds: number = 0;
  selectedCluster: string = '';
  clusterOptions: any[] = [];
  isLoading: boolean = true;

  constructor(
    private readonly schoolService: SchoolService,
    private readonly router: Router,
    private readonly internalReferenceDataService: InternalReferenceDataService,
    private readonly authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.loadClusterOptions();
    this.loadSchools();
  }

  async loadClusterOptions(): Promise<void> {
    try {
      await this.internalReferenceDataService.initialize();
      const clusters: string[] = this.internalReferenceDataService.get('clusters');
      if (clusters) {
        this.clusterOptions = [
          { value: '', label: 'All Districts/Clusters' },
          ...clusters.map(cluster => ({
            value: cluster,
            label: cluster
          }))
        ];
      }
    } catch (error) {
      console.error('Error loading cluster options:', error);
      // Fallback to empty options
      this.clusterOptions = [
        { value: '', label: 'All Districts/Clusters' }
      ];
    }
  }

  loadSchools(): void {
    this.isLoading = true;
    this.schoolService.getAllSchools(this.selectedCluster).subscribe({
      next: (response) => {
        this.schoolList = response.data ?? response ?? [];
        this.totalItems = response.meta?.totalItems ?? this.schoolList.length;
        this.filteredSchoolList = [...this.schoolList];
        this.updateDataSource();
        this.calculateSummaryStats();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading schools:', error);
        // Fallback to empty array if API fails
        this.schoolList = [];
        this.filteredSchoolList = [];
        this.updateDataSource();
        this.calculateSummaryStats();
        this.isLoading = false;
      }
    });
  }

  applyFilter(): void {
    if (!this.selectedCluster) {
      this.filteredSchoolList = [...this.schoolList];
    } else {
      this.filteredSchoolList = this.schoolList.filter(school =>
        school.district === this.selectedCluster
      );
    }

    this.pageIndex = 0; // Reset to first page when filtering
    this.updateDataSource();
    this.calculateSummaryStats();
  }

  onClusterChange(): void {
    this.loadSchools(); // Reload schools with new district filter
  }

  refreshSchools(): void {
    this.loadSchools(); // Manual refresh button
  }

  updateDataSource(): void {
    this.dataSource.data = this.filteredSchoolList;
  }

  calculateSummaryStats(): void {
    this.schoolsWithNeeds = this.filteredSchoolList.filter(school => school.hasEncodedNeeds).length;
  }

  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
    // Load data from service with pagination
    this.loadSchoolsWithPagination();
  }

  loadSchoolsWithPagination(): void {
    this.isLoading = true;
    this.schoolService.getSchools(this.pageIndex + 1, this.pageSize, this.selectedCluster).subscribe({
      next: (response) => {
        // Assuming the API returns data in a specific format
        // Adjust this based on your actual API response structure
        this.schoolList = response.data ?? response ?? [];
        this.totalItems = response.meta?.totalItems ?? this.schoolList.length;
        this.filteredSchoolList = [...this.schoolList];
        this.updateDataSource();
        this.calculateSummaryStats();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading schools with pagination:', error);
        // Fallback to empty array if API fails
        this.schoolList = [];
        this.filteredSchoolList = [];
        this.updateDataSource();
        this.calculateSummaryStats();
        this.isLoading = false;
      }
    });
  }

  viewNeeds(school: any): void {
    const userRole = this.authService.getActiveRole();
    const schoolId = school._id ?? school.id;

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

  noEncodedNeeds(school: any): void {
    console.log('No encoded needs for:', school);
  }
}
