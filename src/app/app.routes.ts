import {Routes} from '@angular/router';
import {SignInComponent} from './sign-in/sign-in.component';
import {RegistrationComponent} from './registration/registration.component';
import {HomeComponent} from './home/home.component';
import {StakeholdersComponent} from './stakeholders/stakeholders.component';
import {SchoolAdminComponent} from './school-admin/school-admin.component';
import {DivisionAdminComponent} from './division-admin/division-admin.component';
import {ReportsComponent} from './reports/reports.component';
import {AipComponent} from './school-admin/aip/aip.component';
import {AipEditComponent} from './school-admin/aip/aip-edit/aip-edit.component';
import {ListOfSchoolNeedsComponent} from './school-admin/list-of-school-needs/list-of-school-needs.component';
import {SchoolNeedsEngageComponent} from './school-admin/school-needs-engage/school-needs-engage.component';
import {
  ImplementationStatusDialogComponent
} from './school-admin/implementation-status-dialog/implementation-status-dialog.component';
import {SchoolNeedComponent} from './school-admin/school-need/school-need.component';
import {AllSchoolComponent} from './stakeholders/all-school/all-school.component';
import {AuthGuard} from "./auth/auth.guard";
import {MyContributionComponent} from './stakeholders/my-contribution/my-contribution.component';
import {ClustersComponent} from './stakeholders/clusters/clusters.component';
import {ChangePasswordComponent} from './navigation/change-password/change-password.component';
import {FooterComponent} from './footer/footer.component';
import {AboutUsComponent} from './navigation/about-us/about-us.component';
import {SchoolNeedViewComponent} from "./school-admin/school-need-view/school-need-view.component";
import {ProfileComponent} from "./navigation/profile/profile.component";
import {AccountSettingsComponent} from './navigation/account-settings/account-settings.component';
import {GeneratedResourcesComponent} from "./stakeholders/generated-resources/generated-resources.component";
import {ResetPasswordComponent} from "./reset-password/reset-password.component";
import {UserType} from './registration/user-type.enum';
import { DpdsDataComponent } from './school-admin/dpds-data/dpds-data.component';
import { OfficeTableComponent } from './stakeholders/office-table/office-table.component';
import { ManageDistrictComponent } from './division-admin/manage-district/manage-district.component';
import { ManageFundSourceComponent } from './division-admin/manage-fund-source/manage-fund-source.component';
import { ManageUsersComponent } from './division-admin/manage-users/manage-users.component';
import { ManageSchoolsComponent } from './division-admin/manage-schools/manage-schools.component';
import { ManageSchoolYearLocksComponent } from './division-admin/manage-school-year-locks/manage-school-year-locks.component';
import { ManageWidgetSettingsComponent } from './division-admin/manage-widget-settings/manage-widget-settings.component';
import { ManageAnnouncementsComponent } from './division-admin/manage-announcements/manage-announcements.component';
import { OpenRegistrationComponent } from './open-registration/open-registration.component';
import { CloseRegistrationComponent } from './close-registration/close-registration.component';
import { CalendarComponent } from './calendar/calendar.component';
import { PpaPlanListComponent } from './division-admin/ppa-plan/ppa-plan-list.component';
import { PpaPlanFormComponent } from './division-admin/ppa-plan/ppa-plan-form.component';
import { ActivityListComponent } from './division-admin/activity/activity-list.component';
import { ActivityFormComponent } from './division-admin/activity/activity-form.component';
import { OfficeListComponent } from './division-admin/office/office-list.component';
import { StakeholdersProfileComponent } from './stakeholders-profile/stakeholders-profile.component';
import { ConfirmEmailComponent } from './confirm-email/confirm-email.component';
import { EmailActivatedComponent } from './email-activated/email-activated.component';
import { VerifyEmailChangeComponent } from './verify-email-change/verify-email-change.component';
import { EmailChangeVerifiedComponent } from './email-change-verified/email-change-verified.component';
import { ChangeRequestsComponent } from './division-admin/change-requests/change-requests.component';
import { AccomplishmentSummaryComponent } from './division-admin/office/accomplishment-summary/accomplishment-summary.component';

export const routes: Routes = [
  {path: '', redirectTo: '/home', pathMatch: 'full'},
  {path: 'sign-in', component: SignInComponent},
  {path: 'register', component: RegistrationComponent},
  {path: 'open-registration', component: OpenRegistrationComponent},
  {path: 'close-registration', component: CloseRegistrationComponent},
  {path: 'reset-password', component: ResetPasswordComponent},
  {path: 'confirm-email', component: ConfirmEmailComponent},
  {path: 'email-activated', component: EmailActivatedComponent},
  {path: 'verify-email-change', component: VerifyEmailChangeComponent},
  {path: 'email-change-verified', component: EmailChangeVerifiedComponent},
  {
    path: 'home',
    component: HomeComponent,
  },
  {path: 'change-password', component: ChangePasswordComponent, canActivate: [AuthGuard]},
  {path: 'account-settings', component: AccountSettingsComponent, canActivate: [AuthGuard]},
  {path: 'footer', component: FooterComponent},
  {path: 'about-us', component: AboutUsComponent},
  {path: 'profile', component: ProfileComponent, canActivate: [AuthGuard]},

  {
    path: 'guest',
    children: [
      {path: 'all-school', component: AllSchoolComponent},
      {path: 'districts', component: ClustersComponent, canActivate: [AuthGuard]},
      {path: 'school-needs', component: StakeholdersComponent},
    ],
  },

  { // Stakeholder routes
    path: 'stakeholder',
    canActivateChild: [AuthGuard],
    data: { roleType: UserType.StakeHolder },
    children: [
      {path: 'all-schools', component: AllSchoolComponent},
      {path: 'partners-support', component: StakeholdersComponent},
      {path: 'my-contribution', component: MyContributionComponent},
      {path: 'districts', component: ClustersComponent},
      {path: 'school-needs', component: StakeholdersComponent},
      {path: 'generated-resources', component: GeneratedResourcesComponent},
      {path: 'school-need-view/:code', component: SchoolNeedViewComponent},
      {path: 'aip/:schoolId', component: AipComponent},
      {path: 'office-table', component: OfficeTableComponent},
    ]
  },

  // School Admin routes
  {
    path: 'school-admin',
    canActivateChild: [AuthGuard],
    data: { roleType: UserType.SchoolAdmin },
    children: [
      {path: 'school-needs', component: SchoolAdminComponent},
      {path: 'list-of-school-needs', component: ListOfSchoolNeedsComponent},
      {path: 'senior-high-school', component: SchoolAdminComponent},
      {path: 'DpdsData', component: DpdsDataComponent},
      {path: 'aip', component: AipComponent},
      {path: 'aip/edit/:id', component: AipEditComponent},
      {path: 'basic', component: SchoolAdminComponent},
      {path: 'spfp', component: SchoolAdminComponent},
      {path: 'school-needs-engage/:code/:engagementId', component: SchoolNeedsEngageComponent},
      {path: 'school-needs-engage/:code', component: SchoolNeedsEngageComponent},
      {path: 'implementation-status-dialog', component: ImplementationStatusDialogComponent},
      {path: 'school-need/:code', component: SchoolNeedComponent},
      {path: 'school-need-view/:code', component: SchoolNeedViewComponent},
      {path: 'quick-count', component: GeneratedResourcesComponent},
      {path: 'reports', component: ReportsComponent},
      {path: 'stakeholders-profile', component: StakeholdersProfileComponent},
      {path: 'activities', component: ActivityListComponent},
      {path: 'activities/create', component: ActivityFormComponent},
      {path: 'activities/edit/:id', component: ActivityFormComponent},
    ]
  },

  { // Division Admin routes
    path: 'division-admin',
    canActivateChild: [AuthGuard],
    data: { roleType: UserType.DivisionAdmin },
    children: [
      {path: 'school-needs', component: StakeholdersComponent},
      {path: 'school-need-view/:code', component: SchoolNeedViewComponent},
      {path: 'all-schools', component: AllSchoolComponent},
      {path: 'districts', component: ClustersComponent},
      {path: 'office-table', component: OfficeTableComponent},
      {path: 'schools-by-district', component: DivisionAdminComponent},
      {path: 'partners-support', component: DivisionAdminComponent},
      {path: 'reports', component: ReportsComponent}, //  Reports component
      {path: 'manage-district', component: ManageDistrictComponent},
      {path: 'manage-users', component: ManageUsersComponent},
      {path: 'requests', component: ChangeRequestsComponent},
      {path: 'manage-schools', component: ManageSchoolsComponent},
      {path: 'school-year-locks', component: ManageSchoolYearLocksComponent},
      {path: 'widget-settings', component: ManageWidgetSettingsComponent},
      {path: 'activities', component: ActivityListComponent},
      {path: 'activities/create', component: ActivityFormComponent},
      {path: 'activities/edit/:id', component: ActivityFormComponent},
      {path: 'permission-levels', component: DivisionAdminComponent},
      {path: 'open-registration', component: DivisionAdminComponent},
      {path: 'close-registration', component: DivisionAdminComponent},
      {path: 'create-partnership-link', component: DivisionAdminComponent},
      {path: 'generated-resources', component: GeneratedResourcesComponent},
      {path: 'stakeholders-profile', component: StakeholdersProfileComponent},
      {path: 'manage-announcements', component: ManageAnnouncementsComponent},
      {path: 'office/accomplishment-summary', component: AccomplishmentSummaryComponent },
    ]
  },
  { // System Admin routes
    path: 'system-admin',
    canActivateChild: [AuthGuard],
    data: { roleType: UserType.SystemAdmin },
    children: [
      {path: 'manage-users', component: ManageUsersComponent},
      {path: 'requests', component: ChangeRequestsComponent},
      {path: 'school-year-locks', component: ManageSchoolYearLocksComponent},
      {path: 'widget-settings', component: ManageWidgetSettingsComponent},
      {path: 'manage-announcements', component: ManageAnnouncementsComponent},
    ]
  },
  { // Program Holder routes
    path: 'program-holder',
    canActivateChild: [AuthGuard],
    data: { roleType: UserType.ProgramHolder },
    children: [
      { path: 'ppa-plans', component: PpaPlanListComponent },
      { path: 'ppa-plans/create', component: PpaPlanFormComponent },
      { path: 'ppa-plans/edit/:id', component: PpaPlanFormComponent },
      { path: 'calendar', component: CalendarComponent },
    ]
  },
  {// Office Admin routes (OfficeAdmin and OfficeAdminAssistant)
    path: 'office-admin',
    canActivateChild: [AuthGuard],
    data: { allowedRoles: [UserType.OfficeAdmin, UserType.OfficeAdminAssistant] },
    children: [
      { path: 'offices', component: OfficeListComponent },
      { path: 'calendar', component: CalendarComponent },
      { path: 'ppa-plans', component: PpaPlanListComponent },
      { path: 'manage-fund-source', component: ManageFundSourceComponent },
      { path: 'manage-announcements', component: ManageAnnouncementsComponent },
      { path: 'accomplishment-summary', component: AccomplishmentSummaryComponent },
      
    ]
  },

  // Wildcard redirect
  { path: '**', redirectTo: '/home' }
];
