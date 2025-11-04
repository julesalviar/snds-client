import {Injectable} from "@angular/core";
import {catchError, map, Observable} from "rxjs";
import {API_ENDPOINT} from "../api-endpoints";
import {HttpService} from "./http.service";
import {Aip} from "../model/aip.model";
import {environment} from "../../../environments/environment";

@Injectable({ providedIn: 'root' })
export class AipService {
  constructor(private readonly httpService: HttpService) {}

  getAips(page: number, limit: number, schoolId?: string): Observable<any> {
    let url = `${API_ENDPOINT.aip}`;
    const params: string[] = [];

    if (page) {
      params.push(`page=${page}`);
    }

    if(limit) {
      params.push(`limit=${limit}`);
    }

    if (schoolId) {
      params.push(`schoolId=${encodeURIComponent(schoolId)}`);
    }

    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }

    return this.httpService.get<any[]>(url).pipe(
      catchError(this.httpService.handleError)
    );
  }

  createAip(payload: Aip): Observable<any> {
    return this.httpService.post(API_ENDPOINT.aip, payload).pipe(
      catchError(this.httpService.handleError));
  }

  getAipById(id: string): Observable<Aip> {
    return this.httpService.get<Aip>(`${API_ENDPOINT.aip}/${id}`).pipe(
      map((response: any) => response.data),
      catchError(this.httpService.handleError)
    );
  }

  updateAip(id: string, payload: Partial<Aip>): Observable<any> {
    return this.httpService.patch(`${API_ENDPOINT.aip}/${id}`, payload).pipe(
      catchError(this.httpService.handleError)
    );
  }

  deleteAip(id: string): Observable<any> {
    return this.httpService.delete(`${API_ENDPOINT.aip}/${id}`).pipe(
      catchError(this.httpService.handleError)
    );
  }
}
