import { Injectable, inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { FirstLoginState } from './first-login-state';

@Injectable({ providedIn: 'root' })
export class AdminSession {
  private readonly router = inject(Router);
  private readonly firstLoginState = inject(FirstLoginState);
  adminEmail = '';
  requiresPasswordChange = false;

  signIn(email: string): void {
    this.adminEmail = email.trim();
    this.requiresPasswordChange = !this.firstLoginState.hasCompleted('admin', this.adminEmail);
  }

  completeFirstLogin(): void {
    this.firstLoginState.markCompleted('admin', this.adminEmail);
    this.requiresPasswordChange = false;
  }

  clearSession(): void {
    this.adminEmail = '';
    this.requiresPasswordChange = false;
  }

  get isSignedIn(): boolean {
    return Boolean(this.adminEmail);
  }
}

export const requireAdminSession: CanActivateFn = () => {
  const session = inject(AdminSession);
  const router = inject(Router);
  if (!session.isSignedIn) {
    return router.createUrlTree(['/admin/login']);
  }
  return session.requiresPasswordChange
    ? router.createUrlTree(['/first-login/admin'])
    : true;
};

export const requireAdminPasswordChange: CanActivateFn = () => {
  const session = inject(AdminSession);
  const router = inject(Router);
  if (!session.isSignedIn) {
    return router.createUrlTree(['/admin/login']);
  }
  return session.requiresPasswordChange
    ? true
    : router.createUrlTree(['/admin']);
};
