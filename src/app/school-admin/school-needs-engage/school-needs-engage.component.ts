import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatCard, MatCardTitle, MatCardContent } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatDatepickerModule, MatDatepickerToggle } from '@angular/material/datepicker';
import { MatNativeDateModule, MatOption } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { SharedDataService } from '../../common/services/shared-data.service';
import { FormsModule } from '@angular/forms';
import { MatSelect } from '@angular/material/select';

@Component({
  selector: 'app-school-needs-engage',
  standalone: true,
  imports: [
    CommonModule,
    MatOption,
    MatInputModule,
    MatDatepickerModule,
    FormsModule,
    MatNativeDateModule,
    MatTableModule,
    MatCard,
    MatCardTitle,
    MatTooltipModule,
    MatCardContent,
    MatFormField,
    MatLabel,
    MatDatepickerToggle,
    MatSelect
  ],
  templateUrl: './school-needs-engage.component.html',
  styleUrls: ['./school-needs-engage.component.css']
})
export class SchoolNeedsEngageComponent implements OnInit {
  needCode: string | null = null;
  stakeholderName: string = '';
  moaDate: Date | null = null;
  quantityDonated: number | null = null;
  unit: string = '';
  amount: number | null = null;
  startDate: Date | null = null;
  endDate: Date | null = null;

  // Define the stakeholders array
  stakeholders: string[] = [
    'ASP Fund',
    'BEFF',
    'BFP',
    'Brigada Eskwela Program Fund',
    'Congressional Office',
    'City Agriculture Office',
    'CDRRMC',
    'City Engineering Office',
    'CENRO',
    'City Health Office',
    'DepEd-CO',
    'DepEd- RO',
    'DepEd - DO',
    'Federated PTA',
    'DA',
    'DENR',
    'DOH',
    'DPWH',
    'DTI',
    'DOST',
    'DSWD',
    'DRRM Fund',
    'IPeD Fund',
    'LGU - Province',
    'LGU- Municipality',
    'LGU-City',
    'LGU - Barangay',
    'LR Fund',
    'OP of the Philippines',
    'OVP of the Philippines',
    'OCD',
    'Philippine Army',
    'PESPA',
    'PNP',
    'MEP Fund',
    'NAPSSHI',
    'Robotics Equipment Fund',
    'School Alumni',
    'School Canteen',
    'School IGP',
    'School MOOE',
    'Homeroom PTA',
    'Grade Level PTA',
    'School PTA',
    'School Teachers Association',
    'SBFP',
    'Science & Math Equipment Fund',
    'Senate Office',
    'SHS TVL Equipment Fund',
    'Special Education Fund',
    'SELG',
    'SSLG',
    'TESDA'
  ];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly sharedDataService: SharedDataService
  ) {}

  ngOnInit(): void {
    this.needCode = this.route.snapshot.paramMap.get('code');
    if (this.needCode) {
      console.log('Engaging with need code:', this.needCode);
    }
  }

  saveEngagement(): void {
    console.log('Stakeholder Name:', this.stakeholderName);
    console.log('MOA Date:', this.moaDate);
    console.log('Quantity Donated:', this.quantityDonated);
    console.log('Unit:', this.unit);
    console.log('Amount:', this.amount);
    console.log('Start Date:', this.startDate);
    console.log('End Date:', this.endDate);

    if (this.needCode) {
      this.sharedDataService.updateEngagementStatus(this.needCode, true);
      console.log('Engaged with need code:', this.needCode);
    }

    this.clearForm();
  }

  clearForm(): void {
    this.stakeholderName = '';
    this.moaDate = null;
    this.quantityDonated = null;
    this.unit = '';
    this.amount = null;
    this.startDate = null;
    this.endDate = null;
  }
}
