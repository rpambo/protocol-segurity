import { Injectable, inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { FirstLoginState } from './first-login-state';

@Injectable({ providedIn: 'root' })
export class PortalSession {
  private readonly router = inject(Router);
  private readonly firstLoginState = inject(FirstLoginState);
  memberName = '';
  memberEmail = '';
  memberAvatar = '';
  requiresPasswordChange = false;

  signIn(email: string): void {
    this.memberEmail = email.trim();
    this.requiresPasswordChange = !this.firstLoginState.hasCompleted('member', this.memberEmail);
    const name = this.memberEmail.split('@')[0]?.replace(/[._-]+/g, ' ') ?? '';
    const defaultName = name.replace(/\b\w/g, (letter) => letter.toUpperCase()) || 'Member';
    const profile = this.readProfile(this.memberEmail);
    this.memberName = profile?.name ?? defaultName;
    this.memberAvatar = profile?.avatar ?? '';
  }

  updateProfile(name: string, avatar: string): void {
    const normalizedName = name.trim();
    if (!normalizedName) {
      throw new Error('Enter your full name before saving your profile.');
    }

    const profile = { name: normalizedName, avatar };
    localStorage.setItem(this.profileStorageKey(this.memberEmail), JSON.stringify(profile));
    this.memberName = normalizedName;
    this.memberAvatar = avatar;
  }

  private readProfile(email: string): { name: string; avatar: string } | null {
    const storedProfile = localStorage.getItem(this.profileStorageKey(email));
    if (!storedProfile) {
      return null;
    }

    const profile: unknown = JSON.parse(storedProfile);
    if (
      typeof profile !== 'object' ||
      profile === null ||
      !('name' in profile) ||
      typeof profile.name !== 'string' ||
      !('avatar' in profile) ||
      typeof profile.avatar !== 'string'
    ) {
      throw new Error('The saved member profile is invalid. Clear this browser profile and sign in again.');
    }
    return { name: profile.name, avatar: profile.avatar };
  }

  private profileStorageKey(email: string): string {
    return `member-profile:${email.toLowerCase()}`;
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
    this.memberAvatar = '';
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
