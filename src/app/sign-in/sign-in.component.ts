import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { Router } from '@angular/router';
import { UserService } from '../services/user.service';
import { ForgotPasswordDialogComponent } from '../forgot-password/forgot-password-dialog.component';
import { MatDialog } from '@angular/material/dialog';

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

export class SignInComponent {
  signInForm: FormGroup;
  isError: boolean = false;
  isSubmitting: boolean = false;
  errorMessage: string = '';

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private userService: UserService,
    private dialog: MatDialog
  ) {
    this.signInForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
    });
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
      const { email, password } = this.signInForm.value;
      this.isSubmitting = true;
      this.userService.login(email, password).subscribe({
        next: (response) => {
          this.isError = false;
          this.isSubmitting = false;
          this.router.navigate(['/home']);
        },

        error: (error) => {
          this.isError = true;
          this.isSubmitting = false;

          const backendMessage = error.error?.message || 'Login failed. Please try again.';
          this.errorMessage = backendMessage;
          console.error('Login failed:', error);
        }
      });
    } else {
      this.signInForm.markAllAsTouched();
    }
  }
}
