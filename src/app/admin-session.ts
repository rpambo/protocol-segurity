import { Injectable, inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { FirstLoginState } from './first-login-state';
import { DirectoryAdminLevel, MemberDirectory } from './member-directory';

@Injectable({ providedIn: 'root' })
export class AdminSession {
  private readonly router = inject(Router);
  private readonly firstLoginState = inject(FirstLoginState);
  private readonly memberDirectory = inject(MemberDirectory);
  adminEmail = '';
  adminLevel: DirectoryAdminLevel = 'global-admin';
  adminCountry = '';
  adminCity = '';
  requiresPasswordChange = false;

  signIn(email: string): void {
    this.adminEmail = email.trim();
    const account = this.memberDirectory.findByEmail(this.adminEmail);
    this.adminLevel = account?.accountType === 'global-admin' || account?.accountType === 'regional-admin' || account?.accountType === 'local-admin'
      ? account.accountType
      : account?.accountType === 'admin'
        ? account.scope === 'Global' ? 'global-admin' : account.scope === 'Regional' ? 'regional-admin' : 'local-admin'
        : 'global-admin';
    this.adminCountry = account?.country ?? '';
    this.adminCity = account?.city ?? '';
    this.requiresPasswordChange = !this.firstLoginState.hasCompleted('admin', this.adminEmail);
  }

  completeFirstLogin(): void {
    this.firstLoginState.markCompleted('admin', this.adminEmail);
    this.requiresPasswordChange = false;
  }

  clearSession(): void {
    if (this.adminEmail) {
      this.memberDirectory.recordSuccessfulSignOut(this.adminEmail, 'Admin');
    }
    this.adminEmail = '';
    this.adminLevel = 'global-admin';
    this.adminCountry = '';
    this.adminCity = '';
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
