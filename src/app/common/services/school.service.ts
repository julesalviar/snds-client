import {Injectable} from "@angular/core";
import {HttpService} from "./http.service";
import {catchError, map, Observable} from "rxjs";
import {API_ENDPOINT} from "../api-endpoints";
import {School} from "../model/school.model";

function encodeQueryValue(value: string): string {
  return encodeURIComponent(value).replace(/%20/g, '+');
}

@Injectable({ providedIn: 'root' })
export class SchoolService {
  constructor(private readonly httpService: HttpService) {
  }

  listSchools(params: {
    page: number;
    limit: number;
    search?: string;
    districtOrCluster?: string[];
  }): Observable<{ data: School[]; totalItems: number }> {
    const queryParams: string[] = [];
    queryParams.push(`page=${params.page}`);
    queryParams.push(`limit=${params.limit}`);
    if (params.search?.trim()) {
      queryParams.push(`search=${encodeQueryValue(params.search.trim())}`);
    }
    if (params.districtOrCluster?.length) {
      params.districtOrCluster.forEach((d) => {
        const trimmed = d?.trim();
        if (trimmed) queryParams.push(`district=${encodeQueryValue(trimmed)}`);
      });
    }
    const url = `${API_ENDPOINT.schools}?${queryParams.join('&')}`;
    return this.httpService.get<any>(url).pipe(
      map((res: any) => {
        const data = Array.isArray(res) ? res : res?.data ?? [];
        const totalItems =
          res?.totalItems ?? res?.total ?? res?.meta?.totalItems ?? res?.meta?.total ?? data.length;
        return { data, totalItems };
      }),
      catchError(this.httpService.handleError)
    );
  }

  getSchools(page: number, limit: number, district?: string): Observable<any> {
    let url = API_ENDPOINT.schools;
    const params: string[] = ['withNeed=true', 'withAip=true', 'withGeneratedResources=true'];

    if (page) {
      params.push(`page=${page}`);
    }

    if (limit) {
      params.push(`limit=${limit}`);
    }

    if (district) {
      params.push(`district=${encodeURIComponent(district.toLowerCase())}`);
    }

    url += `?${params.join('&')}`;

    return this.httpService.get<any>(url).pipe(
      catchError(this.httpService.handleError)
    );
  }

  getAllSchools(district?: string, search?: string): Observable<any> {
    let url = API_ENDPOINT.schools;
    const params: string[] = ['withNeed=true', 'withAip=true'];

    if (district) {
      params.push(`district=${encodeURIComponent(district.toLowerCase())}`);
    }

    if (search) {
      params.push(`search=${encodeURIComponent(search.trim())}`);
    }

    url += `?${params.join('&')}`;

    return this.httpService.get<any>(url).pipe(
      catchError(this.httpService.handleError)
    );
  }

  getSchoolById(id: string): Observable<any> {
    return this.httpService.get<any>(`${API_ENDPOINT.schools}/${id}`).pipe(
      map((response: any) => response.data),
      catchError(this.httpService.handleError)
    );
  }

  createSchool(payload: any): Observable<any> {
    return this.httpService.post(API_ENDPOINT.schools, payload).pipe(
      catchError(this.httpService.handleError)
    );
  }

  updateSchool(id: string, payload: any): Observable<any> {
    return this.httpService.put(`${API_ENDPOINT.schools}/${id}`, payload).pipe(
      catchError(this.httpService.handleError)
    );
  }

  deleteSchool(id: string): Observable<any> {
    return this.httpService.delete(`${API_ENDPOINT.schools}/${id}`).pipe(
      catchError(this.httpService.handleError)
    );
  }
}
