import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
@Injectable({
  providedIn: 'root',
})
export class UserService {
  private userRole: string = 'schoolAdmin'; // Example role: schoolAdmin, divisionAdmin, stakeholder
  private registeredUser: { name: string; email: string; password: string } | null = null;
  private projectTitlesSubject = new BehaviorSubject<string[]>([]);
  projectTitles$ = this.projectTitlesSubject.asObservable();
  private schoolsSubject = new BehaviorSubject<any[]>([]);
  schools$ = this.schoolsSubject.asObservable();

  addSchool(school: any) {
    const currentSchools = this.schoolsSubject.value;
    this.schoolsSubject.next([...currentSchools, school]);
  }

  setProjectTitles(titles: string[]) {
    this.projectTitlesSubject.next(titles);
  }
  

  
  private contributionData = new BehaviorSubject<any>(null);
  currentContribution = this.contributionData.asObservable();
  setContribution(data: any) {
    this.contributionData.next(data);
  }
  constructor() {}

  register(name: string, email: string, password: string) {
    this.registeredUser = { name, email, password };
    console.log('User registered:', this.registeredUser);
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