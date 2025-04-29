import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class UserService {
<<<<<<< HEAD
  private userRole: string = 'schoolAdmin'; // Example role schoolAdmin, divisionAdmin,stakeholder
  private registeredUser: { name: string; email: string; password: string} | null = null;
=======

  private userRole: string = 'schoolAdmin'; // Example role
  private registeredUser: { name: string; email: string; password: string } | null = null;
>>>>>>> origin/snds-client

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
