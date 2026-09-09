import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Client } from '../models/client.model';

@Injectable({ providedIn: 'root' })
export class ClientService {
  constructor(private api: ApiService) {}

  list(q?: string): Observable<Client[]> {
    const params: Record<string, string> = {};
    if (q) params['q'] = q;
    return this.api.get<Client[]>('/clients', params);
  }

  get(id: number): Observable<Client> {
    return this.api.get<Client>(`/clients/${id}`);
  }

  create(data: Partial<Client>): Observable<Client> {
    return this.api.post<Client>('/clients', data);
  }

  update(id: number, data: Partial<Client>): Observable<Client> {
    return this.api.put<Client>(`/clients/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.api.delete<void>(`/clients/${id}`);
  }
}
