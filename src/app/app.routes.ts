import { Routes } from '@angular/router';
import { SignInComponent } from './sign-in/sign-in.component';
import { RegistrationComponent } from './registration/registration.component';
import { SchoolAdminRegistrationComponent } from './school-admin-registration/school-admin-registration.component';
import { HomeComponent } from './home/home.component';
import { StakeholdersComponent } from './stakeholders/stakeholders.component'; 
import { SchoolAdminComponent } from './school-admin/school-admin.component'; 
import { DivisionAdminComponent } from './division-admin/division-admin.component'; 
import { ReportsComponent } from './reports/reports.component'; 
import { AipComponent } from './school-admin/aip/aip.component';


export const routes: Routes = [
  { path: '', redirectTo: '/sign-in', pathMatch: 'full' },
  { path: 'sign-in', component: SignInComponent },
  { path: 'register', component: RegistrationComponent },
  { path: 'school-admin-registration', component: SchoolAdminRegistrationComponent },
 { path: 'home', component: HomeComponent },
  
  // Stakeholder routes
  { path: 'stakeholders',component: StakeholdersComponent},
  { path: 'stakeholder/all-schools', component: StakeholdersComponent },
  { path: 'stakeholder/schools-by-district', component: StakeholdersComponent }, 
  { path: 'stakeholder/my-contribution', component: StakeholdersComponent }, 
  { path: 'stakeholder/generated-resources', component: StakeholdersComponent }, 
  { path: 'stakeholder/about-us', component: StakeholdersComponent }, 
  { path: 'stakeholder/partners-support', component: StakeholdersComponent }, 

  // School Admin routes
  { path: 'school-admin', component: SchoolAdminComponent },
  { path: 'school-admin/list-of-needs', component: SchoolAdminComponent }, 
  { path: 'school-admin/senior-high-school', component: SchoolAdminComponent }, 
  { path: 'school-admin/aip', component: AipComponent }, 
  { path: 'school-admin/dpds', component: SchoolAdminComponent }, 
  { path: 'school-admin/quick-count', component: SchoolAdminComponent }, 
  { path: 'school-admin/spfp', component: SchoolAdminComponent }, 
  { path: 'school-admin/partnership', component: SchoolAdminComponent },
  { path: 'school-admin/reports', component: ReportsComponent }, 
  { path: 'school-admin/about-us', component: SchoolAdminComponent },

  // Division Admin routes
  { path: 'division-admin', component: DivisionAdminComponent},
  { path: 'division-admin/all-schools', component: DivisionAdminComponent }, 
  { path: 'division-admin/schools-by-district', component: DivisionAdminComponent }, 
  { path: 'division-admin/about-us', component: DivisionAdminComponent }, 
  { path: 'division-admin/partners-support', component: DivisionAdminComponent },
  { path: 'division-admin/reports', component: ReportsComponent }, // Use the Reports component
  { path: 'division-admin/add-district', component: DivisionAdminComponent }, 
  { path: 'division-admin/manage-users', component: DivisionAdminComponent }, 
  { path: 'division-admin/permission-levels', component: DivisionAdminComponent }, 
  { path: 'division-admin/open-registration', component: DivisionAdminComponent }, 
  { path: 'division-admin/close-registration', component: DivisionAdminComponent }, 
  { path: 'division-admin/create-partnership-link', component: DivisionAdminComponent }, 

  // Wildcard redirect
  { path: '**', redirectTo: '/sign-in' }
];