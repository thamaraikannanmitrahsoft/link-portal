import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../service/auth-service';
import { NotificationService } from '../../service/notification-service';

@Component({
  selector:    'app-loginform',
  imports:     [CommonModule, FormField, RouterLink],
  templateUrl: './loginform.html',
  styleUrl:    './loginform.scss',
})
export class Loginform {

  loginModel = signal({ email: '', password: '' });
  loginForm  = form(this.loginModel);
  ssoLoading = signal(false);
  errors     = signal({ email: '', password: '' });

  constructor(
    private authService:         AuthService,
    private toastr:              ToastrService,
    private router:              Router,
    private notificationService: NotificationService,
  ) {}

  clearError(field: 'email' | 'password') {
    this.errors.update(err => ({ ...err, [field]: '' }));
  }

  // ─── Email / Password Login ──────────────────────────────────────────────────

  login() {
    const newErrors = { email: '', password: '' };

    if (!this.loginModel().email)    newErrors.email    = 'Email is required';
    if (!this.loginModel().password) newErrors.password = 'Password is required';

    this.errors.set(newErrors);
    if (newErrors.email || newErrors.password) return;

    this.authService.login(this.loginModel()).subscribe({
      next: async (res) => {
        // ✅ Store non-sensitive user info only — tokens are in HttpOnly cookies
        this.authService.saveUserInfo({
          name:  res.data?.name,
          email: res.data?.email,
          id:    res.data?.id,
        });

        // ✅ Mark session as active
        this.authService.setLoggedIn(true);

        this.toastr.success('Login successful');

        // ✅ Generate FCM token AFTER login confirmed and session marked active
        // Interceptor will attach the fresh HttpOnly cookie automatically
        await this.notificationService.generateToken();

        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        const msg = err?.error?.message;
        if (msg === 'User not found') {
          this.toastr.error('Please register first', 'User Not Found');
        } else if (msg === 'Invalid credentials') {
          this.toastr.warning('Invalid credentials');
        } else {
          this.toastr.error('Something went wrong');
        }
      },
    });
  }

  // ─── SSO Login ───────────────────────────────────────────────────────────────

  async loginWithGoogle(): Promise<void> {
    this.ssoLoading.set(true);
    try {
      await this.authService.redirectToSso();
    } catch (err) {
      console.error('SSO redirect error:', err);
      this.toastr.error('Could not start SSO login. Please try again.');
      this.ssoLoading.set(false);
    }
  }
}