// auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../service/auth-service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router      = inject(Router);

  // ✅ Checks sessionStorage flag — tokens are in HttpOnly cookies (not JS-readable)
  if (authService.isLoggedIn()) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};