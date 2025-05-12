import {Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {HttpClient, HttpHeaders} from "@angular/common/http";
import {environment} from '../../environments/environment';
import {User} from "../registration/user.model";

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

  register(user: User) {
    const { name, email, password, address, sector, type } = user;
    console.log('User registered:', user);

    const userData = {
      name,
      address,
      sector,
      email,
      password,
      userName: email, // TODO: will use the email as username for now
      role: type
    };

    const headers = new HttpHeaders()
      .set('tenant', 'gensan') // TODO: change this to the actual tenant
      .set('Content-Type', 'application/json');

    return this.http.post(this.baseUrl, userData, {headers});
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
