import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialogRef, MatDialogActions, MatDialogContent } from '@angular/material/dialog';

@Component({
  selector: 'app-forgot-password-dialog',
  standalone: true,
  templateUrl: './forgot-password-dialog.component.html',
  styleUrls: ['./forgot-password-dialog.component.css'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatDialogActions,
    MatDialogContent,

  ]
})
export class ForgotPasswordDialogComponent {
  email: string = '';
  emailInvalid: boolean = false;

  constructor(private dialogRef: MatDialogRef<ForgotPasswordDialogComponent>) {}

  onSend() {
    console.log('onSend called');
    if (this.isEmailValid(this.email)) {
      console.log(`Reset link sent to ${this.email}`); // sending email
      this.dialogRef.close(this.email); // Close the dialog after successful validation
    } else {
      this.emailInvalid = true; // Show validation error
    }
  }

  onClose() {
    console.log('onClose called');
    this.dialogRef.close(); 
  }
// add correct email for default snds email
  private isEmailValid(email: string): boolean {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; //validate email format
    return pattern.test(email);
  }
}