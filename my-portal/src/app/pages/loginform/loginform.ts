import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../service/auth-service';
import { NotificationService } from '../../service/notification-service';
import { environment } from '../../environments/environment';
@Component({
  selector: 'app-loginform',
  imports: [CommonModule, FormField, RouterLink],
  templateUrl: './loginform.html',
  styleUrl: './loginform.scss',
})
export class Loginform {

  constructor(
    private authService: AuthService,
    private toastr: ToastrService,
    private router: Router,
    private notificationService: NotificationService,
  ) {}

  loginModel = signal({ email: '', password: '' });
  loginForm  = form(this.loginModel);
  ssoLoading = signal(false);

  errors = signal({ email: '', password: '' });

  clearError(field: 'email' | 'password') {
    this.errors.update(err => ({ ...err, [field]: '' }));
  }

  // ─── Email / Password Login ─────────────────────────────────────────────────

  login() {
    let newErrors = { email: '', password: '' };

    if (!this.loginModel().email)    newErrors.email    = 'Email is required';
    if (!this.loginModel().password) newErrors.password = 'Password is required';

    this.errors.set(newErrors);

    if (!newErrors.email && !newErrors.password) {
      const payload = this.loginModel();

      this.authService.login(payload).subscribe({
        next: async (res) => {
        

          localStorage.setItem('accessToken', res.accessToken);
          localStorage.setItem('refreshToken', res.refreshToken);
          localStorage.setItem('name', res.data.name);
          localStorage.setItem('email', res.data.email);
          localStorage.setItem('id', res.data.id);

          this.toastr.success('Login successful');
         await this.notificationService.generateToken();
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
      

          if (err.error.message === 'User not found') {
            this.toastr.error('Please register first', 'User Not Found');
          } else if (err.error.message === 'Invalid credentials') {
            this.toastr.warning('Invalid credentials');
          } else {
            this.toastr.error('Something went wrong');
          }
        },
      });
    }
  }

  // ─── SSO Login ──────────────────────────────────────────────────────────────

  async loginWithGoogle(): Promise<void> {
    this.ssoLoading.set(true);


    


    try {
      await this.authService.redirectToSso();
      // Browser redirects to IDP — nothing runs after this
    } catch (err) {
      console.error('SSO redirect error:', err);
      this.toastr.error('Could not start SSO login. Please try again.');
      this.ssoLoading.set(false);
    }
  }
}