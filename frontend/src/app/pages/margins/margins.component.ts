import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule } from '@ngx-translate/core';
import { ApiService } from '../../core/services/api.service';

export interface ProductMargin {
  id: number;
  name: string;
  sku: string;
  unit: string;
  category: string | null;
  sale_price: number | null;
  current_stock: number;
  avg_purchase_price: number | null;
  total_loaded_cost: number | null;
  total_loaded_qty: number | null;
  margin_abs: number | null;
  margin_pct: number | null;
  stock_value_cost: number | null;
  stock_value_sale: number | null;
}

export interface JobMargin {
  id: number;
  title: string;
  status: string;
  scheduled_date: string | null;
  client_name: string | null;
  material_cost: number;
  material_value: number;
  margin_abs: number | null;
  margin_pct: number | null;
  movement_count: number;
}

export interface MarginsSummary {
  product_count: number;
  products_with_cost: number;
  stock_value_cost: number;
  stock_value_sale: number;
  stock_margin_abs: number;
  stock_margin_pct: number | null;
  job_count: number;
  job_material_cost: number;
  job_material_value: number;
  job_margin_abs: number;
  job_margin_pct: number | null;
}

type ProductSortKey = 'name' | 'current_stock' | 'avg_purchase_price' | 'sale_price' | 'margin_pct' | 'stock_value_sale';
type JobSortKey     = 'title' | 'material_cost' | 'material_value' | 'margin_pct' | 'movement_count';

@Component({
  selector: 'app-margins',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    TranslateModule,
  ],
  templateUrl: './margins.component.html',
  styleUrls: ['./margins.component.scss'],
})
export class MarginsComponent implements OnInit {
  products: ProductMargin[] = [];
  jobs:     JobMargin[]     = [];
  summary:  MarginsSummary | null = null;

  loading        = true;
  loadingJobs    = true;
  loadingSummary = true;

  dateFrom: string | null = null;
  dateTo:   string | null = null;

  productSearch = '';
  jobSearch     = '';

  productSort:    ProductSortKey = 'name';
  productSortDir: 1 | -1 = 1;
  jobSort:        JobSortKey = 'material_cost';
  jobSortDir:     1 | -1 = -1;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadSummary();
    this.api.get<ProductMargin[]>('/margins/products').subscribe({
      next:  data => { this.products = data; this.loading = false; },
      error: ()   => { this.loading = false; },
    });
    this.loadJobs();
  }

  loadSummary(): void {
    this.loadingSummary = true;
    const params: Record<string, string | number | boolean> = {};
    if (this.dateFrom) params['date_from'] = this.dateFrom;
    if (this.dateTo)   params['date_to']   = this.dateTo;
    this.api.get<MarginsSummary>('/margins/summary', params).subscribe({
      next:  data => { this.summary = data; this.loadingSummary = false; },
      error: ()   => { this.loadingSummary = false; },
    });
  }

  loadJobs(): void {
    this.loadingJobs = true;
    const params: Record<string, string | number | boolean> = {};
    if (this.dateFrom) params['date_from'] = this.dateFrom;
    if (this.dateTo)   params['date_to']   = this.dateTo;
    this.api.get<JobMargin[]>('/margins/jobs', params).subscribe({
      next:  data => { this.jobs = data; this.loadingJobs = false; },
      error: ()   => { this.loadingJobs = false; },
    });
  }

  applyDateFilter(): void {
    this.loadJobs();
    this.loadSummary();
  }

  resetDateFilter(): void {
    this.dateFrom = null;
    this.dateTo   = null;
    this.applyDateFilter();
  }

  get filteredProducts(): ProductMargin[] {
    let rows = this.products;
    const q = this.productSearch.trim().toLowerCase();
    if (q) {
      rows = rows.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q)
      );
    }
    const key = this.productSort;
    const dir = this.productSortDir;
    return [...rows].sort((a, b) => this.compare(a[key], b[key]) * dir);
  }

  get filteredJobs(): JobMargin[] {
    let rows = this.jobs;
    const q = this.jobSearch.trim().toLowerCase();
    if (q) {
      rows = rows.filter(j =>
        j.title.toLowerCase().includes(q) ||
        (j.client_name || '').toLowerCase().includes(q)
      );
    }
    const key = this.jobSort;
    const dir = this.jobSortDir;
    return [...rows].sort((a, b) => this.compare(a[key], b[key]) * dir);
  }

  private compare(a: unknown, b: unknown): number {
    if (a == null && b == null) return 0;
    if (a == null) return -1;
    if (b == null) return 1;
    if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b);
    return (a as number) < (b as number) ? -1 : (a as number) > (b as number) ? 1 : 0;
  }

  sortProducts(key: ProductSortKey): void {
    if (this.productSort === key) { this.productSortDir = this.productSortDir === 1 ? -1 : 1; }
    else { this.productSort = key; this.productSortDir = 1; }
  }

  sortJobs(key: JobSortKey): void {
    if (this.jobSort === key) { this.jobSortDir = this.jobSortDir === 1 ? -1 : 1; }
    else { this.jobSort = key; this.jobSortDir = -1; }
  }

  marginClass(pct: number | null | undefined): string {
    if (pct == null) return '';
    if (pct < 10) return 'low';
    if (pct < 30) return 'ok';
    return 'good';
  }
}
