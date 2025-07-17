import { Component } from '@angular/core';
import { UserService } from '../common/services/user.service';
import { CommonModule } from '@angular/common';
import { MatBadgeModule } from '@angular/material/badge';
import { Router } from '@angular/router';
import {ReferenceDataService} from "../common/services/reference-data.service";

interface TreeNode {
    name: string;
    children?: TreeNode[];
    expanded?: boolean;
    count?: number;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [ CommonModule, MatBadgeModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']

})
export class HomeComponent {
  userName: string;
  userRole: string;

  treeData: TreeNode[] = [];

    constructor(
      private readonly userService: UserService,
      private readonly router: Router,
      private readonly referenceDataService: ReferenceDataService
    ) {
      this.userName = this.userService.getUserName(); // Retrieves the user's name
      console.log('User name retrieved in HomeComponent:', this.userName);
      this.userRole = this.userService.getRole(); // Fetch user role from UserService
      this.treeData = this.referenceDataService.get<TreeNode[]>('contributionTree');
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
  }
