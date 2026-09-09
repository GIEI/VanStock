import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Product, ProductListResponse } from '../models/product.model';

export interface ProductCategory {
  id:   number;
  name: string;
}

export interface ProductFilters {
  q?:          string;
  category?:   string | number;
  location_id?: number;
  low_stock?:  boolean;
  page?:       number;
  limit?:      number;
}

export interface ImportResult {
  created: number;
  updated: number;
  errors:  { row: number; reason: string }[];
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  constructor(private api: ApiService) {}

  list(filters?: ProductFilters): Observable<ProductListResponse> {
    return this.api.get<ProductListResponse>('/products', filters as Record<string, string | number | boolean>);
  }

  get(id: number): Observable<Product> {
    return this.api.get<Product>(`/products/${id}`);
  }

  getByBarcode(barcode: string): Observable<Product> {
    return this.api.get<Product>(`/products/barcode/${encodeURIComponent(barcode)}`);
  }

  categories(): Observable<ProductCategory[]> {
    return this.api.get<ProductCategory[]>('/products/categories');
  }

  createCategory(name: string): Observable<ProductCategory> {
    return this.api.post<ProductCategory>('/products/categories', { name });
  }

  deleteCategory(id: number): Observable<void> {
    return this.api.delete<void>(`/products/categories/${id}`);
  }

  create(product: Partial<Product>): Observable<Product> {
    return this.api.post<Product>('/products', product);
  }

  update(id: number, product: Partial<Product>): Observable<Product> {
    return this.api.put<Product>(`/products/${id}`, product);
  }

  delete(id: number): Observable<void> {
    return this.api.delete<void>(`/products/${id}`);
  }

  uploadPhoto(id: number, file: File): Observable<Product> {
    const fd = new FormData();
    fd.append('photo', file);
    return this.api.postFormData<Product>(`/products/${id}/photo`, fd);
  }

  exportExcel(): Observable<Blob> {
    return this.api.getBlob('/products/export');
  }

  importFile(file: File): Observable<ImportResult> {
    const fd = new FormData();
    fd.append('file', file);
    return this.api.postFormData<ImportResult>('/products/import', fd);
  }

  importTemplate(): Observable<Blob> {
    return this.api.getBlob('/products/import-template');
  }

  requestReorder(id: number): Observable<{ ok: boolean; emailSent: boolean }> {
    return this.api.post<{ ok: boolean; emailSent: boolean }>(`/products/${id}/reorder-request`, {});
  }

  getUnassigned(): Observable<any[]> {
    return this.api.get<any[]>('/products/unassigned');
  }

  fixUnassigned(productIds: number[], locationId: number): Observable<{ ok: boolean }> {
    return this.api.post<{ ok: boolean }>('/products/fix-unassigned', { product_ids: productIds, location_id: locationId });
  }
}
