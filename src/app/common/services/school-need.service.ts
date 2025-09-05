import {Injectable} from "@angular/core";
import {HttpService} from "./http.service";
import {catchError, Observable} from "rxjs";
import {API_ENDPOINT} from "../api-endpoints";

@Injectable({ providedIn: 'root' })
export class SchoolNeedService {
  constructor(private readonly httpService: HttpService) {
  }

  getSchoolNeeds(page: number, limit: number): Observable<any> {
    return this.httpService.get<any>(`${API_ENDPOINT.schoolNeed}?page=${page}&limit=${limit}`).pipe(
      catchError(this.httpService.handleError)
    )
  }
}
