import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
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

  beforeEach(async () => {
    snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);
    engageSchoolNeedSpy = jasmine.createSpy('engageSchoolNeed').and.returnValue(of({}));

    await TestBed.configureTestingModule({
      imports: [SchoolNeedsEngageComponent],
      providers: [
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '101' } } } },
        { provide: SharedDataService, useValue: { updateEngagementStatus: jasmine.createSpy() } },
        { provide: UserService, useValue: { getUsersByRole: () => of({ data: [] }) } },
        {
          provide: ReferenceDataService,
          useValue: {
            initialize: () => Promise.resolve(),
            get: () => [],
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

  describe('saveEngagement MOV validation', () => {
    beforeEach(() => {
      component.stakeholder = { _id: 'stake1', name: 'Stakeholder' };
      component.needCode = '101';
      component.schoolNeed = { _id: 'need1', images: [] } as SchoolNeed;
    });

    it('should block engagement when no existing images and no new upload', async () => {
      component.previewImages = [];

      await component.saveEngagement();

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

      expect(snackBar.open).toHaveBeenCalledWith(
        'Please update your MOV/image before engaging.',
        'Close',
        jasmine.any(Object),
      );
      expect(engageSchoolNeedSpy).not.toHaveBeenCalled();
    });

    it('should proceed when at least one new MOV is attached', async () => {
      const httpService = TestBed.inject(HttpService);
      spyOn(httpService, 'uploadFile').and.returnValue(
        of({
          id: 'new-1',
          originalUrl: 'http://example.com/new-original.jpg',
          thumbnailUrl: 'http://example.com/new-thumb.jpg',
        }),
      );

      component.previewImages = [{
        file: new File([''], 'mov.jpg', { type: 'image/jpeg' }),
        dataUrl: null,
        uploading: false,
        progress: 0,
      }];

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
    });
  });
});
