import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Location, LocationStatus } from '../models/location.model';

@Injectable({ providedIn: 'root' })
export class LocationService {
  constructor(private api: ApiService) {}

  list(): Observable<Location[]> {
    return this.api.get<Location[]>('/locations');
  }

  get(id: number): Observable<Location> {
    return this.api.get<Location>(`/locations/${id}`);
  }

  create(loc: Partial<Location>): Observable<Location> {
    return this.api.post<Location>('/locations', loc);
  }

  update(id: number, loc: Partial<Location>): Observable<Location> {
    return this.api.put<Location>(`/locations/${id}`, loc);
  }

  updateStatus(id: number, status: LocationStatus): Observable<Location> {
    return this.api.patch<Location>(`/locations/${id}/status`, { status });
  }

  delete(id: number): Observable<void> {
    return this.api.delete<void>(`/locations/${id}`);
  }
}
