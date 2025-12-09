import { Component, ViewChild, AfterViewInit } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';

// Interface for resource entries for sample data
interface ResourceEntry {
  dateEngage?: Date | null;  
  stakeholderName: string;
  numberOfRepresentatives: number | null;  
  specificContribution: string;
  quantity: number | null;  
  unit: string;
  amount: number | null;  
}

@Component({
  selector: 'app-generated-resources',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatCardModule, MatPaginatorModule],
  templateUrl: './generated-resources.component.html',
  styleUrls: ['./generated-resources.component.css'] 
})
export class GeneratedResourcesComponent implements AfterViewInit {
  
  displayedColumns: string[] = [
    'dateEngage',
    'stakeholder',
    'numberOfRepresentatives',
    'specificContribution',
    'quantity',
    'unit',
    'amount'
  ];

  // Sample data
  dataSource = new MatTableDataSource<ResourceEntry>([
    {
      dateEngage: new Date(),
      stakeholderName: 'Gensan Foundation',
      numberOfRepresentatives: 3,
      specificContribution: 'Cement',
      quantity: 50,
      unit: 'Bags',
      amount: 10000.00,
    },
    {
      dateEngage: new Date(),
      stakeholderName: 'Ardian Macascas',
      numberOfRepresentatives: 2,
      specificContribution: 'Cement',
      quantity: 20,
      unit: 'Bags',
      amount: 5000.00,
    },
    {
      dateEngage: new Date(),
      stakeholderName: 'Gerome Sample',
      numberOfRepresentatives: 2,
      specificContribution: 'Cement',
      quantity: 15,
      unit: 'Bags',
      amount: 15000.00,
    },
  ]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor() {
    this.addTotalRow();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator; 
  }

  addTotalRow() {
    const totalRepresentatives = this.dataSource.data.reduce((total, entry) => {
      return total + (entry.numberOfRepresentatives || 0);
    }, 0);

    const totalAmount = this.dataSource.data.reduce((total, entry) => {
      return total + (entry.amount || 0);
    }, 0);

    this.dataSource.data.push({
      dateEngage: null,
      stakeholderName: 'Total',
      numberOfRepresentatives: totalRepresentatives,
      specificContribution: '',
      quantity: null,
      unit: '',
      amount: totalAmount,
    });

    this.dataSource._updateChangeSubscription();
  }
}