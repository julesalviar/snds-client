import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class UserService {

  private userRole: string = 'schoolAdmin'; // Example role
  private registeredUser: { name: string; email: string; password: string } | null = null;

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


  private userRole: string = 'schoolAdmin'; // Example: Change this to test different roles (stakeholder, divisionAdmin or schoolAdmin)

  getRole() {
    return this.userRole;
  }

  setRole(role: string) {
    this.userRole = role;
  }
}
