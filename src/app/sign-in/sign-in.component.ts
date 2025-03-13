import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { Router } from '@angular/router';
import { UserService } from '../UserService';
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
    const registeredUser = this.userService.getRegisteredUser();
  
    // Check if the form is valid
    if (this.signInForm.valid) {
      const { email, password } = this.signInForm.value;
  
      // Check if a registered user exists
      if (registeredUser) {
        // Validate email and password adjust according to backend
        if (email === registeredUser.email && password === registeredUser.password) {
          this.router.navigate(['/']); // Navigate to home/dashboard
        } else {
          this.isError = true; 
          console.log('Email or password is incorrect.');
        }
      } else {
        // Handle case where no registered user is found
        this.isError = true; 
        console.log('No registered user found.'); //for console display 
      }
    } else {
      this.signInForm.markAllAsTouched(); // Highlight messaage for validation errors
    }
  }
}