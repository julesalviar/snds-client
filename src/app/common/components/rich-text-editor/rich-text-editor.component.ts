import {
  Component,
  ElementRef,
  EventEmitter,
  forwardRef,
  Input,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { QuillEditorComponent, QuillModule } from 'ngx-quill';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { lastValueFrom } from 'rxjs';
import { HttpService } from '../../services/http.service';
import { API_ENDPOINT } from '../../api-endpoints';
import { AnnouncementService } from '../../services/announcement.service';
import ImageResize from './quill-image-resize';
import Quill from 'quill';

Quill.register('modules/imageResize', ImageResize);

const ANNOUNCEMENT_IMAGE_MAX_BYTES = 1 * 1024 * 1024;

@Component({
  selector: 'app-rich-text-editor',
  imports: [
    CommonModule,
    FormsModule,
    QuillModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RichTextEditorComponent),
      multi: true,
    },
  ],
  templateUrl: './rich-text-editor.component.html',
  styleUrl: './rich-text-editor.component.css',
})
export class RichTextEditorComponent implements ControlValueAccessor, OnDestroy {
  @Input() placeholder = 'Write announcement content…';
  @Input() aiEnabled = false;
  @Input() aiLimitReached = false;
  @Input() announcementTitle = '';
  @Input() announcementDescription = '';
  @Input() aiAdditionalContext = '';
  @Output() aiGeneratingChange = new EventEmitter<boolean>();
  @Output() aiLimitReachedChange = new EventEmitter<boolean>();
  @ViewChild(QuillEditorComponent) editor?: QuillEditorComponent;
  @ViewChild('imageInput') imageInput?: ElementRef<HTMLInputElement>;

  content = '';
  disabled = false;
  isReady = false;
  isGenerating = false;
  generatingStatus = 'Preparing your announcement image…';
  private imageResize?: ImageResize;
  private generatingStatusTimer?: ReturnType<typeof setInterval>;

  private readonly generatingStatuses = [
    'Preparing your announcement image…',
    'Generating your announcement image…',
    'Building the layout from your title and description…',
    'Applying colors and typography…',
    'Refining the announcement design…',
    'Creating a clean, readable design…',
    'Putting the finishing touches on your image…',
    'Almost there…',
    'Still working on your image…',
    'This may take up to a minute…',
    'Finalizing your announcement image…',
    'Compressing and uploading the image…',
    'Shaping the announcement banner…',
    'Balancing text and visuals…',
    'Making sure everything is easy to read…',
    'Polishing the announcement layout…',
    'Turning your details into a shareable graphic…',
    'Hang tight — good things take a moment…',
    'Checking the image quality…',
    'Saving your announcement image…',
  ];

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  readonly customModules = [
    { path: 'modules/imageResize', implementation: ImageResize },
  ];

  readonly quillModules = {
    toolbar: {
      container: [
        ['bold', 'italic', 'underline'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        [{ align: [] }],
        ['link', 'image'],
        ['clean'],
      ],
      handlers: {
        image: () => this.triggerImageUpload(),
      },
    },
    imageResize: {
      keepAspectRatio: true,
    },
  };

  constructor(
    private readonly httpService: HttpService,
    private readonly announcementService: AnnouncementService,
    private readonly snackBar: MatSnackBar,
  ) {}

  writeValue(value: string | null): void {
    this.content = value ?? '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onEditorCreated(): void {
    this.isReady = true;
    const quill = this.editor?.quillEditor;
    const imageResize = quill?.getModule('imageResize') as ImageResize | undefined;
    this.imageResize = imageResize;
  }

  ngOnDestroy(): void {
    this.stopGeneratingStatusCycle();
  }

  private setGenerating(active: boolean): void {
    this.isGenerating = active;
    this.aiGeneratingChange.emit(active);
    if (active) {
      this.startGeneratingStatusCycle();
    } else {
      this.stopGeneratingStatusCycle();
      this.generatingStatus = this.generatingStatuses[0];
    }
  }

  private pickRandomGeneratingStatus(): string {
    if (this.generatingStatuses.length === 1) {
      return this.generatingStatuses[0];
    }

    let next = this.generatingStatuses[
      Math.floor(Math.random() * this.generatingStatuses.length)
    ];
    while (next === this.generatingStatus && this.generatingStatuses.length > 1) {
      next = this.generatingStatuses[
        Math.floor(Math.random() * this.generatingStatuses.length)
      ];
    }
    return next;
  }

  private startGeneratingStatusCycle(): void {
    this.stopGeneratingStatusCycle();
    this.generatingStatus = this.pickRandomGeneratingStatus();
    this.generatingStatusTimer = setInterval(() => {
      this.generatingStatus = this.pickRandomGeneratingStatus();
    }, 2800);
  }

  private stopGeneratingStatusCycle(): void {
    if (this.generatingStatusTimer) {
      clearInterval(this.generatingStatusTimer);
      this.generatingStatusTimer = undefined;
    }
  }

  onContentChanged(event: { html: string | null }): void {
    const html = event.html ?? '';
    this.content = html;
    this.onChange(html);
    this.onTouched();
  }

  setContent(html: string): void {
    this.content = html;
    this.onChange(html);
  }

  triggerImageUpload(): void {
    this.imageInput?.nativeElement.click();
  }

  async generateWithAi(): Promise<void> {
    if (!this.aiEnabled || this.isGenerating || this.disabled) {
      return;
    }

    const title = this.announcementTitle?.trim();
    const description = this.announcementDescription?.trim();
    if (!title) {
      this.snackBar.open('Enter a title before generating with AI.', 'Close', {
        duration: 4000,
        panelClass: ['error-snackbar'],
      });
      return;
    }
    if (!description) {
      this.snackBar.open('Enter a description before generating with AI.', 'Close', {
        duration: 4000,
        panelClass: ['error-snackbar'],
      });
      return;
    }

    try {
      const status = await lastValueFrom(this.announcementService.getAiStatus());
      const limitReached = Boolean(
        status.aiEnabled && status.quota && !status.quota.canGenerate,
      );
      this.aiLimitReached = limitReached;
      this.aiLimitReachedChange.emit(limitReached);
      if (limitReached) {
        return;
      }
    } catch {
      this.snackBar.open('Unable to verify AI quota. Please try again.', 'Close', {
        duration: 4000,
        panelClass: ['error-snackbar'],
      });
      return;
    }

    this.setGenerating(true);
    try {
      const result = await lastValueFrom(
        this.announcementService.generateContent({
          title,
          description,
          additionalContext: this.aiAdditionalContext?.trim() || undefined,
        }),
      );
      await this.insertImageUrl(result.imageUrl);
      this.snackBar.open('Announcement image generated.', 'Close', {
        duration: 3000,
      });
    } catch (e: unknown) {
      const message = this.extractErrorMessage(
        e,
        'Failed to generate image with AI.',
      );
      if (message.toLowerCase().includes('daily ai limit')) {
        this.aiLimitReached = true;
        this.aiLimitReachedChange.emit(true);
      }
      this.snackBar.open(message, 'Close', {
        duration: 5000,
        panelClass: ['error-snackbar'],
      });
    } finally {
      this.setGenerating(false);
    }
  }

  private extractErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }
    if (typeof error === 'object' && error !== null && 'error' in error) {
      const payload = (error as { error?: { message?: string | { message?: string } } }).error;
      if (typeof payload?.message === 'string') {
        return payload.message;
      }
      if (
        typeof payload?.message === 'object' &&
        payload?.message &&
        typeof payload.message.message === 'string'
      ) {
        return payload.message.message;
      }
    }
    return fallback;
  }

  private async insertImageUrl(url: string): Promise<void> {
    const quill = this.editor?.quillEditor;
    if (!quill) {
      return;
    }

    const range = quill.getSelection(true);
    quill.insertEmbed(range.index, 'image', url);
    quill.setSelection(range.index + 1);

    requestAnimationFrame(() => {
      const images = quill.root.querySelectorAll('img');
      const image = images[images.length - 1] as HTMLImageElement | undefined;
      if (!image || image.getAttribute('src') !== url) {
        return;
      }
      if (image.complete) {
        this.imageResize?.selectImage(image);
      } else {
        image.addEventListener('load', () => this.imageResize?.selectImage(image), { once: true });
      }
    });
  }

  async onImageSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.snackBar.open('Please select an image file.', 'Close', {
        duration: 4000,
        panelClass: ['error-snackbar'],
      });
      return;
    }

    if (file.size > ANNOUNCEMENT_IMAGE_MAX_BYTES) {
      this.snackBar.open('Image must not exceed 1 MB.', 'Close', {
        duration: 4000,
        panelClass: ['error-snackbar'],
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', 'announcements');

    try {
      const response = await lastValueFrom(
        this.httpService.uploadFile(`${API_ENDPOINT.upload}/image`, formData),
      ) as { originalUrl?: string };
      const url = response?.originalUrl;
      if (!url) {
        throw new Error('Upload did not return a URL');
      }
      await this.insertImageUrl(url);
    } catch {
      this.snackBar.open('Failed to upload image. Please try again.', 'Close', {
        duration: 4000,
        panelClass: ['error-snackbar'],
      });
    }
  }
}
