import {Injectable} from "@angular/core";
import {catchError, Observable, throwError} from "rxjs";
import {API_ENDPOINT} from "../api-endpoints";
import {HttpService} from "./http.service";
import {Aip} from "../model/aip.model";
import {HttpErrorResponse} from "@angular/common/http";

@Injectable({ providedIn: 'root' })
export class AipService {
  constructor(private readonly httpService: HttpService) {}

  getAips(page: number, limit: number): Observable<any> {
    return this.httpService.get<any>(`${API_ENDPOINT.aip}?page=${page}&limit=${limit}`).pipe(
      catchError(this.handleError)
    );
  }

  createAip(payload: Aip): Observable<any> {
    return this.httpService.post(API_ENDPOINT.aip, payload).pipe(
      catchError(this.handleError));
  }

  private handleError(error: any): Observable<never> {
    console.log('Has error');
    let message = 'An unexpected error occurred';
    if (error.error instanceof ErrorEvent) {
      message = `Client Error: ${error.error.message}`;
    } else {
      message = `Server Error: ${error.status} ${error.message}`;
    }
    console.error(message);
    return throwError(() => new Error(message));
  }
}
