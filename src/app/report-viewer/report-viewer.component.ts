import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';
import {MatOption} from "@angular/material/core";
import {MatFormField, MatLabel, MatSelect} from "@angular/material/select";

@Component({
  selector: 'app-report-viewer',
  standalone: true,
  imports: [CommonModule, NgxExtendedPdfViewerModule, MatOption, MatSelect, MatLabel, MatFormField],
  templateUrl: './report-viewer.component.html',
  styleUrls: ['./report-viewer.component.css']
})
export class ReportViewerComponent implements OnInit {
  pdfSrc: string = '/assets/sample.pdf';
  errorMessage: string | null = null;

  ngOnInit(): void {
    // Try to verify the PDF path
    console.log('PDF Source:', this.pdfSrc);
  }

  onError(event: any): void {
    console.error('PDF Error:', event);
    this.errorMessage = 'Failed to load PDF. Please check the console for details.';
  }
}

