import {Injectable} from "@angular/core";
import {catchError, Observable} from "rxjs";
import {API_ENDPOINT} from "../api-endpoints";
import {HttpService} from "./http.service";
import {Aip} from "../model/aip.model";

@Injectable({ providedIn: 'root' })
export class AipService {
  constructor(private readonly httpService: HttpService) {}

  getAips(page: number, limit: number): Observable<any> {
    return this.httpService.get<any>(`${API_ENDPOINT.aip}?page=${page}&limit=${limit}`).pipe(
      catchError(this.httpService.handleError)
    );
  }

  createAip(payload: Aip): Observable<any> {
    return this.httpService.post(API_ENDPOINT.aip, payload).pipe(
      catchError(this.httpService.handleError));
  }
}
