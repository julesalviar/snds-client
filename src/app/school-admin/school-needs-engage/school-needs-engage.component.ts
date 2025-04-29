import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatCard, MatCardTitle } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardContent } from '@angular/material/card';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatDatepickerModule, MatDatepickerToggle } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { SharedDataService } from '../../services/shared-data.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-school-needs-engage',
  standalone: true,
  imports: [CommonModule, MatInputModule, MatDatepickerModule, FormsModule,MatNativeDateModule, MatTableModule, MatCard, MatCardTitle, MatTooltipModule, MatCardContent, MatFormField, MatLabel, MatDatepickerToggle], 
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

  constructor(
    private route: ActivatedRoute,
    private sharedDataService: SharedDataService // Inject the shared data service
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
      this.sharedDataService.updateEngagementStatus(this.needCode, true); // Mark as engaged
      console.log('Engaged with need code:', this.needCode);
    }

    // Clear all data after engagement
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