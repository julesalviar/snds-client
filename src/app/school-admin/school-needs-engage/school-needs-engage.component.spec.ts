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
import { HttpService } from '../../common/services/http.service';
import { SchoolNeed, SchoolNeedImage } from '../../common/model/school-need.model';

describe('SchoolNeedsEngageComponent', () => {
  let component: SchoolNeedsEngageComponent;
  let fixture: ComponentFixture<SchoolNeedsEngageComponent>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;
  let engageSchoolNeedSpy: jasmine.Spy;

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

    await TestBed.configureTestingModule({
      imports: [SchoolNeedsEngageComponent],
      providers: [
        provideNativeDateAdapter(),
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '101' } } } },
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
});
