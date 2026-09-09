import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(private api: ApiService) {}

  list(companyId?: number): Observable<User[]> {
    const params: Record<string, string | number | boolean> = {};
    if (companyId) params['company_id'] = companyId;
    return this.api.get<User[]>('/users', params);
  }

  create(data: Partial<User> & { password: string }): Observable<User> {
    return this.api.post<User>('/users', data);
  }

  invite(data: { email: string; name: string; role: string; company_id?: number }): Observable<User & { invited: true }> {
    return this.api.post<User & { invited: true }>('/users/invite', data);
  }

  update(id: number, data: Partial<User> & { password?: string }): Observable<User> {
    return this.api.put<User>(`/users/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.api.delete<void>(`/users/${id}`);
  }

  uploadPhoto(id: number, file: File): Observable<{ photo_url: string }> {
    const fd = new FormData();
    fd.append('photo', file);
    return this.api.postFormData<{ photo_url: string }>(`/users/${id}/photo`, fd);
  }

  deletePhoto(id: number): Observable<void> {
    return this.api.delete<void>(`/users/${id}/photo`);
  }

  resetPasswordLink(id: number): Observable<{ resetUrl: string; message: string }> {
    return this.api.post<{ resetUrl: string; message: string }>(`/users/${id}/reset-password`, {});
  }

  colleagues(): Observable<Pick<User, 'id' | 'name' | 'email' | 'role'>[]> {
    return this.api.get('/users/colleagues');
  }

  available(date: string, startTime: string, endTime: string): Observable<Pick<User, 'id' | 'name' | 'email'>[]> {
    return this.api.get('/users/available', { date, start_time: startTime, end_time: endTime });
  }
}
