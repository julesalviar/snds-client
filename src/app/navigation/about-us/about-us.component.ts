import { Component, OnInit } from '@angular/core';
import { MatCardModule } from "@angular/material/card";
import { CommonModule } from '@angular/common';
import { InternalReferenceDataService } from "../../common/services/internal-reference-data.service";

@Component({
  selector: 'app-about-us',
  standalone: true,
  imports: [MatCardModule, CommonModule],
  templateUrl: './about-us.component.html',
  styleUrl: './about-us.component.css'
})
export class AboutUsComponent implements OnInit {
  email: string = '';
  landline: string = '';
  mobile: string = '';
  image: string = '';
  contactName: string = '';
  contactTitle: string = '';
  contactAddress: string = '';
  aboutUs: string = '';

  constructor(
    private readonly internalReferenceDataService: InternalReferenceDataService
  ) {}

  ngOnInit(): void {
    this.loadAboutContent();
  }

  private async loadAboutContent(): Promise<void> {
    await this.internalReferenceDataService.initialize();
    const aboutContent = this.internalReferenceDataService.get('about_content');

    if (aboutContent) {
      this.aboutUs = aboutContent.aboutUs ?? '';
      this.email = aboutContent.email ?? '';
      this.landline = aboutContent.landline ?? '';
      this.mobile = this.formatMobileNumber(aboutContent.mobile ?? '');
      this.image = aboutContent.image ?? '';
      this.contactName = aboutContent.contactName ?? '';
      this.contactTitle = aboutContent.contactTitle ?? '';
      this.contactAddress = aboutContent.contactAddress ?? '';
    }
  }

  private formatMobileNumber(mobile: string): string {
    if (!mobile) return '';
    const cleanMobile = mobile.replace(/\D/g, '');

    let formattedNumber = '';

    if (cleanMobile.startsWith('63')) {
      formattedNumber = '+' + cleanMobile;
    } else if (cleanMobile.startsWith('0')) {
      formattedNumber = '+63' + cleanMobile.substring(1);
    } else {
      formattedNumber = '+63' + cleanMobile;
    }

    // Add spaces for better readability: +63 9XX XXX XXXX
    if (formattedNumber.length >= 13) {
      return formattedNumber.replace(/(\+63)(\d{3})(\d{3})(\d{4})/, '$1 $2 $3 $4');
    }

    return formattedNumber;
  }
}
