import Quill, { Module } from 'quill';
import type { EmbedBlot } from 'parchment';

interface ImageResizeOptions {
  keepAspectRatio?: boolean;
  minWidth?: number;
}

export default class ImageResize extends Module<ImageResizeOptions> {
  static override DEFAULTS: ImageResizeOptions = {
    keepAspectRatio: true,
    minWidth: 50,
  };

  private overlay: HTMLDivElement | null = null;
  private handle: HTMLDivElement | null = null;
  private selectedImage: HTMLImageElement | null = null;
  private aspectRatio = 1;
  private dragging = false;
  private dragStartX = 0;
  private dragStartWidth = 0;
  private activePointerId: number | null = null;

  constructor(quill: Quill, options: Partial<ImageResizeOptions> = {}) {
    super(quill, options);

    this.quill.root.addEventListener('mousedown', this.onEditorMouseDown, true);
    this.quill.container.addEventListener('scroll', this.repositionOverlay);
    document.addEventListener('mousedown', this.onDocumentMouseDown, true);
    this.quill.on('text-change', this.onTextChange);
    this.quill.on('selection-change', this.repositionOverlay);
  }

  private readonly onTextChange = (): void => {
    if (!this.selectedImage || !this.quill.root.contains(this.selectedImage)) {
      this.deselect();
      return;
    }
    this.repositionOverlay();
  };

  private readonly onEditorMouseDown = (event: MouseEvent): void => {
    const target = event.target;
    if (!(target instanceof HTMLImageElement) || !this.quill.root.contains(target)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.selectImage(target);
  };

  private readonly onDocumentMouseDown = (event: MouseEvent): void => {
    if (!this.selectedImage) {
      return;
    }

    const target = event.target;
    if (target instanceof Node && this.handle?.contains(target)) {
      return;
    }
    if (target instanceof Node && this.overlay?.contains(target)) {
      return;
    }
    if (target instanceof HTMLImageElement && this.quill.root.contains(target)) {
      return;
    }

    this.deselect();
  };

  private readonly onHandlePointerDown = (event: PointerEvent): void => {
    event.preventDefault();
    event.stopPropagation();
    if (!this.selectedImage) {
      return;
    }

    this.dragging = true;
    this.activePointerId = event.pointerId;
    this.dragStartX = event.clientX;
    this.dragStartWidth = this.selectedImage.getBoundingClientRect().width;
    this.handle?.setPointerCapture(event.pointerId);
    document.addEventListener('pointermove', this.onPointerMove);
    document.addEventListener('pointerup', this.onPointerUp);
    document.addEventListener('pointercancel', this.onPointerUp);
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (!this.dragging || !this.selectedImage || event.pointerId !== this.activePointerId) {
      return;
    }

    const minWidth = this.options.minWidth ?? ImageResize.DEFAULTS.minWidth!;
    const delta = event.clientX - this.dragStartX;
    const newWidth = Math.max(minWidth, Math.round(this.dragStartWidth + delta));
    this.applySize(newWidth);
    this.repositionOverlay();
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.activePointerId) {
      return;
    }

    this.dragging = false;
    this.activePointerId = null;
    document.removeEventListener('pointermove', this.onPointerMove);
    document.removeEventListener('pointerup', this.onPointerUp);
    document.removeEventListener('pointercancel', this.onPointerUp);
    this.quill.update('user');
  };

  private readonly repositionOverlay = (): void => {
    if (!this.overlay || !this.selectedImage) {
      return;
    }

    const container = this.quill.container as HTMLElement;
    const imgRect = this.selectedImage.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    Object.assign(this.overlay.style, {
      top: `${imgRect.top - containerRect.top + container.scrollTop}px`,
      left: `${imgRect.left - containerRect.left + container.scrollLeft}px`,
      width: `${imgRect.width}px`,
      height: `${imgRect.height}px`,
    });
  };

  selectImage(image: HTMLImageElement): void {
    if (this.selectedImage !== image) {
      this.deselect();
    }

    this.selectedImage = image;
    const displayWidth = image.getBoundingClientRect().width || image.width || 1;
    const displayHeight = image.getBoundingClientRect().height || image.height || 1;
    const naturalWidth = image.naturalWidth || displayWidth;
    const naturalHeight = image.naturalHeight || displayHeight;
    this.aspectRatio = naturalWidth / naturalHeight || displayWidth / displayHeight || 1;

    const blot = Quill.find(image) as EmbedBlot | null;
    if (blot) {
      const index = this.quill.getIndex(blot);
      this.quill.setSelection(index, 1, Quill.sources.SILENT);
    }

    this.ensureOverlay();
    this.repositionOverlay();
  }

  private deselect(): void {
    this.selectedImage = null;
    this.overlay?.remove();
    this.overlay = null;
    this.handle = null;
  }

  private ensureOverlay(): void {
    if (this.overlay) {
      return;
    }

    const container = this.quill.container as HTMLElement;
    if (getComputedStyle(container).position === 'static') {
      container.style.position = 'relative';
    }

    this.overlay = document.createElement('div');
    this.overlay.className = 'ql-image-resize-overlay';

    this.handle = document.createElement('div');
    this.handle.className = 'ql-image-resize-handle';
    this.handle.setAttribute('title', 'Drag to resize');
    this.handle.addEventListener('pointerdown', this.onHandlePointerDown);

    this.overlay.appendChild(this.handle);
    container.appendChild(this.overlay);
  }

  private applySize(width: number): void {
    if (!this.selectedImage) {
      return;
    }

    const keepAspectRatio = this.options.keepAspectRatio !== false;
    const height = keepAspectRatio ? Math.round(width / this.aspectRatio) : undefined;
    const image = this.selectedImage;

    image.setAttribute('width', String(width));
    image.style.width = `${width}px`;
    image.style.maxWidth = '100%';

    if (height) {
      image.setAttribute('height', String(height));
      image.style.height = `${height}px`;
    } else {
      image.removeAttribute('height');
      image.style.height = '';
    }

    const blot = Quill.find(image) as EmbedBlot | null;
    if (blot && typeof blot.format === 'function') {
      blot.format('width', String(width));
      if (height) {
        blot.format('height', String(height));
      } else {
        blot.format('height', false);
      }
    }
  }
}
