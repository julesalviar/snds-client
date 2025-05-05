import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {HttpClient, HttpHeaders} from "@angular/common/http";
import { environment } from '../../environments/environment';
@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly baseUrl = `${environment.API_URL}/auth/signup`;
  private userRole: string = 'schoolAdmin'; // Example role: schoolAdmin, divisionAdmin, stakeholder
  private registeredUser: { name: string; email: string; password: string } | null = null;
  private readonly projectTitlesSubject = new BehaviorSubject<string[]>([]);
  projectTitles$ = this.projectTitlesSubject.asObservable();
  private readonly schoolsSubject = new BehaviorSubject<any[]>([]);
  schools$ = this.schoolsSubject.asObservable();

  constructor(private readonly http: HttpClient) {}

  addSchool(school: any) {
    const currentSchools = this.schoolsSubject.value;
    this.schoolsSubject.next([...currentSchools, school]);
  }

  setProjectTitles(titles: string[]) {
    this.projectTitlesSubject.next(titles);
  }

  private readonly contributionData = new BehaviorSubject<any>(null);
  currentContribution = this.contributionData.asObservable();
  setContribution(data: any) {
    this.contributionData.next(data);
  }

  register(name: string, email: string, password: string) {
    this.registeredUser = { name, email, password };
    console.log('User registered:', this.registeredUser);

    const userData = {
      email,
      password,
      userName: email,
      firstName: 'test',
      lastName: 'test',
      role: 'Stakeholder'
    };

    const headers = new HttpHeaders()
      .set('tenant', 'gensan') // TODO: @jules change this to the actual tenant
      .set('Content-Type', 'application/json');

    const res = this.http.post(this.baseUrl, userData, { headers }).subscribe(
      response => console.log('Success:', response),
      error => console.error('Error:', error)
    );

    console.log(res);
    return res;
  }

  getUserName(): string {
    return this.registeredUser ? this.registeredUser.name : '';
  }

  getRegisteredUser() {
    return this.registeredUser;
  }

  getRole() {
    return this.userRole;
  }

  setRole(role: string) {
    this.userRole = role;
  }
}
