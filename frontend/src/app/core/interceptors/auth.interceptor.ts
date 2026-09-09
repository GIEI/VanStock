import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth  = inject(AuthService);
  const router = inject(Router);
  const token = auth.token;

  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      // Only logout if we actually had a token (avoids cascading 401 loops)
      if (err.status === 401 && auth.token) {
        auth.logout();
      }
      if (err.status === 403 && err.error?.code === 'FEATURE_NOT_ENABLED') {
        auth.refreshSession().subscribe();
        router.navigate(['/dashboard']);
      }
      return throwError(() => err);
    })
  );
};
