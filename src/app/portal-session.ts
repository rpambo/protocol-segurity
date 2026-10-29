import { Injectable, inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { FirstLoginState } from './first-login-state';

@Injectable({ providedIn: 'root' })
export class PortalSession {
  private readonly router = inject(Router);
  private readonly firstLoginState = inject(FirstLoginState);
  memberName = '';
  memberEmail = '';
  requiresPasswordChange = false;

  signIn(email: string): void {
    this.memberEmail = email.trim();
    this.requiresPasswordChange = !this.firstLoginState.hasCompleted('member', this.memberEmail);
    const name = this.memberEmail.split('@')[0]?.replace(/[._-]+/g, ' ') ?? '';
    this.memberName = name.replace(/\b\w/g, (letter) => letter.toUpperCase()) || 'Member';
  }

  completeFirstLogin(): void {
    this.firstLoginState.markCompleted('member', this.memberEmail);
    this.requiresPasswordChange = false;
  }

  signOut(): void {
    this.clearSession();
    void this.router.navigate(['/']);
  }

  clearSession(): void {
    this.memberName = '';
    this.memberEmail = '';
    this.requiresPasswordChange = false;
  }

  get isSignedIn(): boolean {
    return Boolean(this.memberEmail);
  }
}

export const requirePortalSession: CanActivateFn = () => {
  const session = inject(PortalSession);
  const router = inject(Router);
  if (!session.isSignedIn) {
    return router.createUrlTree(['/login']);
  }
  return session.requiresPasswordChange
    ? router.createUrlTree(['/first-login/member'])
    : true;
};

export const requirePortalPasswordChange: CanActivateFn = () => {
  const session = inject(PortalSession);
  const router = inject(Router);
  if (!session.isSignedIn) {
    return router.createUrlTree(['/login']);
  }
  return session.requiresPasswordChange
    ? true
    : router.createUrlTree(['/portal']);
};
