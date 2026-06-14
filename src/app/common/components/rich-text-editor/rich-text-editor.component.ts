import {
  Component,
  ElementRef,
  forwardRef,
  Input,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { QuillEditorComponent, QuillModule } from 'ngx-quill';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { lastValueFrom } from 'rxjs';
import { HttpService } from '../../services/http.service';
import { API_ENDPOINT } from '../../api-endpoints';
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
export class RichTextEditorComponent implements ControlValueAccessor {
  @Input() placeholder = 'Write announcement content…';
  @ViewChild(QuillEditorComponent) editor?: QuillEditorComponent;
  @ViewChild('imageInput') imageInput?: ElementRef<HTMLInputElement>;

  content = '';
  disabled = false;
  isReady = false;
  private imageResize?: ImageResize;

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
      const quill = this.editor?.quillEditor;
      if (quill) {
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
    } catch {
      this.snackBar.open('Failed to upload image. Please try again.', 'Close', {
        duration: 4000,
        panelClass: ['error-snackbar'],
      });
    }
  }
}
