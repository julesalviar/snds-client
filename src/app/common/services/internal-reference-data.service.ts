import { Injectable } from "@angular/core";
import {API_ENDPOINT} from "../api-endpoints";
import {HttpService} from "./http.service";
import {BaseReferenceDataService} from "./base-reference-data.service";

@Injectable({ providedIn: 'root' })
export class InternalReferenceDataService extends BaseReferenceDataService {
  constructor(
    private readonly http: HttpService) {
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
}
