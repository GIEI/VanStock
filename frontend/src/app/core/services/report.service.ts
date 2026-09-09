import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DailyReport } from '../models/report.model';

@Injectable({ providedIn: 'root' })
export class ReportService {
  constructor(private http: HttpClient) {}

  list(filters: { date_from?: string; date_to?: string; user_id?: number } = {}): Observable<DailyReport[]> {
    let params = new HttpParams();
    if (filters.date_from) params = params.set('date_from', filters.date_from);
    if (filters.date_to)   params = params.set('date_to',   filters.date_to);
    if (filters.user_id)   params = params.set('user_id',   filters.user_id.toString());
    return this.http.get<DailyReport[]>('/api/reports', { params });
  }

  get(id: number): Observable<DailyReport> {
    return this.http.get<DailyReport>(`/api/reports/${id}`);
  }

  submit(data: { report_date: string; notes: string }): Observable<DailyReport> {
    return this.http.post<DailyReport>('/api/reports', data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`/api/reports/${id}`);
  }
}
