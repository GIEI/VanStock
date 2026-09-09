import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface SmtpSettings {
  id: number;
  company_id: number;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  from_email: string;
  from_name: string | null;
  has_password: boolean;
  created_at: string;
  updated_at: string;
}

export interface SmtpSettingsPayload {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password?: string;
  from_email: string;
  from_name?: string | null;
}

@Injectable({ providedIn: 'root' })
export class SmtpSettingsService {
  constructor(private api: ApiService) {}

  get(companyId: number): Observable<SmtpSettings> {
    return this.api.get<SmtpSettings>(`/companies/${companyId}/smtp`);
  }

  upsert(companyId: number, payload: SmtpSettingsPayload): Observable<SmtpSettings> {
    return this.api.put<SmtpSettings>(`/companies/${companyId}/smtp`, payload);
  }

  delete(companyId: number): Observable<void> {
    return this.api.delete<void>(`/companies/${companyId}/smtp`);
  }

  test(companyId: number): Observable<{ ok: boolean; error?: string }> {
    return this.api.post<{ ok: boolean; error?: string }>(`/companies/${companyId}/smtp/test`, {});
  }
}
