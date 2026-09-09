import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface AuditProduct {
  id:              number;
  name:            string;
  sku:             string;
  unit:            string;
  barcode?:        string;
  system_quantity: number;
}

export interface AuditPreviewResponse {
  location: { id: number; name: string };
  products: AuditProduct[];
}

export interface AuditDiscrepancy {
  product_id:        number;
  product_name:      string;
  sku:               string;
  unit:              string;
  system_quantity:   number;
  physical_quantity: number;
  difference:        number;
}

export interface AuditApplyResponse {
  applied:        number;
  discrepancies:  AuditDiscrepancy[];
}

@Injectable({ providedIn: 'root' })
export class AuditService {
  constructor(private api: ApiService) {}

  preview(locationId: number): Observable<AuditPreviewResponse> {
    return this.api.get<AuditPreviewResponse>('/audit/preview', { location_id: locationId });
  }

  apply(locationId: number, counts: { product_id: number; physical_qty: number }[]): Observable<AuditApplyResponse> {
    return this.api.post<AuditApplyResponse>('/audit/apply', { location_id: locationId, counts });
  }
}
