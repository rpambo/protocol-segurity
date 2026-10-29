import { Injectable } from '@angular/core';

export type FirstLoginAccountType = 'admin' | 'member';

@Injectable({ providedIn: 'root' })
export class FirstLoginState {
  hasCompleted(accountType: FirstLoginAccountType, email: string): boolean {
    return localStorage.getItem(this.storageKey(accountType, email)) === 'true';
  }

  markCompleted(accountType: FirstLoginAccountType, email: string): void {
    localStorage.setItem(this.storageKey(accountType, email), 'true');
  }

  private storageKey(accountType: FirstLoginAccountType, email: string): string {
    return `spirit-embassy:first-login-complete:${accountType}:${email.trim().toLowerCase()}`;
  }
}
