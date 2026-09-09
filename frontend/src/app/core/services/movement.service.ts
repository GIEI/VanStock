import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Movement } from '../models/product.model';

export interface MovementFilters {
  product_id?:  number;
  type?:        string;
  from?:        string;
  to?:          string;
  location_id?: number;
  created_by?:  string;
  page?:        number;
  limit?:       number;
}

export interface CreateMovementDto {
  product_id:       number;
  type:             'carico' | 'scarico' | 'trasferimento';
  quantity:         number;
  from_location_id?: number;
  to_location_id?:  number;
  notes?:           string;
  job_id?:          number;
  created_by?:      string;
  batch_number?:    string;
  expiry_date?:     string;
}

@Injectable({ providedIn: 'root' })
export class MovementService {
  constructor(private api: ApiService) {}

  list(filters?: MovementFilters): Observable<Movement[]> {
    return this.api.get<Movement[]>('/movements', filters as Record<string, string | number | boolean>);
  }

  create(dto: CreateMovementDto): Observable<Movement> {
    return this.api.post<Movement>('/movements', dto);
  }

  delete(id: number): Observable<void> {
    return this.api.delete<void>(`/movements/${id}`);
  }
}
