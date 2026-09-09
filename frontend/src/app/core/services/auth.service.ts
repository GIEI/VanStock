import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthUser } from '../models/user.model';

const TOKEN_KEY = 'ss_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private base = environment.apiUrl;

  private userSubject = new BehaviorSubject<AuthUser | null>(this.loadUser());
  user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    if (this.token) { this.refreshSession().subscribe(); }
  }

  get currentUser(): AuthUser | null {
    return this.userSubject.value;
  }

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  get isLoggedIn(): boolean {
    return !!this.token;
  }

  get isAdmin(): boolean {
    const role = this.currentUser?.role;
    return role === 'admin' || role === 'superadmin';
  }

  get isSuperAdmin(): boolean {
    return this.currentUser?.role === 'superadmin';
  }

  hasFeature(featureKey: string): boolean {
    return this.currentUser?.features?.includes(featureKey) ?? false;
  }

  hasResource(resourceKey: string): boolean {
    return this.isSuperAdmin || this.currentUser?.resources?.includes(resourceKey) === true;
  }

  get companyLogoUrl(): string | null {
    return this.currentUser?.company_logo_url ?? null;
  }

  get companyCurrency(): string {
    return this.currentUser?.company_currency ?? 'EUR';
  }

  updateCompanyCurrency(currency: string): void {
    const user = this.currentUser;
    if (user) {
      this.userSubject.next({ ...user, company_currency: currency });
    }
  }

  refreshSession(): Observable<AuthUser | null> {
    if (!this.token) return of(null);
    return this.http.get<AuthUser>(`${this.base}/auth/me`).pipe(
      tap(user => this.userSubject.next(user))
    );
  }

  login(email: string, password: string): Observable<{ token: string; user: AuthUser }> {
    return this.http.post<{ token: string; user: AuthUser }>(
      `${this.base}/auth/login`,
      { email, password }
    ).pipe(
      tap(res => {
        localStorage.setItem(TOKEN_KEY, res.token);
        this.userSubject.next(res.user);
      })
    );
  }

  /** Update the company logo in the current session without requiring re-login. */
  updateCompanyLogo(logoUrl: string | null): void {
    const user = this.currentUser;
    if (user) {
      this.userSubject.next({ ...user, company_logo_url: logoUrl });
    }
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    this.userSubject.next(null);
    this.router.navigate(['/login']);
  }

  forgotPassword(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/auth/forgot-password`, { email });
  }

  resetPassword(token: string, password: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/auth/reset-password`, { token, password });
  }

  changePassword(currentPassword: string, newPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/auth/change-password`, { currentPassword, newPassword });
  }

  private loadUser(): AuthUser | null {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        localStorage.removeItem(TOKEN_KEY);
        return null;
      }
      return {
        id:                payload.id,
        company_id:        payload.company_id,
        company_name:      payload.company_name,
        company_logo_url:  payload.company_logo_url ?? null,
        company_currency:  payload.company_currency ?? 'EUR',
        email:             payload.email,
        name:              payload.name,
        role:              payload.role,
        features:          [],
        resources:         [],
      };
    } catch {
      return null;
    }
  }
}
