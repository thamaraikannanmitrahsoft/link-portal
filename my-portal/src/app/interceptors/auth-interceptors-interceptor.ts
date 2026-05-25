// auth-interceptor.ts
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../service/auth-service';

export const authInterceptorsInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router      = inject(Router);

  const isAuthEndpoint =
    req.url.includes('/auth/Login')    ||
    req.url.includes('/auth/register') ||
    req.url.includes('/auth/refresh')  ||
    req.url.includes('/api/token');

  // ✅ withCredentials: true — browser attaches HttpOnly cookies automatically
  // ✅ No manual Authorization header needed
  const newReq = req.clone({ withCredentials: true });
// console.log(newReq,"newReq");
//  console.log(`[Interceptor] ${req.method} ${req.url}`)
  return next(newReq).pipe(
    catchError((error: HttpErrorResponse) => {

      if (error.status === 401 && !isAuthEndpoint) {
        //  console.log('[Interceptor] Attempting token refresh...');
        return authService.refreshToken().pipe(
          switchMap(() => {
            // ✅ No new token to extract — backend set new cookie in response
            // Just retry with credentials
            //  console.log('[Interceptor] Refresh succeeded — retrying original request');
            return next(req.clone({ withCredentials: true }));
          }),
          catchError((refreshError) => {
            //  console.error(`[Interceptor] ERROR ${error.status} on ${req.url}`)
            authService.setLoggedIn(false);
            // authService.logout();
            router.navigate(['/login']);
            return throwError(() => refreshError);
          })
        );
      }

      return throwError(() => error);
    })
  );
};