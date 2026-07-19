import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';

/**
 * Fake blurred amount UI for public/guest views.
 * Never bind a real monetary value here — placeholders only.
 */
@Component({
  selector: 'app-censored-amount-placeholder',
  standalone: true,
  imports: [CommonModule, MatTooltipModule],
  template: `
    <button
      type="button"
      class="censored-amount"
      [attr.aria-label]="ariaLabel"
      [matTooltip]="tooltip"
      matTooltipPosition="above"
      (click)="onActivate($event)">
      <span class="censored-amount__mask" aria-hidden="true">
        <span class="censored-amount__currency">₱</span>
        <span class="censored-amount__bars">
          <span class="censored-amount__bar"></span>
          <span class="censored-amount__bar censored-amount__bar--mid"></span>
          <span class="censored-amount__bar censored-amount__bar--short"></span>
        </span>
      </span>
      <span class="censored-amount__hint" aria-hidden="true">Sign in to view</span>
    </button>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        max-width: 100%;
      }

      .censored-amount {
        display: inline-flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 2px;
        margin: 0;
        padding: 2px 0;
        border: none;
        background: transparent;
        cursor: pointer;
        text-align: left;
        font: inherit;
        color: inherit;
      }

      .censored-amount:focus-visible {
        outline: 2px solid rgba(40, 167, 69, 0.55);
        outline-offset: 2px;
        border-radius: 4px;
      }

      .censored-amount__mask {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 8px;
        border-radius: 6px;
        background: linear-gradient(
          90deg,
          rgba(0, 0, 0, 0.08) 0%,
          rgba(0, 0, 0, 0.14) 50%,
          rgba(0, 0, 0, 0.08) 100%
        );
        background-size: 200% 100%;
        animation: censored-amount-shimmer 1.8s ease-in-out infinite;
      }

      .censored-amount__currency {
        font-size: 13px;
        font-weight: 600;
        color: rgba(0, 0, 0, 0.35);
        filter: blur(3px);
        user-select: none;
      }

      .censored-amount__bars {
        display: inline-flex;
        align-items: center;
        gap: 3px;
      }

      .censored-amount__bar {
        display: block;
        width: 10px;
        height: 10px;
        border-radius: 2px;
        background: rgba(0, 0, 0, 0.22);
        filter: blur(2.5px);
      }

      .censored-amount__bar--mid {
        width: 14px;
      }

      .censored-amount__bar--short {
        width: 8px;
      }

      .censored-amount__hint {
        font-size: 11px;
        color: rgba(0, 0, 0, 0.45);
        line-height: 1.2;
      }

      @keyframes censored-amount-shimmer {
        0% {
          background-position: 100% 0;
        }
        100% {
          background-position: -100% 0;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .censored-amount__mask {
          animation: none;
        }
      }
    `,
  ],
})
export class CensoredAmountPlaceholderComponent {
  @Input() tooltip = 'Sign in to view the amount';
  @Input() ariaLabel = 'Amount hidden. Sign in to view.';
  @Output() placeholderClick = new EventEmitter<void>();

  onActivate(event: Event): void {
    event.stopPropagation();
    this.placeholderClick.emit();
  }
}
