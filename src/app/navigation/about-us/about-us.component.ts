import { Component, OnInit } from '@angular/core';
import { MatCardModule } from "@angular/material/card";
import { CommonModule } from '@angular/common';
import { InternalReferenceDataService } from "../../common/services/internal-reference-data.service";
import { SafeUrlPipe } from "../../common/pipes/safe-url.pipe";

interface Contact {
  image: string;
  name: string;
  title: string;
  mobile: string;
  landline: string;
  email: string;
}

interface AboutContent {
  contacts: Contact[];
  address: string;
  aboutUs: string;
  mapUrl: string;
}

@Component({
  selector: 'app-about-us',
  standalone: true,
  imports: [MatCardModule, CommonModule, SafeUrlPipe],
  templateUrl: './about-us.component.html',
  styleUrl: './about-us.component.css'
})
export class AboutUsComponent implements OnInit {
  contacts: Contact[] = [];
  address: string = '';
  aboutUs: string = '';
  mapUrl: string = '';

  constructor(
    private readonly internalReferenceDataService: InternalReferenceDataService
  ) {}

  ngOnInit(): void {
    this.loadAboutContent();
  }

  private async loadAboutContent(): Promise<void> {
    await this.internalReferenceDataService.initialize();
    const aboutContent = this.internalReferenceDataService.get('about_content') as AboutContent | null;

    if (aboutContent) {
      this.aboutUs = aboutContent.aboutUs ?? '';
      this.address = aboutContent.address ?? '';
      this.mapUrl = aboutContent.mapUrl ?? '';

      if (aboutContent.contacts && Array.isArray(aboutContent.contacts)) {
        this.contacts = aboutContent.contacts.map(contact => ({
          image: contact.image ?? '',
          name: contact.name ?? '',
          title: contact.title ?? '',
          mobile: this.formatMobileNumber(contact.mobile ?? ''),
          landline: contact.landline ?? '',
          email: contact.email ?? ''
        }));
      }
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
