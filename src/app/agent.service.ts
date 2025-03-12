import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UserAgentService {
  userAgent: string;

  constructor() {
    const userAgentMatch = navigator.userAgent.match(/(Mozilla.+Safari\/\d{3}\.\d{2})/);
    this.userAgent = userAgentMatch ? userAgentMatch[1] : navigator.userAgent;
  }
}