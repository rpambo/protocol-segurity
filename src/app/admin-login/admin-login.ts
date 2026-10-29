import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AdminSession } from '../admin-session';

@Component({
  selector: 'app-admin-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './admin-login.html',
  styleUrl: './admin-login.css'
})
export class AdminLogin {
  private readonly router = inject(Router);
  private readonly session = inject(AdminSession);

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

    this.session.signIn(this.email);
    void this.router.navigate([
      this.session.requiresPasswordChange ? '/first-login/admin' : '/admin'
    ]);
  }
}
