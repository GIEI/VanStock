import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Supplier } from '../models/supplier.model';

export interface ProductSupplierLink {
  id:              number;
  name:            string;
  contact_name?:   string;
  phone?:          string;
  email?:          string;
  delivery_days?:  number;
  purchase_price?: number;
  is_preferred:    boolean;
  link_notes?:     string;
}

@Injectable({ providedIn: 'root' })
export class SupplierService {
  constructor(private api: ApiService) {}

  list(q?: string): Observable<Supplier[]> {
    const params: Record<string, string> = {};
    if (q) params['q'] = q;
    return this.api.get<Supplier[]>('/suppliers', params);
  }

  get(id: number): Observable<Supplier> {
    return this.api.get<Supplier>(`/suppliers/${id}`);
  }

  create(data: Partial<Supplier>): Observable<Supplier> {
    return this.api.post<Supplier>('/suppliers', data);
  }

  update(id: number, data: Partial<Supplier>): Observable<Supplier> {
    return this.api.put<Supplier>(`/suppliers/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.api.delete<void>(`/suppliers/${id}`);
  }

  listForProduct(productId: number): Observable<ProductSupplierLink[]> {
    return this.api.get<ProductSupplierLink[]>(`/suppliers/product/${productId}`);
  }

  linkToProduct(productId: number, data: {
    supplier_id: number;
    purchase_price?: number | null;
    is_preferred?: boolean;
    notes?: string;
  }): Observable<unknown> {
    return this.api.post(`/suppliers/product/${productId}`, data);
  }

  unlinkFromProduct(productId: number, supplierId: number): Observable<void> {
    return this.api.delete<void>(`/suppliers/product/${productId}/${supplierId}`);
  }
}
