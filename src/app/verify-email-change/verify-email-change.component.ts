import { CommonModule } from '@angular/common';
import { afterNextRender, Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { EmailConfirmationService } from '../auth/email-confirmation.service';

@Component({
  selector: 'app-verify-email-change',
  templateUrl: './verify-email-change.component.html',
  styleUrls: ['./verify-email-change.component.css'],
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
})
export class VerifyEmailChangeComponent {
  viewState: 'verifying' | 'missing-token' | 'error' = 'verifying';
  errorMessage = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly emailConfirmationService: EmailConfirmationService,
  ) {
    afterNextRender(() => {
      const token = this.route.snapshot.queryParamMap.get('token')?.trim() ?? '';

      if (!token) {
        this.viewState = 'missing-token';
        this.errorMessage =
          'This link is missing the verification token. Open the link from your email again, or sign in and use “Resend verification email” from Account Settings.';
        return;
      }

      this.viewState = 'verifying';
      this.emailConfirmationService.verifyEmailToken(token).subscribe({
        next: () => {
          void this.router.navigate(['/email-change-verified'], { replaceUrl: true });
        },
        error: (err: unknown) => {
          const body = (err as { error?: { message?: string | string[] } })?.error;
          const msg = body?.message;
          const text =
            (Array.isArray(msg) ? msg.join(' ') : typeof msg === 'string' ? msg : '') ?? '';
          if (text.toLowerCase().includes('already verified')) {
            void this.router.navigate(['/email-change-verified'], { replaceUrl: true });
            return;
          }
          this.viewState = 'error';
          this.errorMessage =
            text ||
            'We could not verify your new email. The link may be invalid or expired.';
        },
      });
    });
  }

  goToSignIn(): void {
    void this.router.navigate(['/sign-in']);
  }
}
