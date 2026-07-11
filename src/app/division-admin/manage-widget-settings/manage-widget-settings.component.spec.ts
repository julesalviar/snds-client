import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ManageWidgetSettingsComponent } from './manage-widget-settings.component';
import { DivisionSettingsService } from '../../common/services/division-settings.service';
import { InternalReferenceDataService } from '../../common/services/internal-reference-data.service';
import { ReferenceDataService } from '../../common/services/reference-data.service';
import { DEFAULT_ACTIVE_PARTNERS_WIDGET_SETTING } from '../../common/utils/active-partners-widget-settings.util';

describe('ManageWidgetSettingsComponent', () => {
  let component: ManageWidgetSettingsComponent;
  let fixture: ComponentFixture<ManageWidgetSettingsComponent>;
  let divisionSettingsService: jasmine.SpyObj<
    Pick<
      DivisionSettingsService,
      'getActivePartnersWidgetSetting' | 'updateActivePartnersWidgetSetting'
    >
  >;
  let showErrorSpy: jasmine.Spy;
  let showSuccessSpy: jasmine.Spy;

  beforeEach(async () => {
    divisionSettingsService = jasmine.createSpyObj('DivisionSettingsService', [
      'getActivePartnersWidgetSetting',
      'updateActivePartnersWidgetSetting',
    ]);
    divisionSettingsService.getActivePartnersWidgetSetting.and.resolveTo({
      ...DEFAULT_ACTIVE_PARTNERS_WIDGET_SETTING,
    });

    await TestBed.configureTestingModule({
      imports: [ManageWidgetSettingsComponent],
      providers: [
        { provide: DivisionSettingsService, useValue: divisionSettingsService },
        {
          provide: InternalReferenceDataService,
          useValue: { initialize: async () => undefined, get: () => [] },
        },
        {
          provide: ReferenceDataService,
          useValue: { initialize: async () => undefined, get: () => [] },
        },
        { provide: MatSnackBar, useValue: { open: jasmine.createSpy('open') } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ManageWidgetSettingsComponent);
    component = fixture.componentInstance;
    showErrorSpy = spyOn(
      component as unknown as { showError: (message: string) => void },
      'showError',
    ).and.callThrough();
    showSuccessSpy = spyOn(
      component as unknown as { showSuccess: (message: string) => void },
      'showSuccess',
    ).and.callThrough();
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows field validation errors and skips save for invalid input', async () => {
    component.activePartnersSetting = {
      ...DEFAULT_ACTIVE_PARTNERS_WIDGET_SETTING,
      minEngagementAmount: -10,
      rotateIntervalSeconds: 1,
    };

    await component.saveActivePartners();

    expect(
      divisionSettingsService.updateActivePartnersWidgetSetting,
    ).not.toHaveBeenCalled();
    expect(component.fieldErrors.minEngagementAmount).toBeTruthy();
    expect(component.fieldErrors.rotateIntervalSeconds).toBeTruthy();
    expect(showErrorSpy).toHaveBeenCalledWith(
      'Please fix the highlighted errors before saving.',
    );
  });

  it('shows backend validation message when save fails', async () => {
    divisionSettingsService.updateActivePartnersWidgetSetting.and.rejectWith({
      error: {
        message: ['rotateIntervalSeconds must not be greater than 300'],
      },
    });

    await component.saveActivePartners();

    expect(showErrorSpy).toHaveBeenCalledWith(
      'rotateIntervalSeconds must not be greater than 300',
    );
  });

  it('saves and clears field errors when input is valid', async () => {
    divisionSettingsService.updateActivePartnersWidgetSetting.and.resolveTo({
      ...DEFAULT_ACTIVE_PARTNERS_WIDGET_SETTING,
      rotateIntervalSeconds: 20,
    });
    component.fieldErrors = { rotateIntervalSeconds: 'old error' };

    await component.saveActivePartners();

    expect(
      divisionSettingsService.updateActivePartnersWidgetSetting,
    ).toHaveBeenCalled();
    expect(component.fieldErrors).toEqual({});
    expect(showSuccessSpy).toHaveBeenCalledWith(
      'Active Partners widget settings saved.',
    );
  });
});
