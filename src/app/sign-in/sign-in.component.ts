import {Component, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators} from '@angular/forms';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatButtonModule} from '@angular/material/button';
import {MatCardModule} from '@angular/material/card';
import {ActivatedRoute, Router} from '@angular/router';
import {ForgotPasswordDialogComponent} from '../forgot-password/forgot-password-dialog.component';
import {MatDialog} from '@angular/material/dialog';
import {AuthService} from "../auth/auth.service";
import {EmailConfirmationService} from '../auth/email-confirmation.service';

interface LoginEmailErrorBody {
  message?: string;
  emailConfirmationExpiresAt?: string | null;
  emailConfirmationTokenExpired?: boolean;
  emailConfirmationTtlHours?: number;
}

@Component({
  selector: 'app-sign-in',
  templateUrl: './sign-in.component.html',
  styleUrls: ['./sign-in.component.css'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
  ]
})
export class SignInComponent implements OnInit {
  returnUrl: string = '/home';
  signInForm: FormGroup;
  isError: boolean = false;
  /** True when the API rejected login because the email is not verified yet. */
  isEmailActivationError: boolean = false;
  isSubmitting: boolean = false;
  errorMessage: string = '';
  /** Shown when AuthGuard sent the user here after revoking a session with unverified email (JWT). */
  sessionEmailVerificationMessage: string | null = null;

  /** ISO date from login error when email is not verified (current token expiry, if any). */
  emailConfirmationExpiresAt: string | null = null;
  emailConfirmationTokenExpired = false;
  emailConfirmationTtlHours = 72;
  resendBusy = false;
  resendSuccess = false;
  resendError: string | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly authService: AuthService,
    private readonly emailConfirmationService: EmailConfirmationService,
    private readonly formBuilder: FormBuilder,
    private readonly router: Router,
    private readonly dialog: MatDialog
  ) {
    this.signInForm = this.formBuilder.group({
      email: ['', [Validators.required, this.customEmailValidator()]],
      password: ['', [Validators.required]],
    });
  }

  private customEmailValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }
      const trimmedValue = control.value.trim();
      const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      return emailPattern.test(trimmedValue) ? null : { email: true };
    };
  }

  ngOnInit() {
    if (
      this.authService.isLoggedIn() &&
      this.authService.isEmailVerifiedForAccess()
    ) {
      const returnUrl = this.route.snapshot.queryParams['returnUrl'] ?? '/';
      this.router.navigateByUrl(returnUrl);
    }
    if (this.route.snapshot.queryParamMap.get('needEmailVerification') === '1') {
      this.sessionEmailVerificationMessage =
        'Your session was cleared because this account must have a verified email to continue. Open the confirmation link from your registration email, then sign in again. You can also check your spam folder.';
    }
  }

  onForgotPassword() {
    const dialogRef = this.dialog.open(ForgotPasswordDialogComponent, {
      disableClose: false,
      autoFocus: false,
      restoreFocus: false,
      width: '400px',
    });

    dialogRef.afterClosed().subscribe(result => {
      // The dialog now handles success/error messages internally
      // No need to show an additional alert
      if (result) {
        console.log('Password reset email sent to:', result);
      }
    });
  }

  onSignUp() {
    this.router.navigate(['/register']);
  }

  onSubmit() {
    if (this.signInForm.valid) {
      const email = this.signInForm.get('email')?.value?.trim() ?? '';
      const password = this.signInForm.get('password')?.value;

      this.isError = false;
      this.isEmailActivationError = false;
      this.errorMessage = '';
      this.sessionEmailVerificationMessage = null;
      this.clearEmailActivationExtras();
      this.isSubmitting = true;
      const returnUrl = this.route.snapshot.queryParams['returnUrl'] ?? this.returnUrl;
      this.authService.login({ userName: email, password }).subscribe({
        next: (response: any) => {
          this.isError = false;
          this.isEmailActivationError = false;
          this.isSubmitting = false;
          this.router.navigateByUrl(returnUrl);
        },

        error: (error: any) => {
          this.isError = true;
          this.isSubmitting = false;

          const body = (error as { error?: LoginEmailErrorBody })?.error ?? {};
          const apiMessage = this.extractApiErrorMessage(error);
          this.isEmailActivationError = this.isEmailNotVerifiedLogin(
            error,
            apiMessage,
            body,
          );
          if (this.isEmailActivationError) {
            this.applyEmailActivationErrorBody(body);
            this.errorMessage =
              'Your email has not been activated yet. Check your inbox for the confirmation message we sent when you registered, open the link to activate your account, then sign in again. If you cannot find it, check your spam folder.';
          } else {
            this.clearEmailActivationExtras();
            this.errorMessage =
              apiMessage || 'Login failed. Please try again.';
          }
          console.error('Login failed:', error);
        }
      });
    } else {
      this.signInForm.markAllAsTouched();
    }
  }

  onResendConfirmationEmail(): void {
    const email = this.signInForm.get('email')?.value?.trim() ?? '';
    if (!email || this.signInForm.get('email')?.invalid) {
      this.signInForm.get('email')?.markAsTouched();
      return;
    }
    this.resendBusy = true;
    this.resendSuccess = false;
    this.resendError = null;
    this.emailConfirmationService.resendConfirmationEmail(email).subscribe({
      next: () => {
        this.resendBusy = false;
        this.resendSuccess = true;
        this.emailConfirmationTokenExpired = false;
        const approx = new Date();
        approx.setHours(approx.getHours() + this.emailConfirmationTtlHours);
        this.emailConfirmationExpiresAt = approx.toISOString();
      },
      error: (err: unknown) => {
        this.resendBusy = false;
        this.resendSuccess = false;
        this.resendError =
          this.extractApiErrorMessage(err) ||
          'Could not send the confirmation email. Please try again later.';
      },
    });
  }

  private clearEmailActivationExtras(): void {
    this.emailConfirmationExpiresAt = null;
    this.emailConfirmationTokenExpired = false;
    this.emailConfirmationTtlHours = 72;
    this.resendBusy = false;
    this.resendSuccess = false;
    this.resendError = null;
  }

  private applyEmailActivationErrorBody(body: LoginEmailErrorBody): void {
    if (typeof body.emailConfirmationExpiresAt === 'string') {
      this.emailConfirmationExpiresAt = body.emailConfirmationExpiresAt;
    } else {
      this.emailConfirmationExpiresAt = null;
    }
    this.emailConfirmationTokenExpired = !!body.emailConfirmationTokenExpired;
    if (typeof body.emailConfirmationTtlHours === 'number') {
      this.emailConfirmationTtlHours = body.emailConfirmationTtlHours;
    } else {
      this.emailConfirmationTtlHours = 72;
    }
  }

  private extractApiErrorMessage(error: unknown): string {
    const body = (error as { error?: { message?: string | string[] } })?.error;
    const msg = body?.message;
    if (Array.isArray(msg)) {
      return msg.join(' ');
    }
    if (typeof msg === 'string') {
      return msg;
    }
    return '';
  }

  private isEmailNotVerifiedLogin(
    error: unknown,
    message: string,
    body: LoginEmailErrorBody,
  ): boolean {
    const m = message.toLowerCase();
    if (
      m.includes('verify your email') ||
      m.includes('email address must be verified')
    ) {
      return true;
    }
    const status = (error as { status?: number })?.status;
    if (
      status === 401 &&
      typeof body.emailConfirmationTtlHours === 'number' &&
      typeof body.message === 'string'
    ) {
      return body.message.toLowerCase().includes('verify your email');
    }
    return false;
  }
}
