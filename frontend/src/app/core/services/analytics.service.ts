import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface WeeklyTrend {
  week_start:    string;
  label:         string;
  carichi:       number;
  scarichi:      number;
  trasferimenti: number;
}

export interface TopProductsData {
  labels:   string[];
  products: { id: number; name: string; weeks: number[] }[];
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  constructor(private api: ApiService) {}

  movementsTrend(weeks = 8): Observable<WeeklyTrend[]> {
    return this.api.get<WeeklyTrend[]>('/analytics/movements-trend', { weeks });
  }

  topProducts(weeks = 8, limit = 5): Observable<TopProductsData> {
    return this.api.get<TopProductsData>('/analytics/top-products', { weeks, limit });
  }
}
