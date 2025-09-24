import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatHeaderRow, MatHeaderRowDef, MatRowDef } from '@angular/material/table'; 
import { MatTableModule } from '@angular/material/table';
@Component({
  selector: 'app-my-contribution',
  standalone: true,
  templateUrl: './my-contribution.component.html',
  styleUrls: ['./my-contribution.component.css'],
  imports: [CommonModule, 
    MatHeaderCellDef, 
    MatHeaderCell,
    MatCellDef, 
    MatHeaderRow,
    MatHeaderRowDef, 
    MatRowDef,
    MatTableModule]
})
export class MyContributionComponent implements OnInit {
  displayedColumns: string[] = ['need', 'schoolName', 'engaged', 'amount', 'status', 'movs'];
  dataSource = new MatTableDataSource<Contribution>([
    {
      need: 'Books',
      schoolName: 'Example School',
      engaged: new Date(2023, 0, 15),
      amount: 500,
      status: 'Completed',
      movs: 'Receipt #1234'
    },
    {
      need: 'Stationery',
      schoolName: 'Elementary School',
      engaged: new Date(2023, 1, 20),
      amount: 300,
      status: 'Pending',
      movs: 'N/A'
    }
  ]);

  constructor() {}

  ngOnInit(): void {
    // Add the contributions from a service or API
  }
}

interface Contribution {
  need: string;
  schoolName: string;
  engaged: Date;
  amount: number;
  status: string;
  movs: string;
}