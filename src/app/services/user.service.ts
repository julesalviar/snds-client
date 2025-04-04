import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private userRole: string = 'schoolAdmin'; // Example: Change this to test different roles (stakeholder, divisionAdmin or schoolAdmin)
  
  getRole() {
    return this.userRole;
  }

  setRole(role: string) {
    this.userRole = role;
  }
}
