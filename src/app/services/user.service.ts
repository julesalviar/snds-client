import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private userRole: string = 'schoolAdmin'; // Example role schoolAdmin, divisionAdmin,stakeholder
  private registeredUser: { name: string; email: string; password: string} | null = null;

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
