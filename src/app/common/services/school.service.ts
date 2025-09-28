import {Injectable} from "@angular/core";
import {HttpService} from "./http.service";
import {catchError, map, Observable} from "rxjs";
import {API_ENDPOINT} from "../api-endpoints";

@Injectable({ providedIn: 'root' })
export class SchoolService {
  constructor(private readonly httpService: HttpService) {
  }

  getSchools(page: number, limit: number): Observable<any> {
    const url = `${API_ENDPOINT.schools}?page=${page}&limit=${limit}`;
    
    return this.httpService.get<any>(url).pipe(
      catchError(this.httpService.handleError)
    );
  }

  getAllSchools(district?: string): Observable<any> {
    let url = API_ENDPOINT.schools;
    if (district) {
      url += `?district=${encodeURIComponent(district.toLowerCase())}`;
    }
    
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
