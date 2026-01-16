import {Component, OnInit} from '@angular/core';
import {UserService} from '../common/services/user.service';
import {CommonModule} from '@angular/common';
import {MatBadgeModule} from '@angular/material/badge';
import {Router} from '@angular/router';
import {ReferenceDataService} from "../common/services/reference-data.service";
import {SchoolNeedService} from "../common/services/school-need.service";
import {AuthService} from "../auth/auth.service";
import {forkJoin, Observable, of, switchMap} from "rxjs";
import {MatIcon} from "@angular/material/icon";
import {MatProgressBarModule} from "@angular/material/progress-bar";
import {getSchoolYear} from "../common/date-utils";
import {AipService} from "../common/services/aip.service";
import {AIP_STATUSES, AipStatus} from "../common/enums/aip-status.enum";
import {UserType} from "../registration/user-type.enum";
import {MatCardModule} from "@angular/material/card";
import {SchoolInfo} from "../common/model/school-need.model";
import {InternalReferenceDataService} from "../common/services/internal-reference-data.service";

interface TreeNode {
    name: string;
    children?: TreeNode[];
    expanded?: boolean;
    count?: number;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, MatBadgeModule, MatIcon, MatProgressBarModule, MatCardModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']

})
export class HomeComponent implements OnInit {
  name: string | undefined;
  userRole: string | undefined;
  schoolName: string = '';
  schoolInfo: SchoolInfo | null = null;
  divisionName: string = '';

  treeData: TreeNode[] = [];
  schoolNeedData: any[] = [];
  isLoading: boolean = true;

  // AIP Status Statistics
  aipStatusStats: Map<AipStatus, number> = new Map();
  totalAips: number = 0;
  isLoadingAipStats: boolean = false;
  protected readonly UserType = UserType;
  protected readonly AIP_STATUSES = AIP_STATUSES;

    constructor(
      private readonly userService: UserService,
      private readonly router: Router,
      private readonly referenceDataService: ReferenceDataService,
      private readonly internalReferenceDataService: InternalReferenceDataService,
      private readonly schoolNeedService: SchoolNeedService,
      private readonly authService: AuthService,
      private readonly aipService: AipService,
    ) {
    }

  ngOnInit(): void {
    this.name = this.authService.getName();
    this.userRole = this.authService.getActiveRole();

    if (!this.name || !this.userRole) {
      console.warn('User information is incomplete.');
    }

    this.loadSchoolNeeds();

    // Load AIP statistics if user is schoolAdmin or divisionAdmin
    if (this.userRole === UserType.SchoolAdmin || this.userRole === UserType.DivisionAdmin) {
      this.loadAipStatusStatistics();
    }
    this.loadInternalReferenceData().then(r => {
      // console.log('Division Name: ', this.divisionName);
    });
  }

  async loadInternalReferenceData() {
      await this.internalReferenceDataService.initialize();
      this.divisionName = this.internalReferenceDataService.get('division');
  }

    toggleChildren(node: TreeNode): void {
      if (node.children && Array.isArray(node.children)) {
        node.expanded = !node.expanded;
      }
    }

    onChildClick(child: TreeNode): void {
      const selectedContribution = {
          name: this.treeData.find(node => node.children?.includes(child))?.name,
          specificContribution: child.name
      };

      this.userService.setContribution(selectedContribution);
      let path: string;
      let queryParams: any = {};

      switch (this.userRole) {
        case 'schoolAdmin':
          path = '/school-admin/school-needs';
          break;
        case 'divisionAdmin':
          path = '/division-admin/school-needs';
          break;
        case 'stakeholder':
          path = '/stakeholder/school-needs';
          queryParams = { selectedContribution: child.name };
          break;
        default:
          path = '/guest/school-needs';
          queryParams = { selectedContribution: child.name };
          console.warn(`Unknown or undefined role: ${this.userRole}`);
          break;
      }

      this.router.navigate([path], { queryParams });
  }

    private fetchAllSchoolNeeds(page= 1, size = 10000, acc: any[] = []): Observable<{data: any[], schoolName: string, schoolInfo: SchoolInfo | null}> {
      return this.schoolNeedService.getSchoolNeeds(page, size, getSchoolYear(), undefined, undefined, true).pipe(
        switchMap(res => {
          const currentData = res?.data ?? [];
          const allData = [...acc, ...currentData];

          // Capture school information from the first response
          if (page === 1 && res?.school) {
            this.schoolName = res.school.schoolName || '';
            this.schoolInfo = res.school;
          }

          if(currentData.length < size) {
            return of({data: allData, schoolName: this.schoolName, schoolInfo: this.schoolInfo});
          }

          return this.fetchAllSchoolNeeds(page + 1, size, allData);
        })
      )
    }

    private loadSchoolNeeds(): void {
      this.isLoading = true;
      forkJoin({
        tree: of(this.referenceDataService.get<TreeNode[]>('contributionTree')),
        needs: this.fetchAllSchoolNeeds()
      }).subscribe({
        next: ({ tree, needs }) => {
          this.treeData = tree;
          this.schoolNeedData = needs.data;
          this.schoolInfo = needs.schoolInfo;

          this.mapCountsToTree(needs.data);
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error fetching school needs:', err);
          this.isLoading = false;
        }
      })
    }


    private mapCountsToTree(needs: any[]): void {
      for (const node of this.treeData) {

        if(node.children) {
          for (const child of node.children) {
            const specificNeeds = needs.filter(
              need => need.specificContribution === child.name
            );

            child.count = specificNeeds.reduce((acc, child) => {
              const totalEngaged = (child.engagements ?? []).reduce((engAcc: number, eng: any) => engAcc + (eng.quantity ?? 0), 0);
              return acc + (child.quantity ?? 0) - totalEngaged;
            }, 0);

            if ((child?.count ?? 0) <= 0) {
              child.count = undefined;
            }
          }
        }
      }
    }

    private loadAipStatusStatistics(): void {
      this.isLoadingAipStats = true;
      const schoolId = this.userRole === UserType.SchoolAdmin ? this.authService.getSchoolId() : undefined;

      // Fetch all AIPs (with pagination if needed)
      this.fetchAllAips(1, 1000, [], schoolId).subscribe({
        next: (aips) => {
          this.calculateAipStatusPercentages(aips);
          this.isLoadingAipStats = false;
        },
        error: (err) => {
          console.error('Error loading AIP statistics:', err);
          this.isLoadingAipStats = false;
        }
      });
    }

    private fetchAllAips(page: number, size: number, acc: any[] = [], schoolId?: string): Observable<any[]> {
      return this.aipService.getAips(page, size, schoolId).pipe(
        switchMap(res => {
          const currentData = res?.data ?? [];
          const allData = [...acc, ...currentData];

          if (currentData.length < size) {
            return of(allData);
          }

          return this.fetchAllAips(page + 1, size, allData, schoolId);
        })
      );
    }

    private calculateAipStatusPercentages(aips: any[]): void {
      this.totalAips = aips.length;
      this.aipStatusStats.clear();

      // Initialize all statuses with 0
      AIP_STATUSES.forEach(status => {
        this.aipStatusStats.set(status, 0);
      });

      // Count AIPs by status
      aips.forEach(aip => {
        if (aip.status && this.aipStatusStats.has(aip.status)) {
          const currentCount = this.aipStatusStats.get(aip.status) || 0;
          this.aipStatusStats.set(aip.status, currentCount + 1);
        }
      });
    }

    getStatusPercentage(status: AipStatus): number {
      if (this.totalAips === 0) return 0;
      const count = this.aipStatusStats.get(status) || 0;
      return Math.round((count / this.totalAips) * 100);
    }

    getStatusCountFormatted(status: AipStatus): string {
      const count = this.aipStatusStats.get(status) || 0;
      return `${count}/${this.totalAips}`;
    }

    isSchoolAdmin(): boolean {
      return this.userRole === UserType.SchoolAdmin;
    }

    isDivisionAdmin(): boolean {
      return this.userRole === UserType.DivisionAdmin;
    }

    shouldShowStats(): boolean {
      return this.isSchoolAdmin() || this.isDivisionAdmin();
    }

    getWelcomeHeaderName(): string {
      switch (this.userRole) {
        case UserType.SchoolAdmin:
          return this.schoolInfo?.schoolName ?? '';
        case UserType.DivisionAdmin:
          return this.divisionName;
        default:
          return '-';
      }
    }

    navigateToAip(): void {
      this.router.navigate(['/school-admin/aip']);
    }
  }
