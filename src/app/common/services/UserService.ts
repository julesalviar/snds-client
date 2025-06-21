import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root' 
})
export class UserService {
  private registeredUser: { name: string; email: string; password: string } | null = null;

  constructor() {}

  register(name: string, email: string, password: string) {
    this.registeredUser = { name, email, password };
    console.log('User registered:', this.registeredUser);
  }

  getRegisteredUser() {
    return this.registeredUser;
  }

  getUserName(): string {
    return this.registeredUser ? this.registeredUser.name : '';
  }
}