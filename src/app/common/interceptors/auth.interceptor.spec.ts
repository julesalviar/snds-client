import { TestBed } from '@angular/core/testing';
import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../auth/auth.service';
import { TokenHolder } from '../../auth/token-holder';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    authService = jasmine.createSpyObj('AuthService', [
      'refreshSession',
      'clearSession',
    ]);
    router = jasmine.createSpyObj('Router', ['navigate']);
    Object.defineProperty(router, 'url', { get: () => '/home' });

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('retries the request after a successful refresh on 401', () => {
    const token = 'new-token';
    authService.refreshSession.and.returnValue(of(true));
    spyOn(TokenHolder, 'getToken').and.returnValue(token);

    let response: unknown;
    http.get('/api/items').subscribe((value) => {
      response = value;
    });

    const first = httpMock.expectOne('/api/items');
    first.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(authService.refreshSession).toHaveBeenCalledWith({ force: true });

    const retry = httpMock.expectOne('/api/items');
    expect(retry.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    retry.flush({ ok: true });

    expect(response).toEqual({ ok: true });
    expect(authService.clearSession).not.toHaveBeenCalled();
  });

  it('clears session when refresh fails on 401', () => {
    authService.refreshSession.and.returnValue(of(false));

    http.get('/api/items').subscribe({
      error: () => undefined,
    });

    const first = httpMock.expectOne('/api/items');
    first.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(authService.refreshSession).toHaveBeenCalledWith({ force: true });
    expect(authService.clearSession).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalled();
    httpMock.expectNone('/api/items');
  });

  it('does not intercept 401 on auth bootstrap endpoints', () => {
    http.get('/auth/login').subscribe({
      error: () => undefined,
    });

    const req = httpMock.expectOne('/auth/login');
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(authService.refreshSession).not.toHaveBeenCalled();
    expect(authService.clearSession).not.toHaveBeenCalled();
  });

  it('clears session without a second refresh when the retried request also returns 401', () => {
    const token = 'new-token';
    authService.refreshSession.and.returnValue(of(true));
    spyOn(TokenHolder, 'getToken').and.returnValue(token);

    http.get('/api/items').subscribe({
      error: () => undefined,
    });

    const first = httpMock.expectOne('/api/items');
    first.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(authService.refreshSession).toHaveBeenCalledTimes(1);

    const retry = httpMock.expectOne('/api/items');
    retry.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(authService.refreshSession).toHaveBeenCalledTimes(1);
    expect(authService.clearSession).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalled();
    httpMock.expectNone('/api/items');
  });
});
