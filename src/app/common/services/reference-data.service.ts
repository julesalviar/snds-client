import { Injectable } from "@angular/core";
import {API_ENDPOINT} from "../api-endpoints";
import {catchError, firstValueFrom, of} from "rxjs";
import {HttpClient} from "@angular/common/http";

@Injectable({ providedIn: 'root' })
export class ReferenceDataService {
  private cache: Record<string, any> = {};
  private initialized = false;

  constructor(
    private readonly http: HttpClient) {}

  async initialize(): Promise<void> {
    if (this.initialized) return;
    console.log("Initialized ReferenceDataService reinitialized");
    const data = await firstValueFrom(
      this.http.get<Record<string, any>>(API_ENDPOINT.referenceData).pipe(
        catchError(err => {
          console.error('Reference data failed', err);
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
