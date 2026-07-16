export type RatingValue = 1 | 2 | 3 | 4 | 5;

export interface RatingOption {
  value: RatingValue;
  icon: string;
  label: string;
  color: string;
}

/** 1 (least satisfied) = red → 5 (most satisfied) = green */
const RATING_COLORS: Record<RatingValue, string> = {
  1: '#d32f2f',
  2: '#f57c00',
  3: '#fbc02d',
  4: '#7cb342',
  5: '#388e3c',
};

export const RATING_OPTIONS: RatingOption[] = [
  { value: 1, icon: 'sentiment_very_dissatisfied', label: 'Very Dissatisfied', color: RATING_COLORS[1] },
  { value: 2, icon: 'sentiment_dissatisfied', label: 'Dissatisfied', color: RATING_COLORS[2] },
  { value: 3, icon: 'sentiment_neutral', label: 'Neutral', color: RATING_COLORS[3] },
  { value: 4, icon: 'sentiment_satisfied', label: 'Satisfied', color: RATING_COLORS[4] },
  { value: 5, icon: 'sentiment_very_satisfied', label: 'Very Satisfied', color: RATING_COLORS[5] },
];

const ICON_MAP: Record<number, string> = {
  1: 'sentiment_very_dissatisfied',
  2: 'sentiment_dissatisfied',
  3: 'sentiment_neutral',
  4: 'sentiment_satisfied',
  5: 'sentiment_very_satisfied',
};

const LABEL_MAP: Record<number, string> = {
  1: 'Very Dissatisfied',
  2: 'Dissatisfied',
  3: 'Neutral',
  4: 'Satisfied',
  5: 'Very Satisfied',
};

export function getRatingIcon(rating: number): string {
  return ICON_MAP[rating] || 'rate_review';
}

/** Hex color for the rating scale (1 red → 5 green). */
export function getRatingCssColor(rating: number): string {
  return RATING_COLORS[rating as RatingValue] || '';
}

/** @deprecated Prefer getRatingCssColor for the red→green scale. */
export function getRatingColor(rating: number): string {
  if (rating === 1 || rating === 2) {
    return 'warn';
  }
  if (rating === 3) {
    return 'accent';
  }
  if (rating === 4 || rating === 5) {
    return 'primary';
  }
  return '';
}

export function getRatingLabel(rating: number): string {
  return LABEL_MAP[rating] || '';
}
