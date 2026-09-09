import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LocationService } from '../../core/services/location.service';
import { AuditService, AuditProduct, AuditDiscrepancy } from '../../core/services/audit.service';
import { Location } from '../../core/models/location.model';

interface AuditRow extends AuditProduct {
  physical_quantity: number | null;
  difference:        number | null;
}

type PageState = 'setup' | 'counting' | 'result';

@Component({
  selector: 'app-inventory-audit',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDividerModule,
    MatChipsModule,
    TranslateModule,
  ],
  templateUrl: './inventory-audit.component.html',
  styleUrls: ['./inventory-audit.component.scss'],
})
export class InventoryAuditComponent implements OnInit {
  pageState: PageState = 'setup';

  locations:          Location[] = [];
  selectedLocationId: number | null = null;
  locationName        = '';

  rows:     AuditRow[] = [];
  loading   = false;
  applying  = false;

  // Result state
  result:            AuditDiscrepancy[] = [];
  resultApplied      = 0;
  resultLocationName = '';

  readonly countingColumns = ['name', 'sku', 'unit', 'system_qty', 'physical_qty', 'diff'];
  readonly resultColumns   = ['name', 'sku', 'unit', 'system_qty', 'physical_qty', 'diff'];

  constructor(
    private locationSvc: LocationService,
    private auditSvc:    AuditService,
    private snack:       MatSnackBar,
    private translate:   TranslateService,
  ) {}

  ngOnInit(): void {
    this.locationSvc.list().subscribe({
      next:  locs => (this.locations = locs),
      error: () => this.snack.open(this.translate.instant('COMMON.ERROR'), 'OK', { duration: 3000 }),
    });
  }

  loadPreview(): void {
    if (!this.selectedLocationId) return;
    this.loading = true;
    this.auditSvc.preview(this.selectedLocationId).subscribe({
      next: resp => {
        this.locationName = resp.location.name;
        this.rows = resp.products.map(p => ({
          ...p,
          physical_quantity: p.system_quantity, // pre-fill with system qty
          difference: 0,
        }));
        this.pageState = 'counting';
        this.loading   = false;
      },
      error: () => {
        this.loading = false;
        this.snack.open(this.translate.instant('COMMON.ERROR'), 'OK', { duration: 3000 });
      },
    });
  }

  onPhysicalChange(row: AuditRow): void {
    const phys = row.physical_quantity;
    row.difference = (phys !== null && !isNaN(phys as number))
      ? Math.round((+phys - row.system_quantity) * 1000) / 1000
      : null;
  }

  get hasDiscrepancies(): boolean {
    return this.rows.some(r => r.difference !== null && r.difference !== 0);
  }

  get discrepancyRows(): AuditRow[] {
    return this.rows.filter(r => r.difference !== null && r.difference !== 0);
  }

  applyAudit(): void {
    const counts = this.rows
      .filter(r => r.physical_quantity !== null && r.difference !== 0)
      .map(r => ({ product_id: r.id, physical_qty: r.physical_quantity as number }));

    if (!counts.length) {
      this.snack.open(this.translate.instant('AUDIT.NO_DISCREPANCIES'), 'OK', { duration: 3000 });
      return;
    }

    this.applying = true;
    this.auditSvc.apply(this.selectedLocationId!, counts).subscribe({
      next: resp => {
        this.resultApplied      = resp.applied;
        this.result             = resp.discrepancies;
        this.resultLocationName = this.locationName;
        this.pageState = 'result';
        this.applying  = false;
      },
      error: () => {
        this.applying = false;
        this.snack.open(this.translate.instant('COMMON.ERROR'), 'OK', { duration: 3000 });
      },
    });
  }

  reset(): void {
    this.pageState          = 'setup';
    this.selectedLocationId = null;
    this.locationName       = '';
    this.rows               = [];
    this.result             = [];
  }

  diffClass(diff: number | null): string {
    if (diff === null || diff === 0) return '';
    return diff > 0 ? 'diff-plus' : 'diff-minus';
  }

  diffSign(diff: number): string {
    return diff > 0 ? `+${diff}` : String(diff);
  }
}
