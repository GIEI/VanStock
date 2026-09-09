import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface ProductBatch {
  id:           number;
  company_id:   number;
  product_id:   number;
  location_id:  number;
  batch_number: string;
  expiry_date?: string;
  quantity:     number;
  created_at:   string;
  product_name?: string;
  sku?:          string;
  location_name?: string;
}

@Injectable({ providedIn: 'root' })
export class InventoryService {
  constructor(private api: ApiService) {}

  getBatches(filters: { product_id?: number; location_id?: number } = {}): Observable<ProductBatch[]> {
    return this.api.get<ProductBatch[]>('/inventory/batches', filters);
  }

  getExpiring(days: number = 60): Observable<ProductBatch[]> {
    return this.api.get<ProductBatch[]>('/inventory/expiring', { days });
  }

  updateBatchExpiry(id: number, expiry_date: string | null): Observable<ProductBatch> {
    return this.api.patch<ProductBatch>(`/inventory/batches/${id}`, { expiry_date });
  }
}
