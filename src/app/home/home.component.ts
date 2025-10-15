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

interface TreeNode {
    name: string;
    children?: TreeNode[];
    expanded?: boolean;
    count?: number;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, MatBadgeModule, MatIcon, MatProgressBarModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']

})
export class HomeComponent implements OnInit {
  name: string | undefined;
  userRole: string | undefined;
  schoolName: string = '';

  treeData: TreeNode[] = [];
  schoolNeedData: any[] = [];
  isLoading: boolean = true;

    constructor(
      private readonly userService: UserService,
      private readonly router: Router,
      private readonly referenceDataService: ReferenceDataService,
      private readonly schoolNeedService: SchoolNeedService,
      private readonly authService: AuthService,
    ) {
    }

  ngOnInit(): void {
    this.name = this.authService.getName();
    this.userRole = this.authService.getRole();

    if (!this.name || !this.userRole) {
      console.warn('User information is incomplete.');
    }

    this.loadSchoolNeeds();
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

    private fetchAllSchoolNeeds(page= 1, size = 10000, acc: any[] = []): Observable<{data: any[], schoolName: string}> {
      return this.schoolNeedService.getSchoolNeeds(page, size, getSchoolYear(), undefined, undefined, true).pipe(
        switchMap(res => {
          const currentData = res?.data ?? [];
          const allData = [...acc, ...currentData];

          // Capture school name from the first response
          if (page === 1 && res?.school?.schoolName) {
            this.schoolName = res.school.schoolName;
          }

          if(currentData.length < size) {
            return of({data: allData, schoolName: this.schoolName});
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
  }
