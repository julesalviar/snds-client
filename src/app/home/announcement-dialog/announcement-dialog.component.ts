import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Announcement } from '../../common/model/announcement.model';
import { normalizeAnnouncementHtml } from '../../common/utils/announcement-html.util';

export interface AnnouncementDialogData {
  announcement: Announcement;
}

export interface AnnouncementDialogResult {
  dontShowAgain: boolean;
}

@Component({
  selector: 'app-announcement-dialog',
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
  ],
  templateUrl: './announcement-dialog.component.html',
  styleUrl: './announcement-dialog.component.css',
})
export class AnnouncementDialogComponent {
  dontShowAgain = true;
  private readonly sanitizer = inject(DomSanitizer);

  constructor(
    public dialogRef: MatDialogRef<AnnouncementDialogComponent, AnnouncementDialogResult>,
    @Inject(MAT_DIALOG_DATA) public data: AnnouncementDialogData,
  ) {}

  get announcement(): Announcement {
    return this.data.announcement;
  }

  get announcementBodyHtml(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(
      normalizeAnnouncementHtml(this.announcement.announcement),
    );
  }

  onDismiss(): void {
    this.dialogRef.close({
      dontShowAgain: this.announcement.forceShowEveryVisit ? false : this.dontShowAgain,
    });
  }
}
