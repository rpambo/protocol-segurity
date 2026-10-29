import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { PortalSession } from '../portal-session';

@Component({
  selector: 'app-login-page',
  imports: [FormsModule, RouterLink],
  templateUrl: './login-page.html',
  styleUrl: './login-page.css'
})
export class LoginPage {
  private readonly router = inject(Router);
  private readonly session = inject(PortalSession);

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

    this.session.signIn(this.email);
    void this.router.navigate([
      this.session.requiresPasswordChange ? '/first-login/member' : '/portal'
    ]);
  }
}
