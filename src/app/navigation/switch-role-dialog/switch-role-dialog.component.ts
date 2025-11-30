import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpService } from '../../common/services/http.service';
import { API_ENDPOINT } from '../../common/api-endpoints';
import { catchError, tap, throwError } from 'rxjs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';

export interface SwitchRoleDialogData {
  roles: string[];
  currentRole: string;
}

@Component({
  selector: 'app-switch-role-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatRadioModule,
    FormsModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './switch-role-dialog.component.html',
  styleUrls: ['./switch-role-dialog.component.css']
})
export class SwitchRoleDialogComponent implements OnInit {
  selectedRole: string = '';
  isLoading: boolean = false;

  constructor(
    public dialogRef: MatDialogRef<SwitchRoleDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SwitchRoleDialogData,
    private readonly httpService: HttpService,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.selectedRole = this.data.currentRole;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSwitch(): void {
    if (!this.selectedRole || this.selectedRole === this.data.currentRole) {
      return;
    }

    this.isLoading = true;
    this.httpService.post<{ access_token: string }>(
      API_ENDPOINT.auth.switchRole,
      { role: this.selectedRole }
    ).pipe(
      tap(response => {
        localStorage.setItem('token', response.access_token);
        this.isLoading = false;
        this.dialogRef.close(true);
        window.location.reload();
      }),
      catchError(error => {
        this.isLoading = false;
        console.error('Error switching role:', error);
        const errorMessage = error?.error?.message ?? 'Failed to switch role. Please try again.';
        this.snackBar.open(errorMessage, 'Close', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'top'
        });
        return throwError(() => error);
      })
    ).subscribe();
  }

  getRoleDisplayName(role: string): string {
    const roleMap: { [key: string]: string } = {
      'stakeholder': 'Stakeholder',
      'schoolAdmin': 'School Admin',
      'divisionAdmin': 'Division Admin'
    };
    return roleMap[role] || role;
  }
}

