import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../../auth/auth.service';

const AUTH_BOOTSTRAP_PATHS = [
  '/auth/refresh',
  '/auth/login',
  '/auth/signup',
  '/auth/logout',
];

function isAuthBootstrapRequest(url: string): boolean {
  return AUTH_BOOTSTRAP_PATHS.some((path) => url.includes(path));
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !isAuthBootstrapRequest(req.url)) {
        const sentAuth = req.headers.has('Authorization');
        authService.clearSession();
        if (sentAuth) {
          router.navigate(['/sign-in']);
        }
      }
      return throwError(() => error);
    }),
  );
};
