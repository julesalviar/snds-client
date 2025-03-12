import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root' // Ensures that the service is provided at the root level
})
export class UserService {
  private registeredUser: { email: string; password: string } | null = null;

  register(email: string, password: string) {
    this.registeredUser = { email, password };
    console.log('User registered:', this.registeredUser);
  }

  getRegisteredUser() {
    return this.registeredUser;
  }
}