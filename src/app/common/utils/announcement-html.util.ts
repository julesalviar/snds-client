/**
 * Quill (especially justified text) stores non-breaking spaces between words.
 * Those prevent normal line wrapping and cause mid-word breaks in the dialog.
 */
export function normalizeAnnouncementHtml(html: string | null | undefined): string {
  if (!html) {
    return '';
  }

  return html
    .replace(/&nbsp;/gi, ' ')
    .replace(/\u00A0/g, ' ')
    .replace(/\u202F/g, ' ');
}
