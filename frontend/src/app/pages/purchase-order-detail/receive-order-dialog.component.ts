import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { LocationService } from '../../core/services/location.service';
import { Location } from '../../core/models/location.model';
import { PurchaseOrderItem, LotEntry } from '../../core/models/purchase-order.model';

interface LotFormRow {
  item:         PurchaseOrderItem;
  batch_number: string;
  expiry_date:  string; // YYYY-MM-DD string for native date input
}

@Component({
  selector: 'app-receive-order-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatDialogModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatProgressSpinnerModule, MatIconModule, MatDividerModule,
  ],
  template: `
    <h2 mat-dialog-title>Ricezione Ordine</h2>

    <mat-dialog-content>

      <!-- Location selector -->
      <p class="section-desc">
        Seleziona la posizione in cui caricare la merce ricevuta.
      </p>

      <div *ngIf="loading" class="spinner-wrap">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <mat-form-field appearance="outline" class="full-width" *ngIf="!loading">
        <mat-label>Posizione di destinazione</mat-label>
        <mat-select [(ngModel)]="selectedLocationId" name="location">
          <mat-option *ngFor="let loc of locations" [value]="loc.id">
            {{ loc.name }}
            <small>&nbsp;({{ loc.type === 'warehouse' ? 'Magazzino' : 'Furgone' }})</small>
          </mat-option>
        </mat-select>
      </mat-form-field>

      <!-- Lot entries (only if any items require lot tracking) -->
      <ng-container *ngIf="lotRows.length">
        <mat-divider class="section-divider"></mat-divider>
        <p class="section-title">
          <mat-icon class="lot-icon">inventory_2</mat-icon>
          Tracciamento lotti — inserisci i dati obbligatori
        </p>
        <p class="section-desc">
          I seguenti prodotti richiedono numero di lotto e data di scadenza prima di poter essere ricevuti.
        </p>

        <div class="lot-row" *ngFor="let row of lotRows">
          <div class="lot-product-name">
            <mat-icon>category</mat-icon>
            <span>{{ row.item.product_name }}</span>
            <span class="lot-qty">{{ row.item.quantity_ordered | number:'1.0-3' }} {{ row.item.unit }}</span>
          </div>
          <div class="lot-fields">
            <mat-form-field appearance="outline" class="lot-field">
              <mat-label>Numero Lotto *</mat-label>
              <input matInput [(ngModel)]="row.batch_number"
                     [name]="'batch_' + row.item.id"
                     placeholder="Es. LOT-2024-001"
                     [title]="'Numero lotto per ' + row.item.product_name">
              <mat-icon matSuffix>tag</mat-icon>
            </mat-form-field>
            <mat-form-field appearance="outline" class="lot-field">
              <mat-label>Data Scadenza</mat-label>
              <input matInput type="date"
                     [(ngModel)]="row.expiry_date"
                     [name]="'expiry_' + row.item.id"
                     [title]="'Data scadenza per ' + row.item.product_name">
            </mat-form-field>
          </div>
        </div>
      </ng-container>

    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">Annulla</button>
      <button mat-raised-button color="primary"
              [disabled]="!canConfirm"
              (click)="confirm()">
        <mat-icon>inventory</mat-icon>
        Conferma Ricezione
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content { min-width: 420px; max-height: 72vh; }
    .section-desc  { color: #64748b; font-size: 13px; margin: 0 0 12px; line-height: 1.5; }
    .section-title {
      display: flex; align-items: center; gap: 6px;
      font-size: 14px; font-weight: 600; color: #7c3aed; margin: 12px 0 6px;
    }
    .lot-icon { font-size: 18px; width: 18px; height: 18px; }
    .section-divider { margin: 16px 0; }
    .full-width { width: 100%; }
    .spinner-wrap { display: flex; justify-content: center; padding: 20px; }

    .lot-row {
      background: #faf5ff;
      border: 1px solid #ede9fe;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 10px;
    }
    .lot-product-name {
      display: flex; align-items: center; gap: 6px;
      font-size: 13px; font-weight: 600; color: #3b0764; margin-bottom: 8px;
      mat-icon { font-size: 16px; width: 16px; height: 16px; color: #7c3aed; }
    }
    .lot-qty {
      margin-left: auto; font-weight: 400; color: #888; font-size: 12px;
    }
    .lot-fields {
      display: flex; gap: 10px; flex-wrap: wrap;
    }
    .lot-field { flex: 1; min-width: 160px; }
  `],
})
export class ReceiveOrderDialogComponent implements OnInit {
  locations: Location[] = [];
  loading = true;
  selectedLocationId: number | null = null;
  lotRows: LotFormRow[] = [];

  constructor(
    public  ref:  MatDialogRef<ReceiveOrderDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { items: PurchaseOrderItem[] },
    private locationService: LocationService,
  ) {}

  ngOnInit(): void {
    // Build lot rows for items that require lot tracking
    this.lotRows = (this.data?.items ?? [])
      .filter(i => i.track_lots)
      .map(i => ({ item: i, batch_number: '', expiry_date: '' }));

    this.locationService.list().subscribe({
      next:  locs => { this.locations = locs; this.loading = false; },
      error: ()   => { this.loading = false; },
    });
  }

  get canConfirm(): boolean {
    if (!this.selectedLocationId) return false;
    return this.lotRows.every(r => r.batch_number.trim().length > 0 && !!r.expiry_date);
  }

  cancel(): void {
    this.ref.close(undefined);
  }

  confirm(): void {
    const lotEntries: LotEntry[] = this.lotRows.map(r => ({
      item_id:      r.item.id,
      batch_number: r.batch_number.trim(),
      expiry_date:  r.expiry_date || null,
    }));

    this.ref.close({ location_id: this.selectedLocationId, lot_entries: lotEntries });
  }
}
