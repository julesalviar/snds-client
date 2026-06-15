import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

const ALLOWED_IFRAME_HOSTS = [
  'www.google.com',
  'google.com',
  'maps.google.com',
  'www.openstreetmap.org',
  'openstreetmap.org',
  'cloudflareinsights.com',
  'googletagmanager.com',
];

@Pipe({
  name: 'safeUrl',
  standalone: true
})
export class SafeUrlPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(url: string): SafeResourceUrl | string {
    if (!url || !this.isAllowedUrl(url)) {
      return 'about:blank';
    }
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  private isAllowedUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:') {
        return false;
      }
      return ALLOWED_IFRAME_HOSTS.some(
        (host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`),
      );
    } catch {
      return false;
    }
  }
}
