import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AdminSession } from '../admin-session';
import { FirstLoginAccountType } from '../first-login-state';
import { PortalSession } from '../portal-session';

@Component({
  selector: 'app-first-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './first-login.html',
  styleUrl: './first-login.css'
})
export class FirstLogin {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly adminSession = inject(AdminSession);
  private readonly portalSession = inject(PortalSession);

  protected readonly accountType: FirstLoginAccountType = this.getAccountType();
  protected newPassword = '';
  protected confirmPassword = '';
  protected showPassword = false;
  protected errorMessage = '';

  protected get accountEmail(): string {
    return this.accountType === 'admin'
      ? this.adminSession.adminEmail
      : this.portalSession.memberEmail;
  }

  protected get displayName(): string {
    return this.accountType === 'admin'
      ? this.accountEmail
      : this.portalSession.memberName;
  }

  protected savePassword(): void {
    this.errorMessage = '';

    if (this.newPassword.length < 8) {
      this.errorMessage = 'Your new password must have at least 8 characters.';
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'The passwords do not match. Please try again.';
      return;
    }

    if (this.accountType === 'admin') {
      this.adminSession.completeFirstLogin();
      void this.router.navigate(['/admin']);
      return;
    }

    this.portalSession.completeFirstLogin();
    void this.router.navigate(['/portal']);
  }

  protected returnToSignIn(): void {
    if (this.accountType === 'admin') {
      this.adminSession.clearSession();
      void this.router.navigate(['/admin/login']);
      return;
    }

    this.portalSession.clearSession();
    void this.router.navigate(['/login']);
  }

  private getAccountType(): FirstLoginAccountType {
    const accountType: unknown = this.route.snapshot.data['accountType'];
    if (accountType !== 'admin' && accountType !== 'member') {
      throw new Error('First-login route must specify an account type.');
    }
    return accountType;
  }
}
