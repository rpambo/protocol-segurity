import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AdminSession } from '../admin-session';
import { MemberDirectory } from '../member-directory';

@Component({
  selector: 'app-admin-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './admin-login.html',
  styleUrl: './admin-login.css'
})
export class AdminLogin {
  private readonly router = inject(Router);
  private readonly session = inject(AdminSession);
  private readonly memberDirectory = inject(MemberDirectory);

  protected email = '';
  protected password = '';
  protected showPassword = false;
  protected errorMessage = '';

  protected signIn(): void {
    this.errorMessage = '';
    if (!this.email.trim() || !this.password.trim()) {
      this.errorMessage = 'Enter your email address and password to continue.';
      return;
    }
    if (this.memberDirectory.isBlockedEmail(this.email) || this.memberDirectory.isRemovedEmail(this.email)) {
      this.memberDirectory.recordBlockedSignIn(this.email, 'Admin');
      this.errorMessage = 'This Admin account is blocked or no longer available. Contact a Global Admin for assistance.';
      return;
    }

    this.session.signIn(this.email);
    this.memberDirectory.recordSuccessfulSignIn(this.email, 'Admin');
    void this.router.navigate([
      this.session.requiresPasswordChange ? '/first-login/admin' : '/admin'
    ]);
  }
}
