import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { HttpService } from '../common/services/http.service';
import { TokenHolder } from './token-holder';

function makeJwt(
  expOffsetSeconds: number,
  lifetimeSeconds = 12 * 60 * 60,
): string {
  const now = Math.floor(Date.now() / 1000);
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(
    JSON.stringify({
      iat: now - (lifetimeSeconds - expOffsetSeconds),
      exp: now + expOffsetSeconds,
    }),
  );
  return `${header}.${payload}.sig`;
}

describe('AuthService', () => {
  let service: AuthService;
  let httpService: jasmine.SpyObj<HttpService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    httpService = jasmine.createSpyObj('HttpService', ['post']);
    router = jasmine.createSpyObj('Router', ['navigate']);
    Object.defineProperty(router, 'url', { get: () => '/home' });

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: HttpService, useValue: httpService },
        { provide: Router, useValue: router },
      ],
    });
    service = TestBed.inject(AuthService);
    TokenHolder.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('refreshSession applies a new access token', (done) => {
    const token = makeJwt(3600);
    httpService.post.and.returnValue(
      of({ authenticated: true, access_token: token }),
    );

    service.refreshSession().subscribe((ok) => {
      expect(ok).toBe(true);
      expect(TokenHolder.getToken()).toBe(token);
      done();
    });
  });

  it('refreshSession shares a single in-flight request', (done) => {
    const token = makeJwt(3600);
    httpService.post.and.returnValue(
      of({ authenticated: true, access_token: token }),
    );

    const first = service.refreshSession();
    const second = service.refreshSession();
    expect(first).toBe(second);

    first.subscribe(() => {
      expect(httpService.post).toHaveBeenCalledTimes(1);
      done();
    });
  });

  it('refreshSession returns false when refresh endpoint fails', (done) => {
    httpService.post.and.returnValue(throwError(() => new Error('network')));

    service.refreshSession().subscribe((ok) => {
      expect(ok).toBe(false);
      done();
    });
  });

  it('refreshSession skips the network when inside the cooldown window', (done) => {
    const token = makeJwt(6 * 60 * 60);
    httpService.post.and.returnValue(
      of({ authenticated: true, access_token: token }),
    );

    service.refreshSession().subscribe(() => {
      service.refreshSession().subscribe((ok) => {
        expect(ok).toBe(true);
        expect(httpService.post).toHaveBeenCalledTimes(1);
        done();
      });
    });
  });

  it('refreshSession bypasses cooldown when forced', (done) => {
    const firstToken = makeJwt(6 * 60 * 60);
    const secondToken = makeJwt(6 * 60 * 60);
    httpService.post.and.returnValues(
      of({ authenticated: true, access_token: firstToken }),
      of({ authenticated: true, access_token: secondToken }),
    );

    service.refreshSession().subscribe(() => {
      service.refreshSession({ force: true }).subscribe((ok) => {
        expect(ok).toBe(true);
        expect(httpService.post).toHaveBeenCalledTimes(2);
        done();
      });
    });
  });

  it('initializeSession skips refresh when the stored token is still healthy', (done) => {
    const token = makeJwt(6 * 60 * 60);
    TokenHolder.setSessionToken(token);

    service.initializeSession().subscribe((result) => {
      expect(result?.access_token).toBe(token);
      expect(httpService.post).not.toHaveBeenCalled();
      done();
    });
  });

  it('initializeSession redirects when refresh fails and a token was stored', (done) => {
    TokenHolder.setSessionToken(makeJwt(-60));
    httpService.post.and.returnValue(of({ authenticated: false }));

    service.initializeSession().subscribe((result) => {
      expect(result).toBeNull();
      expect(router.navigate).toHaveBeenCalled();
      done();
    });
  });
});
