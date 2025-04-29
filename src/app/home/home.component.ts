import { Component } from '@angular/core';
import { UserService } from '../services/user.service';
import { CommonModule } from '@angular/common';
import { MatBadgeModule } from '@angular/material/badge';
import { Router } from '@angular/router';

// TreeNode interface to define the structure of each node
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

  // Tree data structure
  treeData: TreeNode[] = [
    {
      name: 'APPLIANCES AND EQUIPMENT',
      children: [
        { name: 'Air-conditioning Units', count: 5 },
        { name: 'Cctv', count: 10 },
        { name: 'Classroom And Cleaning Materials ', count: 10 },
        { name: 'Drr Equipment ', count: 5 },
        { name: 'Fans ', count: 10 },
        { name: 'Fire Alarm ', count: 10 },
        { name: 'Fire Extinguisher ', count: 5 },
        { name: 'Fire Extinguishers ', count: 10 },
        { name: 'Fire Hose ', count: 10 },
        { name: 'Flashlight ', count: 5 },
        { name: 'Freezer', count: 10 },
        { name: 'Gardening Tools', count: 10 },
        { name: 'Gas Stove', count: 5 },
        { name: 'Glassware', count: 10 },
        { name: 'Go Bags ', count: 5 },
        { name: 'Handheld Radio ', count: 10 },
        { name: 'Hard Hats ', count: 10 },
        { name: 'Head Immobilizer ', count: 5 },
        { name: 'Kitchen Ware ', count: 10 },
        { name: 'Laminator ', count: 10 },
        { name: 'Lapel ', count: 5 },
        { name: 'Lifting Rope ', count: 10 },
        { name: 'Megaphone ', count: 10 },
        { name: 'Musical Instruments ', count: 5 },
        { name: 'Oven ', count: 10 },
        { name: 'Pail ', count: 10 },
        { name: 'Radio ', count: 5 },
        { name: 'Radio Broadcast Equipment ', count: 10 },
        { name: 'Risograph ', count: 10 },
        { name: 'Rostrum/podium ', count: 5 },
        { name: 'Science Laboratory Equipment ', count: 10 },
        { name: 'Sewing Machine ', count: 10 },
        { name: 'Siren ', count: 10 },
        { name: 'Solar Panels  ', count: 10 },
        { name: 'Sound System ', count: 10 },
        { name: 'Spine Board With Strap', count: 10 },
        { name: 'Spiral Machine ', count: 10 },
        { name: 'Sports Equipment ', count: 10 }
      ],
      expanded: false // Initialize expansion state
    },
    {
      name: 'APPLIANCES AND EQUIPMENT(2)',
      children: [
        { name: 'Sprinkler', count: 5 },
        { name: 'Sterilization Equipment ', count: 5 },
        { name: 'Tent  ', count: 5 },
        { name: 'Traffic Vest ', count: 10 },
        { name: 'Weighing Scale ', count: 10 }
      ],
      expanded: false 
    },
    {
      name: 'CONSTRUCTION MATERIALS',
      children: [
        { name: 'Cement ', count: 5 },
        { name: 'Enamel Paint', count: 10 },
        { name: 'Flourescent (led)', count: 10 },
        { name: 'G.i. Sheets ', count: 5 },
        { name: 'Lacquer Thinner', count: 10 },
        { name: 'Latex Paint', count: 10 },
        { name: 'Paint Brush ', count: 5 },
        { name: 'Paint Pads ', count: 10 },
        { name: 'Paint Roller  ', count: 5 },
        { name: 'Paint Roller  ', count: 10 }
      ],
      expanded: false 
    },
    {
      name: 'DIRECT ASSISTANCE',
      children: [
        { name: 'Allowance ', count: 5 },
        { name: 'Stipends ', count: 10 }
      ],
      expanded: false 
    },
    {
      name: 'FURNITURE',
      children: [
        { name: 'Armchairs ', count: 10 },
        { name: 'Blackboard ', count: 10 },
        { name: 'Desks', count: 5 },
        { name: 'Door ', count: 10 },
        { name: 'Monoblock Chairs  ', count: 10 },
        { name: 'Shelves/cabinets', count: 5 },
        { name: 'Sofa/sala Sets ', count: 10 },
        { name: 'Tables ', count: 10 },
        { name: 'Teachers Chair ', count: 5 },
        { name: 'Teachers Table', count: 10 },
        { name: 'Window/panels ', count: 10 }
      ],
      expanded: false 
    },
    {
      name: 'HEALTH AND NUTRITION',
      children: [
        { name: 'Assistive Devices ', count: 10 },
        { name: 'Dental Services ', count: 10 },
        { name: 'Eyeglasses', count: 5 },
        { name: 'Feeding Program  ', count: 10 },
        { name: 'First Aid/emergency Kits ', count: 10 },
        { name: 'Germicidal Soap', count: 5 },
        { name: 'Handwashing Hygiene Info Materials ', count: 10 },
        { name: 'Medical Check-up ', count: 10 },
        { name: 'Medicine ', count: 5 },
        { name: 'Milk ', count: 10 },
        { name: 'Multivitamins  ', count: 10 },
        { name: 'Personal Hygiene Kit  ', count: 5 },
        { name: 'Rubber Mat ', count: 10 },
        { name: 'Seedlings/saplings', count: 10 },
        { name: 'Seeds', count: 10 },
        { name: 'Sports Clinic ', count: 5 },
        { name: 'Vitamins ', count: 10 },
        { name: 'Wheelchair ', count: 10 }
      ],
      expanded: false 
    },
    {
      name: 'INFRASTRUCTURE',
      children: [
        { name: 'Classroom Pipeline Installation', count: 10 },
        { name: 'Classroom Pipeline Repair ', count: 10 },
        { name: 'Classroom Repair', count: 5 },
        { name: 'Clinic Repair ', count: 10 },
        { name: 'Comfort Room Construction ', count: 10 },
        { name: 'Comfort Room Repair  ', count: 5 },
        { name: 'Construction Of Fence  ', count: 10 },
        { name: 'Construction Of Fence And Gate ', count: 10 },
        { name: 'Construction Of Gate ', count: 5 },
        { name: 'Construction Of Multipurpose Building', count: 10 },
        { name: 'Construction Of Reading Center', count: 10 },
        { name: 'Construction Of School Canteen ', count: 5 },
        { name: 'Construction Of School Landmark ', count: 10 },
        { name: 'Construction Of School Park', count: 10 },
        { name: 'Construction Of School Signage', count: 5 },
        { name: 'Construction Of Sports Facilities', count: 10 },
        { name: 'Covered Court Repair', count: 10 },
        { name: 'Drainage System', count: 5 },
        { name: 'Electrical Facilities Provision ', count: 10 },
        { name: 'Electrical Facilities Repair', count: 10 },
        { name: 'Feeding Center ', count: 5 },
        { name: 'Fence And Gate Repair', count: 10 },
        { name: 'Handwashing Facility Repair ', count: 10 },
        { name: 'Hardware/construction Materials  ', count: 5 },
        { name: 'HE Building Repair ', count: 10 },
        { name: 'Laboratory Repair ', count: 5 },
        { name: 'Land/real Property Donation', count: 10 },
        { name: 'Landscaping', count: 10 },
        { name: 'Library Repair ', count: 5 }, 
        { name: 'New Classroom Construction ', count: 10 },
        { name: 'New Covered Court Construction ', count: 10 },
        { name: 'New Dormitory Construction', count: 5 },
        { name: 'New Handwashing Facility Construction ', count: 10 },
        { name: 'New Laboratory Constructions  ', count: 10 },
        { name: 'New Library Construction', count: 10 },
        { name: 'New Pathwalk Construction ', count: 5 },
        { name: 'New Stage Construction', count: 10 },
        { name: 'Office Repair', count: 10 },
        { name: 'Reading Center Repair', count: 5 },
        { name: 'Repair Of Sports Facilities ', count: 10 }
      ],
      expanded: false 
    },
    {
      name: 'LEARNERS TRAINING NEEDS',
      children: [
        { name: 'Adolescent Reproductive Health', count: 10 },
        { name: 'DRR ', count: 10 },
        { name: 'Drug Prevention Training ', count: 5 },
        { name: 'First Aid Training ', count: 10 },
        { name: 'Leadership Training ', count: 10 },
        { name: 'Mental Health', count: 5 }
      ],
      expanded: false 
    },
    {
      name: 'MISCELLANEOUS',
      children: [
        { name: 'Payment For Cloud Storage  ', count: 10 },
        { name: 'Payment For Electricity', count: 10 },
        { name: 'Payment For Internet ', count: 5 },
        { name: 'Payment For Water', count: 10 },
        { name: 'Salary For Job Orders ', count: 10 },
        { name: 'Salary For Labor', count: 5 }
      ],
      expanded: false 
    },
    {
      name: 'OFFICE SUPPLIES',
      children: [
        { name: 'Bond Paper  ', count: 5 },
        { name: 'Curtain ', count: 10 },
        { name: 'Ink ', count: 10 },
        { name: 'Textiles', count: 5 }
      ],
      expanded: false 
    },
    {
      name: 'PERSONAL PROTECTIVE EQUIPMENT',
      children: [
        { name: 'Alcohol(70%) ', count: 10 },
        { name: 'Disinfectant Spray/disinfecting Bleach ', count: 10 },
        { name: 'Face Mask  ', count: 5 },
        { name: 'Face Shield', count: 10 },
        { name: 'Hand Soap', count: 10 },
        { name: 'Surgical Gloves ', count: 5 },
        { name: 'Thermal Scanner ', count: 10 }
      ],
      expanded: false 
    },
    {
      name: 'PERSONNEL SUPPORT',
      children: [
        { name: 'Teaching And Learning Aids And Devices ', count: 5 },
        { name: 'Training Skills Development And Scholarship ', count: 10 }
      ],
      expanded: false 
    },
    {
      name: 'SCHOOL SUPPLIES AND UNIFORMS',
      children: [
        { name: 'Bags ', count: 10 },
        { name: 'Bicycles ', count: 10 },
        { name: 'Boats ', count: 5 },
        { name: 'Books', count: 10 },
        { name: 'Footwear ', count: 10 },
        { name: 'Lamps', count: 5 },
        { name: 'Learning Modules', count: 10 },
        { name: 'Raincoat ', count: 10 },
        { name: 'Reference Materials', count: 5 },
        { name: 'School Supplies', count: 10 },
        { name: 'Uniform ', count: 10 }
      ],
      expanded: false 
    },
    {
      name: 'SPECIAL NEEDS',
      children: [
        { name: 'Braille ', count: 10 },
        { name: 'Crutches ', count: 5 },
        { name: 'Hearing Aid ', count: 10 },
        { name: 'Wheelchair ', count: 10 }
      ],
      expanded: false 
    },
    {
      name: 'TECHNOLOGY',
      children: [
        { name: 'Cellphone ', count: 10 },
        { name: 'Computer Peripherals', count: 10 },
        { name: 'Computers ', count: 5 },
        { name: 'Dvd Player  ', count: 10 },
        { name: 'E-books ', count: 10 },
        { name: 'E-channel Subscription  ', count: 5 },
        { name: 'Fax Machine  ', count: 10 },
        { name: 'Flash Drive', count: 10 },
        { name: 'Free Airtime On Cable/tv', count: 5 },
        { name: 'Free Airtime On Radio  ', count: 10 },
        { name: 'Grass Cutter ', count: 10 },
        { name: 'Internet Connectivity ', count: 5 },
        { name: 'Laptops', count: 10 },
        { name: 'Lcd Projector ', count: 10 },
        { name: 'Photocopier ', count: 5 },
        { name: 'Printer ', count: 10 },
        { name: 'Scanner', count: 10 },
        { name: 'Sim Card ', count: 5 },
        { name: 'Sms Communication ', count: 10 },
        { name: 'Software  ', count: 10 },
        { name: 'Tablet ', count: 5 },
        { name: 'Tablets ', count: 10 },
        { name: 'Telephone Line', count: 10 },
        { name: 'Television ', count: 5 },
        { name: 'Touch Board ', count: 5 },
        { name: 'White Screen', count: 10 }
      ],
      expanded: false 
    },
    {
      name: 'VOLUNTEER HOURS',
      children: [
        { name: 'Carpentry ', count: 10 },
        { name: 'Electrical/electronics ', count: 10 },
        { name: 'Landscaping/gardening ', count: 5 },
        { name: 'Masonry ', count: 10 },
        { name: 'Ordinary Labor ', count: 10 },
        { name: 'Painting ', count: 5 },
        { name: 'Plumbing ', count: 10 },
        { name: 'Reading Volunteer ', count: 10 }
      ],
      expanded: false 
    },
  ];

    constructor(private userService: UserService, private router: Router) {
      this.userName = this.userService.getUserName(); // Retrieves the user's name
      console.log('User name retrieved in HomeComponent:', this.userName);
      this.userRole = this.userService.getRole(); // Fetch user role from UserService
    }
  
    toggleChildren(node: TreeNode): void {
      if (node.children && Array.isArray(node.children)) {
        // Toggle the expanded state if there are children
        node.expanded = !node.expanded; 
      }
    }
  
    onChildClick(child: TreeNode): void {
      let path: string; // Declare a path variable
  
      // Determine the path based on the user role
      switch (this.userRole) {
        case 'schoolAdmin':
          path = '/school-admin'; // Navigate to School Admin Component
          break;
        case 'stakeholder':
          path = '/stakeholders'; // Navigate to Stakeholder Component
          break;
        case 'divisionAdmin':
          path = '/division-admin'; // Navigate to Division Admin Component
          break;
        default:
          path = '/home'; // Fallback path if the user role is unmatched
          break;
      }
  
      console.log(`Clicked child: ${child.name}`); // Log which child was clicked
      console.log(`Navigating to: ${path}`); // Log the path before navigation
  
      this.router.navigate([path]);
    }
  
    getContributions(): string[] {
      return this.treeData.map(node => {
        const contributionType = node.name;
        const specificContributions = node.children?.map(child => child.name).join(', ') || 'No specific contributions';
        return `Contribution type: ${contributionType}, Specific Contribution: ${specificContributions}`;
      });
    }
  
    onImageClick(): void {
      console.log('Image clicked');
    }
  }