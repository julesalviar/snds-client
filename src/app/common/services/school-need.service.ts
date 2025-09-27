import {Injectable} from "@angular/core";
import {HttpService} from "./http.service";
import {catchError, map, Observable} from "rxjs";
import {API_ENDPOINT} from "../api-endpoints";
import {SchoolNeed} from "../model/school-need.model";

@Injectable({ providedIn: 'root' })
export class SchoolNeedService {
  constructor(private readonly httpService: HttpService) {
  }

  getSchoolNeeds(page: number, limit: number, schoolYear?: string): Observable<any> {
    return this.httpService.get<any>(`${API_ENDPOINT.schoolNeed}?page=${page}&limit=${limit}&schoolYear=${schoolYear}`).pipe(
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

  engageSchoolNeed(code: string, engagementData: any): Observable<any> {
    return this.httpService.patch(`${API_ENDPOINT.schoolNeed}/${code}/engage`, engagementData).pipe(
      catchError(this.httpService.handleError)
    );
  }
}
