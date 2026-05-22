import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';           // ✅ fixed — NOT from primitives/di
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs'; // ✅ fixed — NOT from internal paths
import { AuthService } from '../service/auth-service';

export const authInterceptorsInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router      = inject(Router);

  const token = localStorage.getItem('accessToken');

  // Skip adding token for auth endpoints
  const isAuthEndpoint =
    req.url.includes('/auth/Login') ||
    req.url.includes('/auth/Register') ||
    req.url.includes('/auth/refresh') ||
    req.url.includes('/api/token');

  const newreq = (token && !isAuthEndpoint)
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(newreq).pipe(
    catchError((error: HttpErrorResponse) => {

      // Token expired — try refresh once
      if (error.status === 401 && !isAuthEndpoint) {
        return authService.refreshToken().pipe(
          switchMap((res: any) => {
            // Save new token
            const newAccessToken = res.data?.accessToken ?? res.accessToken;
            localStorage.setItem('accessToken', newAccessToken);
           

            // Retry original request with new token
            const retryReq = req.clone({
              setHeaders: { Authorization: `Bearer ${newAccessToken}` },
            });
          
            return next(retryReq);
          }),
          catchError((refreshError) => {
            // Refresh also failed — force logout
            authService.logout();
            router.navigate(['/login']);
            return throwError(() => refreshError);
          })
        );
      }

      return throwError(() => error);
    })
  );
};