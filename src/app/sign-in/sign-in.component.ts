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

@Component({
  selector: 'app-sign-in',
  standalone: true,
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
  isSubmitting: boolean = false;
  errorMessage: string = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly authService: AuthService,
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
    if (this.authService.isLoggedIn()) {
      const returnUrl = this.route.snapshot.queryParams['returnUrl'] ?? '/';
      this.router.navigateByUrl(returnUrl);
    }
  }

  onForgotPassword() {
    const dialogRef = this.dialog.open(ForgotPasswordDialogComponent, {
      disableClose: true,
      autoFocus: false,
      restoreFocus: false,
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        alert(`A reset link has been sent to ${result}.`);
      } else {
        console.log('Dialog closed without action.');
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

      this.isSubmitting = true;
      this.authService.login({ userName: email, password }).subscribe({
        next: (response: any) => {
          this.isError = false;
          this.isSubmitting = false;
          this.router.navigateByUrl(this.returnUrl);
        },

        error: (error: any) => {
          this.isError = true;
          this.isSubmitting = false;

          this.errorMessage = error.error?.message ?? 'Login failed. Please try again.';
          console.error('Login failed:', error);
        }
      });
    } else {
      this.signInForm.markAllAsTouched();
    }
  }
}
