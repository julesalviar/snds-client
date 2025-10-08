import {Routes} from '@angular/router';
import {SignInComponent} from './sign-in/sign-in.component';
import {RegistrationComponent} from './registration/registration.component';
import {SchoolAdminRegistrationComponent} from './school-admin-registration/school-admin-registration.component';
import {HomeComponent} from './home/home.component';
import {StakeholdersComponent} from './stakeholders/stakeholders.component';
import {SchoolAdminComponent} from './school-admin/school-admin.component';
import {DivisionAdminComponent} from './division-admin/division-admin.component';
import {ReportsComponent} from './reports/reports.component';
import {AipComponent} from './school-admin/aip/aip.component';
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

export const routes: Routes = [
  {path: '', redirectTo: '/home', pathMatch: 'full'},
  {path: 'sign-in', component: SignInComponent},
  {path: 'register', component: RegistrationComponent},
  {path: 'school-admin-registration', component: SchoolAdminRegistrationComponent},
  {
    path: 'home',
    component: HomeComponent,
  },
  {path: 'change-password', component: ChangePasswordComponent},
  {path: 'footer', component: FooterComponent},
  {path: 'about-us', component: AboutUsComponent},

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
    children: [
      {path: 'all-school', component: AllSchoolComponent},
      {path: 'partners-support', component: StakeholdersComponent},
      {path: 'my-contribution', component: MyContributionComponent},
      {path: 'districts', component: ClustersComponent},
      {path: 'school-needs', component: StakeholdersComponent},
      {path: 'school-need-view/:code', component: SchoolNeedViewComponent},
    ]
  },

  // School Admin routes
  {path: 'school-admin/reports', component: ReportsComponent},
  {
    path: 'school-admin',
    canActivateChild: [AuthGuard],
    children: [
      {path: 'school-needs', component: SchoolAdminComponent},
      {path: 'list-of-school-needs', component: ListOfSchoolNeedsComponent},
      {path: 'senior-high-school', component: SchoolAdminComponent},
      {path: 'aip', component: AipComponent},
      {path: 'dpds', component: SchoolAdminComponent},
      {path: 'spfp', component: SchoolAdminComponent},
      {path: 'school-needs-engage/:code', component: SchoolNeedsEngageComponent},
      {path: 'implementation-status-dialog', component: ImplementationStatusDialogComponent},
      {path: 'school-need/:code', component: SchoolNeedComponent},
      {path: 'school-need-view/:code', component: SchoolNeedViewComponent},
    ]
  },

  { // Division Admin routes
    path: 'division-admin',
    // canActivateChild: [AuthGuard],
    children: [
      {path: 'school-needs', component: DivisionAdminComponent},
      {path: 'all-schools', component: DivisionAdminComponent},
      {path: 'schools-by-district', component: DivisionAdminComponent},
      {path: 'partners-support', component: DivisionAdminComponent},
      {path: 'reports', component: ReportsComponent}, //  Reports component
      {path: 'add-district', component: DivisionAdminComponent},
      {path: 'manage-users', component: DivisionAdminComponent},
      {path: 'permission-levels', component: DivisionAdminComponent},
      {path: 'open-registration', component: DivisionAdminComponent},
      {path: 'close-registration', component: DivisionAdminComponent},
      {path: 'create-partnership-link', component: DivisionAdminComponent},
    ]
  },

  // Wildcard redirect
  {path: '**', redirectTo: '/home'}
];
