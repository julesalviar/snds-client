import { Component } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { ReactiveFormsModule } from '@angular/forms'; 
import { CommonModule } from '@angular/common'; 
import { MatCard, MatCardTitle } from '@angular/material/card';

interface Stakeholder {
  name: string;
}

@Component({
  selector: 'app-quick-count',
  standalone: true,
  imports:[
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatButtonModule,
    ReactiveFormsModule,
    CommonModule,
    MatCardTitle,
    MatCard
  ],
  templateUrl: './quick-count.component.html',
  styleUrls: ['./quick-count.component.css']

})
export class QuickCountComponent {
  count: number = 0;
  dataSource: any[] = [];
  stakeholders: Stakeholder[] = [
    { name: 'ASP Fund' },
    { name: 'BEFF' },
    { name: 'BFP' },
    { name: 'Brigada Eskwela Program Fund' },
    { name: 'Congressional Office' },
    { name: 'City Agriculture Office' },
    { name: 'CDRRMC' },
    { name: 'City Engineering Office' },
    { name: 'CENRO' },
    { name: 'City Health Office' },
    { name: 'DepEd-CO' },
    { name: 'DepEd- RO' },
    { name: 'DepEd - DO' },
    { name: 'Federated PTA' },
    { name: 'DA' },
    { name: 'DENR' },
    { name: 'DOH' },
    { name: 'DPWH' },
    { name: 'DTI' },
    { name: 'DOST' },
    { name: 'DSWD' },
    { name: 'DRRM Fund' },
    { name: 'IPeD Fund' },
    { name: 'LGU - Province' },
    { name: 'LGU- Municipality' },
    { name: 'LGU-City' },
    { name: 'LGU - Barangay' },
    { name: 'LR Fund' },
    { name: 'OP of the Philippines' },
    { name: 'OVP of the Philippines' },
    { name: 'OCD' },
    { name: 'Philippine Army' },
    { name: 'PESPA' },
    { name: 'PNP' },
    { name: 'MEP Fund' },
    { name: 'NAPSSHI' },
    { name: 'Robotics Equipment Fund' },
    { name: 'School Alumni' },
    { name: 'School Canteen' },
    { name: 'School IGP' },
    { name: 'School MOOE' },
    { name: 'Homeroom PTA' },
    { name: 'Grade Level PTA' },
    { name: 'School PTA' },
    { name: 'School Teachers Association' },
    { name: 'SBFP' },
    { name: 'Science & Math Equipment Fund' },
    { name: 'Senate Office' },
    { name: 'SHS TVL Equipment Fund' },
    { name: 'Special Education Fund' },
    { name: 'SELG' },
    { name: 'SSLG' },
    { name: 'TESDA' },
  ];

  quickCountForm: FormGroup;
  totalAmount: number = 0;

  constructor(private fb: FormBuilder) {
    this.quickCountForm = this.fb.group({
      date: [new Date()],
      stakeholder: [''],
      numberOfRepresentatives: [0],
      donatedItems: [''],
      quantity: [0],
      unit: [''],
      amount: [0]
    });
  }

  save() {
    const formValue = this.quickCountForm.value;
    this.dataSource.push({
      date: formValue.date,
      stakeholder: formValue.stakeholder,
      numberOfRepresentatives: formValue.numberOfRepresentatives,
      donatedItems: formValue.donatedItems,
      quantity: formValue.quantity,
      amount: formValue.amount
    });
    this.totalAmount += formValue.amount;
    this.quickCountForm.reset({ date: new Date() });
  }
}