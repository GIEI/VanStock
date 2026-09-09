import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Company } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class CompanyService {
  constructor(private api: ApiService) {}

  list(): Observable<Company[]> {
    return this.api.get<Company[]>('/companies');
  }

  create(name: string): Observable<Company> {
    return this.api.post<Company>('/companies', { name });
  }

  update(id: number, name: string, currency: string): Observable<Company> {
    return this.api.put<Company>(`/companies/${id}`, { name, currency });
  }

  uploadLogo(id: number, file: File): Observable<Company> {
    const fd = new FormData();
    fd.append('logo', file);
    return this.api.postFormData<Company>(`/companies/${id}/logo`, fd);
  }

  uploadTemplate(id: number, file: File): Observable<Company> {
    const fd = new FormData();
    fd.append('template', file);
    return this.api.postFormData<Company>(`/companies/${id}/template`, fd);
  }

  deleteTemplate(id: number): Observable<void> {
    return this.api.delete<void>(`/companies/${id}/template`);
  }

  delete(id: number): Observable<void> {
    return this.api.delete<void>(`/companies/${id}`);
  }
}
