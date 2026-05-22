import { Component, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../service/auth-service';

@Component({
  selector: 'app-registerform',
  imports: [FormField, RouterLink],
  templateUrl: './registerform.html',
  styleUrl: './registerform.scss',
})
export class Registerform {

  constructor(
    private authService: AuthService,
    private toastr: ToastrService,
    private router: Router,
  ) {}

  registerModel = signal({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  registerForm = form(this.registerModel);

  errors = signal({ name: '', email: '', password: '' });

  register() {
    let newErrors = { name: '', email: '', password: '' };

    if (!this.registerModel().name)     newErrors.name     = 'Name is required';
    if (!this.registerModel().email)    newErrors.email    = 'Email is required';
    if (!this.registerModel().password) newErrors.password = 'Password is required';

    this.errors.set(newErrors);

    if (!newErrors.name && !newErrors.email && !newErrors.password) {
      const payload = this.registerModel();

      this.authService.register(payload).subscribe({
        next: (res) => {
          localStorage.setItem('accessToken', res.accessToken);
          localStorage.setItem('refreshToken', res.refreshToken);

          this.toastr.success('User registered successfully!');
          this.router.navigate(['/login']);
        },
        error: (err) => {
      

          if (err.error.errors && err.error.errors.length > 0) {
            err.error.errors.forEach((item: any) => {
              if (item.field === 'email') {
                this.toastr.error(item.message, 'Email Error');
              } else if (item.field === 'password') {
                this.toastr.warning(item.message, 'Password Error');
              } else if (item.field === 'name') {
                this.toastr.info(item.message, 'Username Error');
              } else {
                this.toastr.error(item.message);
              }
            });
          } else {
            this.toastr.error('User with this email already exists');
          }
        },
      });
    }
  }
}