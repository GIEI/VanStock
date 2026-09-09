import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import {
  AnalyticsService,
  WeeklyTrend,
  TopProductsData,
} from '../../core/services/analytics.service';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './analytics.component.html',
  styleUrls:   ['./analytics.component.scss'],
})
export class AnalyticsComponent implements OnInit {

  loading = false;
  weeks   = 8;

  trend:   WeeklyTrend[]  = [];
  topData: TopProductsData = { labels: [], products: [] };

  // SVG canvas dimensions
  readonly W    = 620;
  readonly H    = 180;
  readonly padL = 50;
  readonly padR = 16;
  readonly padT = 16;
  readonly padB = 34;

  // Colors: carichi=green, scarichi=red; top-products palette
  readonly TREND_COLORS   = { carichi: '#16a34a', scarichi: '#dc2626', trasferimenti: '#d97706' };
  readonly PRODUCT_COLORS = ['#111111', '#1d4ed8', '#d97706', '#7c3aed', '#0891b2'];

  constructor(private analytics: AnalyticsService) {}

  ngOnInit(): void { this.load(); }

  setWeeks(w: number): void {
    this.weeks = w;
    this.load();
  }

  load(): void {
    this.loading = true;
    forkJoin({
      trend: this.analytics.movementsTrend(this.weeks),
      top:   this.analytics.topProducts(this.weeks),
    }).subscribe({
      next: ({ trend, top }) => {
        this.trend   = trend;
        this.topData = top;
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  // ── Derived arrays ─────────────────────────────────────────────────────────

  get trendCarichi():       number[] { return this.trend.map(d => +d.carichi); }
  get trendScarichi():      number[] { return this.trend.map(d => +d.scarichi); }
  get trendTrasferimenti(): number[] { return this.trend.map(d => +d.trasferimenti); }
  get trendLabels():        string[] { return this.trend.map(d => d.label); }

  trendMaxY(): number {
    const vals = this.trend.flatMap(d => [+d.carichi, +d.scarichi, +d.trasferimenti]);
    return this.niceMax(Math.max(...vals, 0));
  }

  topMaxY(): number {
    const vals = this.topData.products.flatMap(p => p.weeks);
    return this.niceMax(Math.max(...vals, 0));
  }

  // ── SVG helpers ────────────────────────────────────────────────────────────

  polyline(values: number[], maxVal: number): string {
    if (values.length < 2 || maxVal === 0) return '';
    const iW = this.W - this.padL - this.padR;
    const iH = this.H - this.padT - this.padB;
    return values.map((v, i) => {
      const x = this.padL + (i / (values.length - 1)) * iW;
      const y = this.padT + (1 - v / maxVal) * iH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }

  dotX(i: number, total: number): number {
    const iW = this.W - this.padL - this.padR;
    return this.padL + (i / Math.max(total - 1, 1)) * iW;
  }

  dotY(v: number, maxVal: number): number {
    if (maxVal === 0) return this.padT;
    return this.padT + (1 - v / maxVal) * (this.H - this.padT - this.padB);
  }

  yTicks(maxVal: number): { val: number; y: number }[] {
    if (maxVal === 0) return [];
    const step   = this.niceStep(maxVal, 4);
    const ticks: { val: number; y: number }[] = [];
    for (let v = 0; v <= maxVal; v += step) {
      ticks.push({ val: v, y: this.dotY(v, maxVal) });
    }
    return ticks;
  }

  xTicks(labels: string[]): { label: string; x: number }[] {
    return labels.map((label, i) => ({ label, x: this.dotX(i, labels.length) }));
  }

  showXLabel(i: number, total: number): boolean {
    if (total <= 8) return true;
    const step = Math.ceil(total / 6);
    return i % step === 0 || i === total - 1;
  }

  tooltipTrend(d: WeeklyTrend): string {
    return `${d.label}  •  ↑ ${d.carichi}  ↓ ${d.scarichi}  ⇆ ${d.trasferimenti}`;
  }

  tooltipProduct(label: string, val: number, name: string): string {
    return `${label}  •  ${name}: ${val}`;
  }

  // ── Math utils ─────────────────────────────────────────────────────────────

  private niceMax(v: number): number {
    if (v === 0) return 10;
    const step = this.niceStep(v, 4);
    return Math.ceil(v / step) * step;
  }

  private niceStep(max: number, targetTicks: number): number {
    const raw  = max / targetTicks;
    const mag  = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / mag;
    let   nice: number;
    if      (norm <= 1) nice = 1;
    else if (norm <= 2) nice = 2;
    else if (norm <= 5) nice = 5;
    else                nice = 10;
    return nice * mag;
  }
}
