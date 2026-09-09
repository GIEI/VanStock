import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface LogResponse {
  logs: string;
  timestamp: string;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  constructor(private api: ApiService) {}

  getErrorLogs(): Observable<LogResponse> {
    return this.api.get<LogResponse>('/admin/logs');
  }

  clearErrorLogs(): Observable<void> {
    return this.api.delete<void>('/admin/logs');
  }
}
