import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface UserAbsence {
  id: number;
  user_id: number;
  absence_date: string;  // YYYY-MM-DD
  reason?: string;
  notes?: string;
  created_at: string;
  user_name?: string;
}

@Injectable({ providedIn: 'root' })
export class UserAbsenceService {
  constructor(private api: ApiService) {}

  list(userId: number, dateFrom?: string, dateTo?: string): Observable<UserAbsence[]> {
    const params: Record<string, string> = {};
    if (dateFrom) params['date_from'] = dateFrom;
    if (dateTo) params['date_to'] = dateTo;
    return this.api.get(`/user-absences/${userId}`, params);
  }

  listAll(dateFrom?: string, dateTo?: string): Observable<UserAbsence[]> {
    const params: Record<string, string> = {};
    if (dateFrom) params['date_from'] = dateFrom;
    if (dateTo) params['date_to'] = dateTo;
    return this.api.get(`/user-absences/company/all`, params);
  }

  create(userId: number, data: { absence_date: string; reason?: string; notes?: string }): Observable<UserAbsence> {
    return this.api.post(`/user-absences/${userId}`, data);
  }

  delete(userId: number, absenceId: number): Observable<void> {
    return this.api.delete(`/user-absences/${userId}/${absenceId}`);
  }
}
