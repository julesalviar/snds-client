import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideRouter } from '@angular/router';
import { routes } from './app/app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ReferenceDataService } from './app/common/services/reference-data.service';
import { APP_INITIALIZER } from '@angular/core';
import { AuthService } from './app/auth/auth.service';
import { authInterceptor } from './app/common/interceptors/auth.interceptor';
import { firstValueFrom } from 'rxjs';

export function initReferenceData(referenceDataService: ReferenceDataService) {
  return () => referenceDataService.initialize();
}

export function initAuthSession(authService: AuthService) {
  return () => firstValueFrom(authService.initializeSession()).catch(() => null);
}

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(withInterceptors([authInterceptor])),
    provideRouter(routes),
    provideAnimationsAsync(),
    ReferenceDataService,
    {
      provide: APP_INITIALIZER,
      useFactory: initAuthSession,
      deps: [AuthService],
      multi: true,
    },
    {
      provide: APP_INITIALIZER,
      useFactory: initReferenceData,
      deps: [ReferenceDataService],
      multi: true,
    },
  ],
}).catch((err) => console.error(err));
