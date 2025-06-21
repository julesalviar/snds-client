import { Component, OnInit } from '@angular/core';
import { UserService } from '../../common/services/user.service';
import { MatTable, MatTableModule } from '@angular/material/table';
import { CommonModule } from '@angular/common';
import { MatCardTitle } from '@angular/material/card';

@Component({
  selector: 'app-all-school',
  standalone: true,
  imports: [MatTable, CommonModule, MatTableModule, MatCardTitle],
  templateUrl: './all-school.component.html',
  styleUrls: ['./all-school.component.css']
})
export class AllSchoolComponent implements OnInit {
  displayedColumns: string[] = ['schoolName', 'schoolId', 'accountableName', 'designation', 'contactNumber', 'actions'];
  schoolList: any[] = [];

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    // Temporary data for testing
    this.schoolList = [
      {
        schoolName: 'Green Valley High School',
        schoolId: 'GVHS123',
        accountableName: 'John Doe',
        designation: 'Principal',
        contactNumber: '123-456-7890',
        hasEncodedNeeds: true // Indicates if there are encoded needs
      },
      {
        schoolName: 'National High School',
        schoolId: 'NH456',
        accountableName: 'Jane Smith',
        designation: 'Administrator',
        contactNumber: '987-654-3210',
        hasEncodedNeeds: false // No encoded needs
      },
      {
        schoolName: 'Elementary School',
        schoolId: 'ES789',
        accountableName: 'Emily Johnson',
        designation: 'Vice Principal',
        contactNumber: '555-123-4567',
        hasEncodedNeeds: true // Indicates if there are encoded needs
      }
    ];
      //user servicde subscibe
     // this.userService.schools$.subscribe(schools => {
    //   this.schoolList = schools;
    // });
  }

  viewNeeds(school: any): void {
    console.log('View needs for:', school);
  }

  noEncodedNeeds(school: any): void {
    console.log('No encoded needs for:', school);
  }
}
