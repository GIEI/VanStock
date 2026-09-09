import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn) return true;
  return router.createUrlTree(['/login']);
};

export const adminGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (auth.isAdmin) return true;
  return router.createUrlTree(['/dashboard']);
};

export const superAdminGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (auth.isSuperAdmin) return true;
  return router.createUrlTree(['/dashboard']);
};

export const companyFeatureGuard = (featureKey: string): CanActivateFn => () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.hasFeature(featureKey)) return true;
  return router.createUrlTree(['/dashboard']);
};

export const companyResourceGuard = (resourceKey: string): CanActivateFn => () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.refreshSession().pipe(
    map(user => user?.role === 'superadmin' || user?.resources?.includes(resourceKey) ? true : router.createUrlTree(['/dashboard'])),
    catchError(() => of(router.createUrlTree(['/dashboard'])))
  );
};

// Redirects / to /dashboard if logged in, or /login if not
export const homeGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  return router.createUrlTree([auth.isLoggedIn ? '/dashboard' : '/login']);
};
