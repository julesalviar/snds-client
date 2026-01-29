import { Injectable } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { API_ENDPOINT } from "../api-endpoints";
import { HttpService } from "./http.service";
import { BaseReferenceDataService } from "./base-reference-data.service";

const CLUSTERS_KEY = 'clusters';

@Injectable({ providedIn: 'root' })
export class InternalReferenceDataService extends BaseReferenceDataService {
  constructor(
    private readonly http: HttpService
  ) {
    super();
  }

  protected getEndpoint(): string {
    return API_ENDPOINT.internalReferenceData;
  }

  protected getHttpClient(): { get<T>(url: string): any } {
    return this.http;
  }

  protected getErrorMessage(): string {
    return 'Internal reference data failed';
  }

  /** Get clusters (districts) array. Call initialize() first. */
  getClusters(): string[] {
    const raw = this.get(CLUSTERS_KEY);
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === 'object' && Array.isArray((raw as { value?: string[] }).value)) {
      return (raw as { value: string[] }).value;
    }
    return [];
  }

  /** Update clusters (districts) and invalidate cache so next get refetches. */
  async updateClusters(value: string[]): Promise<void> {
    const url = `${this.getEndpoint()}/${CLUSTERS_KEY}`;
    await firstValueFrom(this.http.put(url, { value }));
    this.invalidate();
  }
}
