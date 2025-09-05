import {Component, OnInit} from '@angular/core';
import { UserService } from '../common/services/user.service';
import { CommonModule } from '@angular/common';
import { MatBadgeModule } from '@angular/material/badge';
import { Router } from '@angular/router';
import {ReferenceDataService} from "../common/services/reference-data.service";
import {SchoolNeedService} from "../common/services/school-need.service";
import {AuthService} from "../auth/auth.service";
import {forkJoin, Observable, of, switchMap} from "rxjs";

interface TreeNode {
    name: string;
    children?: TreeNode[];
    expanded?: boolean;
    count?: number;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, MatBadgeModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']

})
export class HomeComponent implements OnInit {
  userName: string | undefined;
  userRole: string | undefined;

  treeData: TreeNode[] = [];
  schoolNeedData: any[] = [];

    constructor(
      private readonly userService: UserService,
      private readonly router: Router,
      private readonly referenceDataService: ReferenceDataService,
      private readonly schoolNeedService: SchoolNeedService,
      private readonly authService: AuthService,
    ) {
    }

  ngOnInit(): void {
    this.userName = this.authService.getUsername();
    this.userRole = this.authService.getRole();

    if (!this.userName || !this.userRole) {
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
      // Find the selected contribution type based on the clicked child
      const selectedContribution = {
          name: this.treeData.find(node => node.children?.includes(child))?.name,
          specificContribution: child.name
      };

      // Set the contribution data in the service
      this.userService.setContribution(selectedContribution);

      // Navigate to the School Admin based on the user role
      let path: string;

      switch (this.userRole) {
        case 'schoolAdmin':
          path = '/school-admin';
          break;
        case 'stakeholder':
          path = '/stakeholders';
          break;
        case 'divisionAdmin':
          path = '/division-admin';
          break;
        default:
          path = '/home';
          console.warn(`Unknown or undefined role: ${this.userRole}`);
          break;
      }

      this.router.navigate([path]);
  }


    getContributions(): string[] {
      return this.treeData.map(node => {
        const contributionType = node.name;
        const specificContributions = node.children?.map(child => child.name).join(', ') ?? 'No specific contributions';
        return `Contribution type: ${contributionType}, Specific Contribution: ${specificContributions}`;
      });
    }

    onImageClick(): void {
      console.log('Image clicked');
    }

    private loadTreeTemplate(): void {
      this.treeData = this.referenceDataService.get<TreeNode[]>('contributionTree');
    }

    private fetchAllSchoolNeeds(page= 1, size = 1000, acc: any[] = []): Observable<any[]> {
      return this.schoolNeedService.getSchoolNeeds(page, size).pipe(
        switchMap(res => {
          const currentData = res?.data ?? [];
          const allData = [...acc, ...currentData];

          if(currentData.length < size) {
            return of(allData);
          }

          return this.fetchAllSchoolNeeds(page + 1, size, allData);
        })
      )
    }

    private loadSchoolNeeds(): void {

      forkJoin({
        tree: of(this.referenceDataService.get<TreeNode[]>('contributionTree')),
        needs: this.fetchAllSchoolNeeds()
      }).subscribe({
        next: ({ tree, needs }) => {
          this.treeData = tree;
          this.schoolNeedData = needs;

          this.mapCountsToTree(needs);
        },
        error: (err) => {
          console.error('Error fetching school needs:', err);
        }
      })
    }

    private mapCountsToTree(needs: any[]): void {
      for (const node of this.treeData) {
        let countTotal = 0;

        if(node.children) {
          for (const child of node.children) {
            const count = needs.filter(
              need => need.specificContribution === child.name
            ).length;

            child.count = count;
            countTotal += count;
          }
        }

        node.count = countTotal;
      }
    }
  }
