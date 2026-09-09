import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface InviteInfo {
  email: string;
  name: string;
  company_name: string;
  expires_at: string;
}

@Injectable({ providedIn: 'root' })
export class InvitesService {
  constructor(private api: ApiService) {}

  info(token: string): Observable<InviteInfo> {
    return this.api.get<InviteInfo>(`/invites/${token}`);
  }

  accept(token: string, password: string): Observable<{ ok: true }> {
    return this.api.post<{ ok: true }>(`/invites/${token}/accept`, { password });
  }
}
