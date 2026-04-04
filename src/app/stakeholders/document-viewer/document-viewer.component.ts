import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatOption } from '@angular/material/core';
import { SchoolNeedImage } from '../../common/model/school-need.model';

interface DocumentViewerData {
  title: string;
  images: SchoolNeedImage[];
}

@Component({
  selector: 'app-document-viewer',
  templateUrl: './document-viewer.component.html',
  styleUrls: ['./document-viewer.component.css'],
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatProgressBarModule, MatFormFieldModule, MatSelectModule, MatOption]
})
export class DocumentViewerComponent {
  currentImageIndex: number = 0;
  isLoading: boolean = false;
  viewMode: 'auto' | 'landscape' | 'portrait' = 'auto';
  rotation: number = 0;

  constructor(
    public dialogRef: MatDialogRef<DocumentViewerComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DocumentViewerData
  ) {}

  get currentImage(): SchoolNeedImage | null {
    return this.data.images[this.currentImageIndex] || null;
  }

  get hasImages(): boolean {
    return this.data.images && this.data.images.length > 0;
  }

  get totalImages(): number {
    return this.data.images?.length || 0;
  }

  getImageContainerClass(): string {
    const baseClass = 'image-container';
    const modeClass = this.viewMode === 'landscape' ? 'landscape-container' : 
                     this.viewMode === 'portrait' ? 'portrait-container' : 'auto-container';
    return `${baseClass} ${modeClass}`;
  }

  getImageClass(): string {
    const baseClass = 'main-image';
    const rotationClass = this.rotation !== 0 ? `rotated-${this.rotation}` : '';
    return `${baseClass} ${rotationClass}`.trim();
  }

  nextImage(): void {
    if (this.currentImageIndex < this.data.images.length - 1) {
      this.currentImageIndex++;
      this.rotation = 0; // Reset rotation when changing images
    }
  }

  previousImage(): void {
    if (this.currentImageIndex > 0) {
      this.currentImageIndex--;
      this.rotation = 0; 
    }
  }

  rotateImage(): void {
    this.rotation = (this.rotation + 90) % 360;
  }

  closeDialog(): void {
    this.dialogRef.close();
  }

  downloadImage(image: SchoolNeedImage): void {
    const link = document.createElement('a');
    link.href = image.originalUrl;
    link.download = `document-${image.id}`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  viewFullImage(image: SchoolNeedImage): void {
    window.open(image.originalUrl, '_blank');
  }
}
