import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideRouter } from '@angular/router';
import { routes } from './app/app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import {provideHttpClient} from "@angular/common/http";
import {ReferenceDataService} from "./app/common/services/reference-data.service";
import {APP_INITIALIZER} from "@angular/core";

export function initReferenceData(referenceDataService: ReferenceDataService) {
  console.log('Initialized ReferenceDataService:');
  return () => referenceDataService.initialize();
}

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(),
    provideRouter(routes),
    provideAnimationsAsync(),
    ReferenceDataService,
    {
      provide: APP_INITIALIZER,
      useFactory: initReferenceData,
      deps: [ReferenceDataService],
      multi: true
    }
  ],
}).catch((err) => console.error(err));
