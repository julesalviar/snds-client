import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-school-need-view',
  standalone: true,
  imports: [],
  templateUrl: './school-need-view.component.html',
  styleUrls: ['./school-need-view.component.css'] // Corrected here
})
export class SchoolNeedViewComponent implements OnInit {
  code: string | null = null;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.code = this.route.snapshot.paramMap.get('code');
    console.log('View component code:', this.code);
   
  }
}