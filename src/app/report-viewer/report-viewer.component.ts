import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';
import {MatOption} from "@angular/material/core";
import {MatFormField, MatLabel, MatSelect} from "@angular/material/select";
import {MatIconModule} from "@angular/material/icon";
import {MatIconButton} from "@angular/material/button";

@Component({
  selector: 'app-report-viewer',
  standalone: true,
  imports: [CommonModule, NgxExtendedPdfViewerModule, MatOption, MatSelect, MatLabel, MatFormField, MatIconModule, MatIconButton],
  templateUrl: './report-viewer.component.html',
  styleUrls: ['./report-viewer.component.css']
})
export class ReportViewerComponent implements OnInit, OnDestroy {
  pdfSrc: string = '/assets/sample.pdf';
  errorMessage: string | null = null;
  isCollapsed: boolean = false;
  isMobile: boolean = false;
  private resizeListener?: () => void;

  ngOnInit(): void {
    // Try to verify the PDF path
    console.log('PDF Source:', this.pdfSrc);
    this.checkMobile();
    this.resizeListener = () => this.checkMobile();
    window.addEventListener('resize', this.resizeListener);
  }

  ngOnDestroy(): void {
    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
    }
  }

  private checkMobile(): void {
    this.isMobile = window.innerWidth <= 768;
  }

  onError(event: any): void {
    console.error('PDF Error:', event);
    this.errorMessage = 'Failed to load PDF. Please check the console for details.';
  }

  togglePanel(): void {
    this.isCollapsed = !this.isCollapsed;
  }

  getChevronIcon(): string {
    if (this.isMobile) {
      // Mobile: up/down chevrons (chevron on right, collapses upward)
      // When expanded: chevron_down (pointing down to collapse upward)
      // When collapsed: chevron_up (pointing up to expand downward)
      return this.isCollapsed ? 'keyboard_arrow_up' : 'keyboard_arrow_down';
    } else {
      // Desktop: left/right chevrons (chevron on top, panel on left)
      // When expanded: chevron_left (pointing left to collapse)
      // When collapsed: chevron_right (pointing right to expand)
      return this.isCollapsed ? 'keyboard_arrow_right' : 'keyboard_arrow_left';
    }
  }
}

