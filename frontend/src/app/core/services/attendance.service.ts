import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiService } from './api.service';
import {
  AttendanceEvent,
  AttendanceDay,
  AttendanceOverrideRequest,
  AttendanceAuditEntry,
  CreateEventBody,
  UpdateEventBody,
  ReviewRequestBody,
  EventsFilters,
} from '../models/attendance.models';

@Injectable({ providedIn: 'root' })
export class AttendanceService {
  private base = environment.apiUrl;

  constructor(private api: ApiService, private http: HttpClient) {}

  listEvents(filters: EventsFilters = {}): Observable<AttendanceEvent[]> {
    return this.api.get<AttendanceEvent[]>(
      '/admin/attendance/events',
      filters as Record<string, string | number | boolean>,
    );
  }

  createEvent(body: CreateEventBody): Observable<AttendanceEvent> {
    return this.api.post<AttendanceEvent>('/admin/attendance/events', body);
  }

  updateEvent(id: number, body: UpdateEventBody): Observable<AttendanceEvent> {
    return this.api.patch<AttendanceEvent>(`/admin/attendance/events/${id}`, body);
  }

  deleteEvent(id: number, reason: string): Observable<void> {
    return this.http.request<void>(
      'DELETE',
      `${this.base}/admin/attendance/events/${id}`,
      { body: { reason } },
    );
  }

  listAnomalies(): Observable<AttendanceEvent[]> {
    return this.api.get<AttendanceEvent[]>('/admin/attendance/anomalies');
  }

  resolveAnomaly(
    eventId: number,
    body: { reason: string; new_status?: string },
  ): Observable<AttendanceEvent> {
    return this.api.post<AttendanceEvent>(
      `/admin/attendance/anomalies/${eventId}/resolve`,
      body,
    );
  }

  dismissAnomaly(eventId: number, body: { reason: string }): Observable<AttendanceEvent> {
    return this.api.post<AttendanceEvent>(
      `/admin/attendance/anomalies/${eventId}/dismiss`,
      body,
    );
  }

  listOverrideRequests(status?: string): Observable<AttendanceOverrideRequest[]> {
    return this.api.get<AttendanceOverrideRequest[]>(
      '/admin/attendance/override-requests',
      status ? { status } : undefined,
    );
  }

  reviewOverrideRequest(
    id: number,
    body: ReviewRequestBody,
  ): Observable<{ request: AttendanceOverrideRequest; event?: AttendanceEvent }> {
    return this.api.post(`/admin/attendance/override-requests/${id}/review`, body);
  }

  listAuditLog(filters: {
    admin_id?: number;
    event_id?: number;
    date_from?: string;
    date_to?: string;
  } = {}): Observable<AttendanceAuditEntry[]> {
    return this.api.get<AttendanceAuditEntry[]>(
      '/admin/attendance/audit-log',
      filters as Record<string, string | number>,
    );
  }

  listDays(filters: {
    user_id?: number;
    month?: number;
    year?: number;
  } = {}): Observable<AttendanceDay[]> {
    return this.api.get<AttendanceDay[]>(
      '/admin/attendance/days',
      filters as Record<string, string | number>,
    );
  }
}
