import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgModel } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideNativeDateAdapter } from '@angular/material/core';
import { of } from 'rxjs';

import { SchoolNeedsEngageComponent } from './school-needs-engage.component';
import { UserService } from '../../common/services/user.service';
import { SharedDataService } from '../../common/services/shared-data.service';
import { ReferenceDataService } from '../../common/services/reference-data.service';
import { SchoolNeedService } from '../../common/services/school-need.service';
import { EngagementService } from '../../common/services/engagement.service';
import { HttpService } from '../../common/services/http.service';
import { SchoolNeed, SchoolNeedImage } from '../../common/model/school-need.model';
import { Engagement } from '../../common/model/engagement.model';

describe('SchoolNeedsEngageComponent', () => {
  let component: SchoolNeedsEngageComponent;
  let fixture: ComponentFixture<SchoolNeedsEngageComponent>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;
  let engageSchoolNeedSpy: jasmine.Spy;
  let updateEngagementSpy: jasmine.Spy;
  let routerNavigateSpy: jasmine.Spy;

  const existingImage: SchoolNeedImage = {
    id: 'existing-1',
    category: 'school-needs',
    originalUrl: 'http://example.com/original.jpg',
    thumbnailUrl: 'http://example.com/thumb.jpg',
  };

  const previewImage = {
    file: new File([''], 'mov.jpg', { type: 'image/jpeg' }),
    dataUrl: null,
    uploading: false,
    progress: 0,
  };

  function fillValidEngagementForm(): void {
    component.needCode = '101';
    component.schoolNeed = { _id: 'need1', images: [], unit: 'pcs' } as unknown as SchoolNeed;
    component.unit = 'pcs';
    component.agreementTypes = ['MOA'];
    component.projectCategories = ['Infrastructure'];
    component.previewImages = [previewImage];
    fixture.detectChanges();

    component.engagementForm.controls['stakeholderName'].setValue({ _id: 'stake1', name: 'Stakeholder' });
    component.engagementForm.controls['moaDate'].setValue(new Date('2026-01-01'));
    component.engagementForm.controls['quantity'].setValue(10);
    component.engagementForm.controls['unit'].setValue('pcs');
    component.engagementForm.controls['amount'].setValue(1000);

    component.implementationForm.controls['startDate'].setValue(new Date('2026-01-01'));
    component.implementationForm.controls['endDate'].setValue(new Date('2026-12-31'));
    component.implementationForm.controls['stakeholderRepCount'].setValue(2);
    component.implementationForm.controls['agreementType'].setValue('MOA');
    component.implementationForm.controls['signatoryName'].setValue('John Doe');
    component.implementationForm.controls['signatoryDesignation'].setValue('CEO');
    component.implementationForm.controls['projectCategory'].setValue('Infrastructure');
    component.implementationForm.controls['agreementStatus'].setValue('Ongoing');
    component.implementationForm.controls['initiatedBy'].setValue('school');
    fixture.detectChanges();
  }

  beforeEach(async () => {
    snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);
    engageSchoolNeedSpy = jasmine.createSpy('engageSchoolNeed').and.returnValue(of({}));
    updateEngagementSpy = jasmine.createSpy('updateEngagement').and.returnValue(of({}));
    routerNavigateSpy = jasmine.createSpy('navigate');

    await TestBed.configureTestingModule({
      imports: [SchoolNeedsEngageComponent],
      providers: [
        provideNativeDateAdapter(),
        { provide: Router, useValue: { navigate: routerNavigateSpy } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => (key === 'code' ? '101' : null),
              },
            },
          },
        },
        { provide: SharedDataService, useValue: { updateEngagementStatus: jasmine.createSpy() } },
        { provide: UserService, useValue: { getUsers: () => of({ data: [], totalItems: 0 }) } },
        {
          provide: ReferenceDataService,
          useValue: {
            initialize: () => Promise.resolve(),
            get: (key: string) => {
              if (key === 'agreementType') {
                return ['MOA'];
              }
              if (key === 'projectCategory') {
                return ['Infrastructure'];
              }
              return [];
            },
          },
        },
        {
          provide: SchoolNeedService,
          useValue: {
            getSchoolNeedByCode: () => of(null),
            updateSchoolNeed: () => of({}),
            engageSchoolNeed: engageSchoolNeedSpy,
          },
        },
        {
          provide: EngagementService,
          useValue: {
            updateEngagement: updateEngagementSpy,
          },
        },
        { provide: MatSnackBar, useValue: snackBar },
        { provide: HttpService, useValue: { uploadFile: () => of({}) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SchoolNeedsEngageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default isApplicable to true', () => {
    expect(component.isApplicable).toBe(true);
  });

  describe('validation indicators', () => {
    it('should show control error after submit attempt when control is invalid', () => {
      const control = { invalid: true, touched: false, dirty: false } as NgModel;

      expect(component.showControlError(control)).toBe(false);

      component.submitAttempted = true;

      expect(component.showControlError(control)).toBe(true);
    });

    it('should show control error when control is touched and invalid', () => {
      const control = { invalid: true, touched: true, dirty: false } as NgModel;

      expect(component.showControlError(control)).toBe(true);
    });

    it('should not show control error when control is valid', () => {
      component.submitAttempted = true;
      const control = { invalid: false, touched: true, dirty: true } as NgModel;

      expect(component.showControlError(control)).toBe(false);
    });

    it('should show MOV error only after submit attempt with no uploads', () => {
      component.previewImages = [];

      expect(component.showMovError()).toBe(false);

      component.submitAttempted = true;

      expect(component.showMovError()).toBe(true);
    });

    it('should hide MOV error after an image is attached', () => {
      component.submitAttempted = true;
      component.previewImages = [previewImage];

      expect(component.showMovError()).toBe(false);
    });

    it('should show stakeholder error after submit attempt when stakeholder is missing', () => {
      component.stakeholder = null;
      component.submitAttempted = true;

      expect(component.showStakeholderError()).toBe(true);
    });

    it('should treat a selected stakeholder object as valid', () => {
      component.stakeholder = { _id: 'stake1', name: 'Stakeholder' };

      expect(component.isStakeholderValid()).toBeTruthy();
    });

    it('should show stakeholder error when user typed text without selecting from list', () => {
      component.stakeholder = 'Typed Name';
      fixture.detectChanges();
      component.submitAttempted = true;

      expect(component.showStakeholderError()).toBe(true);
    });

    it('should reset submitAttempted when the form is cleared', () => {
      component.submitAttempted = true;

      component.clearForm();

      expect(component.submitAttempted).toBe(false);
      expect(component.isApplicable).toBe(true);
    });
  });

  describe('saveEngagement validation', () => {
    it('should block engagement and flag submit when stakeholder is missing', async () => {
      component.previewImages = [previewImage];

      await component.saveEngagement();

      expect(component.submitAttempted).toBe(true);
      expect(snackBar.open).toHaveBeenCalledWith(
        'Please select a stakeholder from the list.',
        'Close',
        jasmine.any(Object),
      );
      expect(engageSchoolNeedSpy).not.toHaveBeenCalled();
    });

    it('should block engagement when required fields are missing', async () => {
      component.stakeholder = { _id: 'stake1', name: 'Stakeholder' };
      component.needCode = '101';
      component.schoolNeed = { _id: 'need1', images: [] } as unknown as SchoolNeed;
      component.previewImages = [previewImage];

      await component.saveEngagement();

      expect(component.submitAttempted).toBe(true);
      expect(snackBar.open).toHaveBeenCalledWith(
        'Please fill out all required fields before engaging.',
        'Close',
        jasmine.any(Object),
      );
      expect(engageSchoolNeedSpy).not.toHaveBeenCalled();
    });
  });

  describe('saveEngagement MOV validation', () => {
    beforeEach(() => {
      component.stakeholder = { _id: 'stake1', name: 'Stakeholder' };
      component.needCode = '101';
      component.schoolNeed = { _id: 'need1', images: [] } as unknown as SchoolNeed;
    });

    it('should block engagement when no existing images and no new upload', async () => {
      component.previewImages = [];

      await component.saveEngagement();

      expect(component.submitAttempted).toBe(true);
      expect(snackBar.open).toHaveBeenCalledWith(
        'Please upload at least one MOV (Means of Verification) before engaging.',
        'Close',
        jasmine.any(Object),
      );
      expect(engageSchoolNeedSpy).not.toHaveBeenCalled();
    });

    it('should block engagement when existing images are present but no new upload', async () => {
      component.schoolNeed = { _id: 'need1', images: [existingImage] } as SchoolNeed;
      component.previewImages = [];

      await component.saveEngagement();

      expect(component.submitAttempted).toBe(true);
      expect(snackBar.open).toHaveBeenCalledWith(
        'Please update your MOV/image before engaging.',
        'Close',
        jasmine.any(Object),
      );
      expect(engageSchoolNeedSpy).not.toHaveBeenCalled();
    });

    it('should proceed when all required fields and a new MOV are provided', async () => {
      const httpService = TestBed.inject(HttpService);
      spyOn(httpService, 'uploadFile').and.returnValue(
        of({
          id: 'new-1',
          originalUrl: 'http://example.com/new-original.jpg',
          thumbnailUrl: 'http://example.com/new-thumb.jpg',
        }),
      );

      fillValidEngagementForm();

      await component.saveEngagement();

      expect(engageSchoolNeedSpy).toHaveBeenCalled();
      expect(snackBar.open).not.toHaveBeenCalledWith(
        'Please upload at least one MOV (Means of Verification) before engaging.',
        'Close',
        jasmine.any(Object),
      );
      expect(snackBar.open).not.toHaveBeenCalledWith(
        'Please update your MOV/image before engaging.',
        'Close',
        jasmine.any(Object),
      );
      expect(snackBar.open).not.toHaveBeenCalledWith(
        'Please fill out all required fields before engaging.',
        'Close',
        jasmine.any(Object),
      );
    });
  });

  describe('edit mode', () => {
    const engagement: Engagement = {
      _id: 'eng1',
      amount: 1000,
      quantity: 10,
      stakeholderUserId: { _id: 'stake1', name: 'Stakeholder' },
      unit: 'pcs',
      signingDate: '2026-01-01',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      schoolNeedId: 'need1',
      schoolId: 'school1',
      schoolYear: '2025-2026',
      specificContribution: 'Books',
      stakeholderRepCount: 2,
      agreementType: 'MOA',
      signatoryName: 'John Doe',
      signatoryDesignation: 'CEO',
      projectCategory: 'Infrastructure',
      agreementStatus: 'Ongoing',
      initiatedBy: 'school',
    };

    beforeEach(() => {
      component.engagementId = 'eng1';
      component.needCode = '101';
      component.schoolNeed = {
        _id: 'need1',
        images: [existingImage],
        unit: 'pcs',
        engagements: [engagement],
      } as SchoolNeed;
      (component as unknown as { populateFormFromEngagement: (e: Engagement) => void })
        .populateFormFromEngagement(engagement);
      fixture.detectChanges();
    });

    it('should be in edit mode when engagementId is set', () => {
      expect(component.isEditMode).toBe(true);
    });

    it('should prefill form fields from engagement', () => {
      expect(component.stakeholder).toEqual({ _id: 'stake1', name: 'Stakeholder' });
      expect(component.quantity).toBe(10);
      expect(component.amount).toBe(1000);
      expect(component.agreementType).toBe('MOA');
      expect(component.isApplicable).toBe(true);
    });

    it('should allow save with existing MOVs only in edit mode', async () => {
      component.previewImages = [];
      component.engagementForm.controls['stakeholderName'].setValue({ _id: 'stake1', name: 'Stakeholder' });
      component.engagementForm.controls['moaDate'].setValue(new Date('2026-01-01'));
      component.engagementForm.controls['quantity'].setValue(10);
      component.engagementForm.controls['unit'].setValue('pcs');
      component.engagementForm.controls['amount'].setValue(1000);
      component.implementationForm.controls['startDate'].setValue(new Date('2026-01-01'));
      component.implementationForm.controls['endDate'].setValue(new Date('2026-12-31'));
      component.implementationForm.controls['stakeholderRepCount'].setValue(2);
      component.implementationForm.controls['agreementType'].setValue('MOA');
      component.implementationForm.controls['signatoryName'].setValue('John Doe');
      component.implementationForm.controls['signatoryDesignation'].setValue('CEO');
      component.implementationForm.controls['projectCategory'].setValue('Infrastructure');
      component.implementationForm.controls['agreementStatus'].setValue('Ongoing');
      component.implementationForm.controls['initiatedBy'].setValue('school');
      fixture.detectChanges();

      await component.saveEngagement();

      expect(updateEngagementSpy).toHaveBeenCalledWith('eng1', jasmine.objectContaining({
        stakeholderUserId: 'stake1',
        quantity: 10,
        amount: 1000,
      }));
      expect(engageSchoolNeedSpy).not.toHaveBeenCalled();
      expect(snackBar.open).toHaveBeenCalledWith(
        'Engagement updated successfully!',
        'Close',
        jasmine.any(Object),
      );
    });

    it('should block edit when all MOVs are removed', async () => {
      component.schoolNeed = {
        _id: 'need1',
        images: [],
        unit: 'pcs',
        engagements: [engagement],
      } as unknown as SchoolNeed;
      component.previewImages = [];

      await component.saveEngagement();

      expect(updateEngagementSpy).not.toHaveBeenCalled();
      expect(snackBar.open).toHaveBeenCalledWith(
        'Please keep or upload at least one MOV (Means of Verification).',
        'Close',
        jasmine.any(Object),
      );
    });
  });
});
