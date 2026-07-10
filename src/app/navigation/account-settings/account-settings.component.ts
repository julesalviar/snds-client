import {CommonModule} from '@angular/common';
import {Component, ElementRef, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatCardModule} from '@angular/material/card';
import {MatDialog} from '@angular/material/dialog';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
import {MatRadioModule} from '@angular/material/radio';
import {MatSelectModule} from '@angular/material/select';
import {MatSnackBar} from '@angular/material/snack-bar';
import {Router, RouterModule} from '@angular/router';
import {Subject, catchError, of, switchMap, takeUntil, throwError} from 'rxjs';
import {AuthService} from '../../auth/auth.service';
import {EmailConfirmationService} from '../../auth/email-confirmation.service';
import {AccountProfile, UpdateMyProfilePayload} from '../../common/model/account-profile.model';
import {ChangeRequest, ChangeRequestStatus} from '../../common/model/change-request.model';
import {API_ENDPOINT} from '../../common/api-endpoints';
import {ChangeRequestService} from '../../common/services/change-request.service';
import {HttpService} from '../../common/services/http.service';
import {NavigationService} from '../../common/services/navigation.service';
import {ReferenceDataService} from '../../common/services/reference-data.service';
import {UserService} from '../../common/services/user.service';
import {
  parseSectorReferenceData,
  SectorCategory,
  SECTOR_REF_DATA_KEY,
} from '../../common/utils/sector-reference-data.util';
import {UserType} from '../../registration/user-type.enum';
import {
  RequestEmailChangeDialogComponent,
  RequestEmailChangeDialogData,
} from './request-email-change-dialog/request-email-change-dialog.component';

@Component({
  selector: 'app-account-settings',
  templateUrl: './account-settings.component.html',
  styleUrls: ['./account-settings.component.css'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatRadioModule,
    RouterModule,
  ],
})
export class AccountSettingsComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  @ViewChild('avatarInput') avatarInput?: ElementRef<HTMLInputElement>;

  accountForm = this.fb.group({
    name: [''],
    contactNumber: [''],
    address: [''],
    sector: [''],
    subsector: [''],
  });

  profile: AccountProfile | null = null;
  sectors: SectorCategory[] = [];
  availableSubsectors: string[] = [];
  isLoading = true;
  isSaving = false;
  savingStatusMessage = '';

  avatarUrl: string | null = null;
  avatarUrlRemoved = false;
  selectedAvatarFile: File | null = null;
  avatarPreviewUrl: string | null = null;
  isDraggingAvatar = false;
  isUploadingAvatar = false;

  pendingEmailChangeRequest: ChangeRequest | null = null;
  isLoadingPendingRequest = false;
  isCancellingRequest = false;
  resendVerificationBusy = false;
  resendVerificationSuccess = false;
  resendVerificationError: string | null = null;

  get isSchoolAdminAccount(): boolean {
    return this.profile?.activeRole === UserType.SchoolAdmin;
  }

  get isStakeholderAccount(): boolean {
    return this.profile?.activeRole === UserType.StakeHolder;
  }

  get isUsernameSameAsEmail(): boolean {
    const userName = this.profile?.userName?.trim() ?? '';
    const email = this.profile?.email?.trim() ?? '';
    return userName.length > 0 && userName.toLowerCase() === email.toLowerCase();
  }

  get profileImageSectionLabel(): string {
    return this.profile?.activeRole === UserType.StakeHolder ? 'Logo' : 'Avatar';
  }

  get isEmailChangeVerificationPending(): boolean {
    return (
      !!this.profile &&
      !this.profile.emailVerified &&
      this.profile.emailVerificationPurpose === 'email_change'
    );
  }

  get isSignupEmailVerificationPending(): boolean {
    return (
      !!this.profile &&
      !this.profile.emailVerified &&
      this.profile.emailVerificationPurpose !== 'email_change'
    );
  }

  constructor(
    private readonly fb: FormBuilder,
    private readonly userService: UserService,
    private readonly authService: AuthService,
    private readonly httpService: HttpService,
    private readonly referenceDataService: ReferenceDataService,
    private readonly navigationService: NavigationService,
    private readonly router: Router,
    private readonly snackBar: MatSnackBar,
    private readonly dialog: MatDialog,
    private readonly changeRequestService: ChangeRequestService,
    private readonly emailConfirmationService: EmailConfirmationService,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.referenceDataService.initialize();
    this.sectors = parseSectorReferenceData(
      this.referenceDataService.get(SECTOR_REF_DATA_KEY),
    );
    this.loadProfile();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSectorChange(category: string): void {
    const selectedSector = this.sectors.find((sector) => sector.category === category);
    this.availableSubsectors = selectedSector ? selectedSector.options : [];
    this.accountForm.patchValue({ subsector: '' });
  }

  onSubmit(): void {
    if (this.accountForm.invalid || this.isSaving) {
      return;
    }

    this.isSaving = true;
    this.savingStatusMessage = this.selectedAvatarFile
      ? 'Uploading avatar...'
      : this.avatarUrlRemoved
        ? 'Removing avatar...'
        : 'Saving account settings...';

    const avatarUpload$ = this.selectedAvatarFile
      ? this.uploadAvatarAndGetUrl()
      : of<string | null | undefined>(undefined);

    avatarUpload$
      .pipe(
        switchMap((uploadedUrl) => {
          if (uploadedUrl) {
            this.savingStatusMessage = 'Saving account settings...';
          }

          const formValue = this.accountForm.value;
          const payload: UpdateMyProfilePayload = {};

          if (this.isSchoolAdminAccount) {
            payload.name = formValue.name ?? undefined;
            payload.contactNumber = formValue.contactNumber ?? undefined;
          } else {
            payload.name = formValue.name ?? undefined;
            payload.contactNumber = formValue.contactNumber ?? undefined;
            payload.address = formValue.address ?? undefined;
            if (this.isStakeholderAccount) {
              payload.sector = formValue.sector ?? undefined;
              payload.subsector = formValue.subsector ?? undefined;
            }
          }

          if (uploadedUrl) {
            payload.avatarUrl = uploadedUrl;
            this.avatarUrlRemoved = false;
          } else if (this.avatarUrlRemoved) {
            payload.avatarUrl = null;
          }

          return this.userService.updateMyProfile(payload);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (response) => {
          this.profile = response.data;
          this.avatarUrl = response.data.avatarUrl ?? null;
          this.avatarUrlRemoved = false;
          this.selectedAvatarFile = null;
          this.avatarPreviewUrl = null;
          if (this.avatarInput) {
            this.avatarInput.nativeElement.value = '';
          }
          this.isSaving = false;
          this.savingStatusMessage = '';
          this.authService.updateAvatarUrl(response.data.avatarUrl ?? null);
          this.authService.refreshSession({ force: true }).subscribe();
          this.showSuccess('Account settings saved successfully.');
        },
        error: (err) => {
          this.isSaving = false;
          this.savingStatusMessage = '';
          this.showError(err?.error?.message ?? 'Failed to save account settings.');
        },
      });
  }

  onCancel(): void {
    const previousUrl = this.navigationService.getPreviousUrl();
    if (previousUrl && previousUrl.trim() !== '' && previousUrl !== '/account-settings') {
      this.router.navigateByUrl(previousUrl);
    } else {
      this.router.navigate(['/home']);
    }
  }

  onRequestEmailChange(): void {
    if (!this.profile || this.pendingEmailChangeRequest) {
      return;
    }

    const data: RequestEmailChangeDialogData = {
      currentEmail: this.profile.email,
      currentUserName: this.profile.userName,
      usernameSameAsEmail: this.isUsernameSameAsEmail,
    };

    this.dialog
      .open(RequestEmailChangeDialogComponent, { width: '480px', data })
      .afterClosed()
      .subscribe((submitted) => {
        if (submitted) {
          this.loadPendingEmailChangeRequest();
        }
      });
  }

  onCancelPendingRequest(): void {
    if (!this.pendingEmailChangeRequest || this.isCancellingRequest) {
      return;
    }

    this.isCancellingRequest = true;
    this.changeRequestService
      .cancelRequest(this.pendingEmailChangeRequest._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.pendingEmailChangeRequest = null;
          this.isCancellingRequest = false;
          this.showSuccess('Email change request cancelled.');
        },
        error: (err) => {
          this.isCancellingRequest = false;
          this.showError(err?.error?.message ?? 'Failed to cancel request.');
        },
      });
  }

  onResendVerificationEmail(): void {
    const email = this.profile?.email?.trim();
    if (!email || this.resendVerificationBusy) {
      return;
    }

    this.resendVerificationBusy = true;
    this.resendVerificationSuccess = false;
    this.resendVerificationError = null;

    this.emailConfirmationService.resendConfirmationEmail(email).subscribe({
      next: () => {
        this.resendVerificationBusy = false;
        this.resendVerificationSuccess = true;
      },
      error: (err) => {
        this.resendVerificationBusy = false;
        const body = err?.error?.message;
        this.resendVerificationError =
          (Array.isArray(body) ? body.join(' ') : typeof body === 'string' ? body : null) ||
          'Failed to resend verification email.';
      },
    });
  }

  onAvatarDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingAvatar = true;
  }

  onAvatarDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingAvatar = false;
  }

  onAvatarDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingAvatar = false;
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleAvatarSelection(files[0]);
    }
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleAvatarSelection(input.files[0]);
    }
  }

  onAvatarInputClick(): void {
    this.avatarInput?.nativeElement.click();
  }

  removeAvatarFile(): void {
    this.selectedAvatarFile = null;
    this.avatarPreviewUrl = null;
    if (this.avatarInput) {
      this.avatarInput.nativeElement.value = '';
    }
  }

  onRemoveAvatar(): void {
    this.avatarUrlRemoved = true;
    this.avatarUrl = null;
    this.selectedAvatarFile = null;
    this.avatarPreviewUrl = null;
    if (this.avatarInput) {
      this.avatarInput.nativeElement.value = '';
    }
  }

  private loadProfile(): void {
    this.userService.getMyProfile().pipe(takeUntil(this.destroy$)).subscribe({
      next: (profile) => {
        this.profile = profile;
        this.avatarUrl = profile.avatarUrl ?? null;
        this.avatarUrlRemoved = false;
        this.accountForm.patchValue({
          name: profile.name ?? '',
          contactNumber: profile.contactNumber ?? '',
        });

        if (!this.isSchoolAdminAccount) {
          this.accountForm.patchValue({
            address: profile.address ?? '',
          });
        }

        if (this.isStakeholderAccount) {
          this.accountForm.patchValue({
            sector: profile.sector ?? '',
            subsector: profile.subsector ?? '',
          });
          if (profile.sector) {
            this.onSectorChange(profile.sector);
            this.accountForm.patchValue({ subsector: profile.subsector ?? '' });
          }
        }

        this.isLoading = false;
        this.loadPendingEmailChangeRequest();
      },
      error: () => {
        this.isLoading = false;
        this.showError('Failed to load account settings.');
      },
    });
  }

  private loadPendingEmailChangeRequest(): void {
    this.isLoadingPendingRequest = true;
    this.changeRequestService
      .getMyRequests({ status: ChangeRequestStatus.PENDING, limit: 1 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.pendingEmailChangeRequest = response.data?.[0] ?? null;
          this.isLoadingPendingRequest = false;
        },
        error: () => {
          this.pendingEmailChangeRequest = null;
          this.isLoadingPendingRequest = false;
        },
      });
  }

  private uploadAvatarAndGetUrl() {
    if (!this.selectedAvatarFile) {
      return of(null);
    }

    this.isUploadingAvatar = true;

    const formData = new FormData();
    formData.append('file', this.selectedAvatarFile);
    formData.append('category', 'user-avatar');
    const userId = this.authService.getUserId();
    if (userId) {
      formData.append('userId', userId);
    }

    return this.httpService.uploadFile(`${API_ENDPOINT.upload}/image`, formData).pipe(
      switchMap((response: any) => {
        this.isUploadingAvatar = false;
        const imageUrl =
          response?.url ||
          response?.data?.url ||
          response?.originalUrl ||
          response?.data?.originalUrl;
        if (imageUrl) {
          this.avatarUrl = imageUrl;
          return of(imageUrl as string);
        }
        return of(null);
      }),
      catchError((err) => {
        this.isUploadingAvatar = false;
        return throwError(() => err);
      }),
    );
  }

  private handleAvatarSelection(file: File): void {
    if (!file.type.startsWith('image/')) {
      this.showError('Invalid file type. Please select an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.showError('Image size exceeds 5MB limit. Please select a smaller image.');
      return;
    }

    this.selectedAvatarFile = file;
    this.avatarUrlRemoved = false;
    const reader = new FileReader();
    reader.onload = () => {
      this.avatarPreviewUrl = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 4000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['success-snackbar'],
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['error-snackbar'],
    });
  }
}
