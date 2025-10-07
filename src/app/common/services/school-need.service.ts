import {Injectable} from "@angular/core";
import {HttpService} from "./http.service";
import {catchError, map, Observable} from "rxjs";
import {API_ENDPOINT} from "../api-endpoints";
import {SchoolNeed} from "../model/school-need.model";

@Injectable({ providedIn: 'root' })
export class SchoolNeedService {
  constructor(private readonly httpService: HttpService) {
  }

  getSchoolNeeds(page: number, limit: number, schoolYear?: string, specificContribution?: string, schoolId?: string): Observable<any> {
    let url = `${API_ENDPOINT.schoolNeed}?page=${page}&limit=${limit}`;

    if (schoolYear) {
      url += `&schoolYear=${schoolYear}`;
    }

    if (specificContribution) {
      url += `&specificContribution=${encodeURIComponent(specificContribution)}`;
    }

    if (schoolId) {
      url += `&schoolId=${schoolId}`;
    }

    return this.httpService.get<any>(url).pipe(
      catchError(this.httpService.handleError)
    )
  }

  createSchoolNeed(payload: SchoolNeed): Observable<any> {
    return this.httpService.post(API_ENDPOINT.schoolNeed, payload).pipe(
      catchError(this.httpService.handleError)
    );
  }

  getSchoolNeedByCode(code: string): Observable<SchoolNeed> {
    return this.httpService.get<any>(`${API_ENDPOINT.schoolNeed}/${code}`).pipe(
      map((response: any) => response.data),
      catchError(this.httpService.handleError)
    );
  }

  updateSchoolNeed(id: string, payload: SchoolNeed): Observable<any> {
    return this.httpService.put(`${API_ENDPOINT.schoolNeed}/${id}`, payload).pipe(
      catchError(this.httpService.handleError)
    );
  }

  engageSchoolNeed(engagementData: any): Observable<any> {
    return this.httpService.post(`${API_ENDPOINT.engagements}`, engagementData).pipe(
      catchError(this.httpService.handleError)
    );
  }
}
