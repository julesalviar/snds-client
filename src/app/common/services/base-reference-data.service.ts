import { Injectable } from "@angular/core";
import { catchError, firstValueFrom, of, Observable } from "rxjs";

@Injectable()
export abstract class BaseReferenceDataService {
  private cache: Record<string, any> = {};
  private initialized = false;

  constructor() {}

  protected abstract getEndpoint(): string;
  protected abstract getHttpClient(): { get<T>(url: string): Observable<T> };
  protected abstract getErrorMessage(): string;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    const data = await firstValueFrom(
      this.getHttpClient().get<Record<string, any>>(this.getEndpoint()).pipe(
        catchError(err => {
          console.error(this.getErrorMessage(), err);
          return of({});
        })
      )
    );

    this.cache = data ?? {};
    this.initialized = true;
  }

  get<T = any>(key: string): T {
    return this.cache[key];
  }

  getAll(): Record<string, any> {
    return this.cache;
  }

  has(key: string): boolean {
    return Object.hasOwn(this.cache, key);
  }
}
