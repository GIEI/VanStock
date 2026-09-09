import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { PurchaseOrder, PurchaseOrderItem, SuggestedProduct, LotEntry } from '../models/purchase-order.model';

@Injectable({ providedIn: 'root' })
export class PurchaseOrderService {
  constructor(private api: ApiService) {}

  list(status?: string): Observable<PurchaseOrder[]> {
    const params: Record<string, string> = {};
    if (status) params['status'] = status;
    return this.api.get<PurchaseOrder[]>('/purchase-orders', params);
  }

  getSuggestions(): Observable<SuggestedProduct[]> {
    return this.api.get<SuggestedProduct[]>('/purchase-orders/suggest');
  }

  get(id: number): Observable<PurchaseOrder> {
    return this.api.get<PurchaseOrder>(`/purchase-orders/${id}`);
  }

  create(data: {
    supplier_id?: number | null;
    notes?: string;
    items?: { product_id: number; quantity_ordered: number; unit_price?: number | null }[];
  }): Observable<PurchaseOrder> {
    return this.api.post<PurchaseOrder>('/purchase-orders', data);
  }

  updateStatus(id: number, status: string, notes?: string): Observable<PurchaseOrder> {
    return this.api.put<PurchaseOrder>(`/purchase-orders/${id}`, { status, notes });
  }

  update(id: number, data: Partial<PurchaseOrder>): Observable<PurchaseOrder> {
    return this.api.put<PurchaseOrder>(`/purchase-orders/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.api.delete<void>(`/purchase-orders/${id}`);
  }

  addItem(orderId: number, item: {
    product_id: number;
    quantity_ordered: number;
    unit_price?: number | null;
    notes?: string;
    track_lots?: boolean;
  }): Observable<PurchaseOrderItem> {
    return this.api.post<PurchaseOrderItem>(`/purchase-orders/${orderId}/items`, item);
  }

  deleteItem(orderId: number, itemId: number): Observable<void> {
    return this.api.delete<void>(`/purchase-orders/${orderId}/items/${itemId}`);
  }

  receive(orderId: number, locationId: number, lotEntries: LotEntry[] = []): Observable<PurchaseOrder> {
    return this.api.post<PurchaseOrder>(`/purchase-orders/${orderId}/receive`, {
      location_id: locationId,
      lot_entries: lotEntries,
    });
  }
}
