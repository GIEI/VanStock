import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface Attendance {
  id:              number;
  user_id:         number;
  company_id:      number;
  date:            string;
  morning_in?:     string;
  morning_out?:    string;
  afternoon_in?:   string;
  afternoon_out?:  string;
  status:          string;
  user_name?:      string;
  user_email?:     string;
}

export interface AttendanceRequest {
  id:            number;
  user_id:       number;
  company_id:    number;
  type:          string;
  requested_at:  string;
  reason:        string;
  status:        string;
  user_name?:    string;
  reviewed_by?:  number;
  reviewed_at?:  string;
}

@Injectable({
  providedIn: 'root'
})
export class BadgeService {

  constructor(private api: ApiService) { }

  // ── Badge Logic ────────────────────────────────────────────────────────────

  generateToken(): Observable<{ token: string }> {
    return this.api.get<{ token: string }>('/badge/generate');
  }

  scan(token: string): Observable<{ message: string; attendance: Attendance }> {
    return this.api.post<{ message: string; attendance: Attendance }>('/badge/scan', { token });
  }

  requestOverride(type: string, requested_at: Date, reason: string): Observable<AttendanceRequest> {
    return this.api.post<AttendanceRequest>('/badge/request-override', {
      type,
      requested_at: requested_at.toISOString(),
      reason
    });
  }

  // ── Timesheet Logic ────────────────────────────────────────────────────────

  getTimesheet(filters: any = {}): Observable<Attendance[]> {
    return this.api.get<Attendance[]>('/timesheet', filters);
  }

  updateAttendance(id: number, data: Partial<Attendance>): Observable<Attendance> {
    return this.api.patch<Attendance>(`/timesheet/${id}`, data);
  }

  getOverrideRequests(): Observable<AttendanceRequest[]> {
    return this.api.get<AttendanceRequest[]>('/timesheet/requests');
  }

  reviewRequest(id: number, status: 'approved' | 'rejected'): Observable<AttendanceRequest> {
    return this.api.patch<AttendanceRequest>(`/timesheet/requests/${id}`, { status });
  }
}
