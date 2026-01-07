import {Injectable} from "@angular/core";
import {HttpService} from "./http.service";
import {API_ENDPOINT} from "../api-endpoints";
import {catchError} from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  constructor(private readonly httpService: HttpService) {
  }

  getReports() {
    let url = API_ENDPOINT.reports;

    return this.httpService.get<any>(url).pipe(
      catchError(this.httpService.handleError)
    );
  }

  generateReport(reportId: string, payload: any) {
    return this.httpService.post<any>(`${API_ENDPOINT.reports}/${reportId}/generate`, payload).pipe(
      catchError(this.httpService.handleError)
    );
  }
}
