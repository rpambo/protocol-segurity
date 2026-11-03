import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { PortalSession } from '../portal-session';
import { MemberDirectory } from '../member-directory';

@Component({
  selector: 'app-login-page',
  imports: [FormsModule, RouterLink],
  templateUrl: './login-page.html',
  styleUrl: './login-page.css'
})
export class LoginPage {
  private readonly router = inject(Router);
  private readonly session = inject(PortalSession);
  private readonly memberDirectory = inject(MemberDirectory);

  protected email = '';
  protected password = '';
  protected showPassword = false;
  protected errorMessage = '';
  protected submitted = false;

  protected signIn(): void {
    this.submitted = true;
    this.errorMessage = '';
    if (!this.email.trim() || !this.password.trim()) {
      this.errorMessage = 'Enter your email address and password to continue.';
      return;
    }
    if (this.memberDirectory.isBlockedEmail(this.email) || this.memberDirectory.isRemovedEmail(this.email)) {
      this.memberDirectory.recordBlockedSignIn(this.email, 'Member');
      this.errorMessage = 'This account is blocked or no longer available. Contact your administrator for assistance.';
      return;
    }

    this.session.signIn(this.email);
    this.memberDirectory.recordSuccessfulSignIn(this.email, 'Member');
    void this.router.navigate([
      this.session.requiresPasswordChange ? '/first-login/member' : '/portal'
    ]);
  }
}
