import { Injectable } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { API_ENDPOINT } from "../api-endpoints";
import { HttpService } from "./http.service";
import { BaseReferenceDataService } from "./base-reference-data.service";

const CLUSTERS_KEY = 'clusters';
const OPEN_REGISTRATION_KEY = 'openRegistration';
const OFFICE_DIVISIONS_KEY = 'officeDivisions';
const FUND_SOURCE_KEY = 'fundSource';

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

  /** Get office divisions array. Call initialize() first. */
  getOfficeDivisions(): string[] {
    const raw = this.get(OFFICE_DIVISIONS_KEY);
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === 'object' && Array.isArray((raw as { value?: string[] }).value)) {
      return (raw as { value: string[] }).value;
    }
    return [];
  }

  /** Get fund source options array. Call initialize() first. */
  getFundSources(): string[] {
    const raw = this.get(FUND_SOURCE_KEY);
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === 'object' && Array.isArray((raw as { value?: string[] }).value)) {
      return (raw as { value: string[] }).value;
    }
    return [];
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
    await firstValueFrom(this.http.put(url, value));
    this.invalidate();
  }

  /** Update openRegistration and invalidate cache so next get refetches. */
  async updateOpenRegistration(value: boolean): Promise<void> {
    const url = `${this.getEndpoint()}/${OPEN_REGISTRATION_KEY}`;
    await firstValueFrom(this.http.put(url, { value }));
    this.invalidate();
  }
}
