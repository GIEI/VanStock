import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { DashboardStats } from '../models/dashboard.model';
import { Product } from '../models/product.model';
import { Movement } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(private api: ApiService) {}

  stats(): Observable<DashboardStats> {
    return this.api.get<DashboardStats>('/dashboard/stats');
  }

  alerts(): Observable<Product[]> {
    return this.api.get<Product[]>('/dashboard/alerts');
  }

  recentMovements(): Observable<Movement[]> {
    return this.api.get<Movement[]>('/dashboard/recent-movements');
  }
}
