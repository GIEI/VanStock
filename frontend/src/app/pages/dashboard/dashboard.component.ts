import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRippleModule } from '@angular/material/core';
import { DashboardService } from '../../core/services/dashboard.service';
import { AuthService } from '../../core/services/auth.service';
import { JobService } from '../../core/services/job.service';
import { DashboardStats } from '../../core/models/dashboard.model';
import { Product, Movement } from '../../core/models/product.model';
import { InventoryService, ProductBatch } from '../../core/services/inventory.service';
import { Job } from '../../core/models/job.model';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatRippleModule,
    TranslateModule,
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  stats: DashboardStats | null = null;
  alerts: Product[]            = [];
  expiringBatches: ProductBatch[] = [];
  recentMovements: Movement[]  = [];
  myJobs: Job[]                = [];
  loading = true;

  constructor(
    private dashboardService: DashboardService,
    private jobService:       JobService,
    private inventoryService: InventoryService,
    public  auth:      AuthService,
    private router:    Router,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    console.log('Starting dashboard data load...');

    Promise.all([
      this.dashboardService.stats().toPromise().then(r => { console.log('✓ stats', r); return r; }),
      this.dashboardService.alerts().toPromise().then(r => { console.log('✓ alerts', r); return r; }),
      this.dashboardService.recentMovements().toPromise().then(r => { console.log('✓ movements', r); return r; }),
      this.jobService.my().toPromise().then(r => { console.log('✓ myJobs', r); return r; }),
      this.inventoryService.getExpiring(60).toPromise().then(r => { console.log('✓ expiring', r); return r; }),
    ]).then(([stats, alerts, movements, myJobs, expiring]) => {
      console.log('All data loaded successfully');
      this.stats           = stats!;
      this.alerts          = alerts!;
      this.recentMovements = movements!;
      this.myJobs          = (myJobs ?? []).filter(j => j.status !== 'completato' && j.status !== 'annullato');
      this.expiringBatches = expiring ?? [];
      this.loading         = false;
    }).catch((err) => {
      console.error('Dashboard loading error:', err);
      this.loading = false;
    });
  }

  navigate(path: string[], extras?: { queryParams?: Record<string, string> }): void {
    this.router.navigate(path, extras);
  }

  movementIcon(type: string): string {
    return { carico: 'add_circle', scarico: 'remove_circle', trasferimento: 'swap_horiz' }[type] ?? 'swap_horiz';
  }

  movementColor(type: string): string {
    return { carico: '#22c55e', scarico: '#f97316', trasferimento: '#6366f1' }[type] ?? '#6366f1';
  }

  jobStatusColor(status: string): string {
    return { aperto: '#1d4ed8', in_corso: '#d97706', completato: '#16a34a', annullato: '#dc2626' }[status] ?? '#6b7280';
  }

  jobStatusLabel(status: string): string {
    const key: Record<string, string> = {
      aperto: 'DASHBOARD.JOB_STATUS.OPEN',
      in_corso: 'DASHBOARD.JOB_STATUS.IN_PROGRESS',
      completato: 'DASHBOARD.JOB_STATUS.COMPLETED',
      annullato: 'DASHBOARD.JOB_STATUS.CANCELLED',
    };
    return key[status] ? this.translate.instant(key[status]) : status;
  }

  stockClass(p: Product): string {
    const qty = +p.quantity;
    const min = +p.min_stock;
    if (qty === 0)  return 'critical';
    if (qty < min) return 'warning';
    return 'ok';
  }

  get greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return this.translate.instant('DASHBOARD.GREETING_MORNING');
    if (h < 18) return this.translate.instant('DASHBOARD.GREETING_AFTERNOON');
    return this.translate.instant('DASHBOARD.GREETING_EVENING');
  }
}
