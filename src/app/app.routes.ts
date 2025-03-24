import { Routes } from '@angular/router';
import { SignInComponent } from './sign-in/sign-in.component';
import { RegistrationComponent } from './registration/registration.component';
import { SchoolAdminRegistrationComponent } from './school-admin-registration/school-admin-registration.component';

export const routes: Routes = [
  { path: '', redirectTo: '/sign-in', pathMatch: 'full' }, 
  { path: 'sign-in', component: SignInComponent },
  { path: 'register', component: RegistrationComponent },
  { path: 'school-admin-registration', component: SchoolAdminRegistrationComponent },
  { path: '**', redirectTo: '/sign-in' }
];