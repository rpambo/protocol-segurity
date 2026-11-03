import { Injectable, inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { FirstLoginState } from './first-login-state';
import { MemberDirectory } from './member-directory';

@Injectable({ providedIn: 'root' })
export class PortalSession {
  private readonly router = inject(Router);
  private readonly firstLoginState = inject(FirstLoginState);
  private readonly memberDirectory = inject(MemberDirectory);
  memberName = '';
  memberEmail = '';
  memberAvatar = '';
  memberEmailVisible = false;
  requiresPasswordChange = false;

  signIn(email: string): void {
    this.memberEmail = email.trim();
    const account = this.memberDirectory.findByEmail(this.memberEmail);
    const loginType = account && this.memberDirectory.isAdminAccount(account) ? 'admin' : 'member';
    this.requiresPasswordChange = !this.firstLoginState.hasCompleted(loginType, this.memberEmail);
    const name = account?.name ?? this.memberEmail.split('@')[0]?.replace(/[._-]+/g, ' ') ?? '';
    const defaultName = name.replace(/\b\w/g, (letter) => letter.toUpperCase()) || 'Member';
    const profile = this.readProfile(this.memberEmail);
    this.memberName = profile?.name ?? defaultName;
    this.memberAvatar = profile?.avatar ?? '';
    this.memberEmailVisible = profile?.emailVisible ?? false;
  }

  updateProfile(name: string, avatar: string, emailVisible: boolean): void {
    const normalizedName = name.trim();
    if (!normalizedName) {
      throw new Error('Enter your full name before saving your profile.');
    }

    const profile = { name: normalizedName, avatar, emailVisible };
    localStorage.setItem(this.profileStorageKey(this.memberEmail), JSON.stringify(profile));
    this.memberName = normalizedName;
    this.memberAvatar = avatar;
    this.memberEmailVisible = emailVisible;
  }

  private readProfile(email: string): { name: string; avatar: string; emailVisible: boolean } | null {
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
      typeof profile.avatar !== 'string' ||
      ('emailVisible' in profile && typeof profile.emailVisible !== 'boolean')
    ) {
      throw new Error('The saved member profile is invalid. Clear this browser profile and sign in again.');
    }
    return {
      name: profile.name,
      avatar: profile.avatar,
      emailVisible: 'emailVisible' in profile && typeof profile.emailVisible === 'boolean'
        ? profile.emailVisible
        : false
    };
  }

  private profileStorageKey(email: string): string {
    return `member-profile:${email.toLowerCase()}`;
  }

  completeFirstLogin(): void {
    const account = this.memberDirectory.findByEmail(this.memberEmail);
    const loginType = account && this.memberDirectory.isAdminAccount(account) ? 'admin' : 'member';
    this.firstLoginState.markCompleted(loginType, this.memberEmail);
    this.requiresPasswordChange = false;
  }

  get accountRole(): string {
    const account = this.memberDirectory.findByEmail(this.memberEmail);
    switch (account?.accountType) {
      case 'global-admin':
        return 'Global Admin';
      case 'regional-admin':
        return 'Regional Admin';
      case 'local-admin':
        return 'Local Admin';
      case 'admin':
        return account.scope === 'Global' ? 'Global Admin' : account.scope === 'Regional' ? 'Regional Admin' : 'Local Admin';
      default:
        return account?.role ?? 'Member';
    }
  }

  get accountLocation(): string {
    const account = this.memberDirectory.findByEmail(this.memberEmail);
    return [account?.city, account?.country].filter(Boolean).join(' · ') || 'Community member';
  }

  signOut(): void {
    this.clearSession();
    void this.router.navigate(['/']);
  }

  clearSession(): void {
    if (this.memberEmail) {
      this.memberDirectory.recordSuccessfulSignOut(this.memberEmail, 'Member');
    }
    this.memberName = '';
    this.memberEmail = '';
    this.memberAvatar = '';
    this.memberEmailVisible = false;
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
