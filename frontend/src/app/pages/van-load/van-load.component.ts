import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { forkJoin } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { ProductService } from '../../core/services/product.service';
import { LocationService } from '../../core/services/location.service';
import { MovementService } from '../../core/services/movement.service';
import { Product } from '../../core/models/product.model';
import { Location } from '../../core/models/location.model';

export interface VanLoadItem {
  product: Product;
  selected: boolean;
  qty: number;
}

export interface VanLoadConfirmData {
  items: VanLoadItem[];
  fromName: string;
  toName: string;
}

// ── Confirmation dialog ───────────────────────────────────────────────────────

@Component({
  selector: 'app-van-load-confirm',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatDividerModule],
  template: `
    <div class="vlc">
      <div class="vlc-header">
        <mat-icon class="vlc-icon">local_shipping</mat-icon>
        <div class="vlc-title">Conferma carico furgone</div>
        <div class="vlc-subtitle">
          <strong>Da:</strong> {{ data.fromName }} &nbsp;→&nbsp; <strong>A:</strong> {{ data.toName }}
        </div>
      </div>

      <div class="vlc-list">
        <div *ngFor="let item of data.items" class="vlc-row">
          <span class="vlc-name">{{ item.product.name }}</span>
          <span class="vlc-sku">{{ item.product.sku }}</span>
          <span class="vlc-qty">{{ item.qty }} {{ item.product.unit }}</span>
        </div>
      </div>
      <mat-divider class="vlc-divider"></mat-divider>
      <p class="vlc-total">{{ data.items.length }} prodotti selezionati</p>

      <div class="vlc-actions">
        <button mat-stroked-button (click)="ref.close(false)">
          <mat-icon>close</mat-icon> Annulla
        </button>
        <button mat-raised-button color="primary" (click)="ref.close(true)">
          <mat-icon>check</mat-icon> Procedi
        </button>
      </div>
    </div>
  `,
  styles: [`
    .vlc { padding: 24px 20px 20px; min-width: 360px; max-width: 520px; overflow: hidden; display: flex; flex-direction: column; }
    .vlc-header { text-align: center; margin-bottom: 16px; }
    .vlc-icon { font-size: 48px; width: 48px; height: 48px; color: var(--c-primary); display: block; margin: 0 auto 8px; }
    .vlc-title { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
    .vlc-subtitle { font-size: 13px; color: var(--c-text2); }
    .vlc-list {
      display: flex; flex-direction: column; gap: 6px;
      max-height: 280px; overflow-y: auto;
      scrollbar-width: none; -ms-overflow-style: none;
    }
    .vlc-list::-webkit-scrollbar { display: none; }
    .vlc-row {
      display: grid; grid-template-columns: 1fr auto auto;
      align-items: center; gap: 8px;
      padding: 8px 12px;
      background: var(--c-surface2); border-radius: var(--r-sm);
    }
    .vlc-name { font-weight: 600; font-size: 13px; }
    .vlc-sku  { font-size: 11px; color: var(--c-text3); }
    .vlc-qty  { font-size: 13px; font-weight: 700; color: var(--c-primary); white-space: nowrap; }
    .vlc-divider { margin: 12px 0 6px; }
    .vlc-total { text-align: center; font-size: 12px; color: var(--c-text3); margin: 0 0 16px; }
    .vlc-actions { display: flex; justify-content: flex-end; gap: 8px; }
  `],
})
export class VanLoadConfirmDialogComponent {
  constructor(
    public ref: MatDialogRef<VanLoadConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: VanLoadConfirmData,
  ) {}
}

// ── Main component ────────────────────────────────────────────────────────────

@Component({
  selector: 'app-van-load',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
    TranslateModule,
  ],
  templateUrl: './van-load.component.html',
  styleUrls:  ['./van-load.component.scss'],
})
export class VanLoadComponent implements OnInit {
  locations: Location[] = [];
  items: VanLoadItem[] = [];
  searchQuery = '';

  fromLocationId: number | null = null;
  toLocationId:   number | null = null;

  loading  = false;
  saving   = false;

  constructor(
    private productService:  ProductService,
    private locationService: LocationService,
    private movementService: MovementService,
    private snack:           MatSnackBar,
    private dialog:          MatDialog,
    private router:          Router,
  ) {}

  ngOnInit(): void {
    this.locationService.list().subscribe(locs => {
      this.locations = locs;
      // Default from = first warehouse, to = first van
      const wh  = locs.find(l => l.type === 'warehouse');
      const van = locs.find(l => l.type === 'van');
      if (wh)  this.fromLocationId = wh.id;
      if (van) this.toLocationId   = van.id;
      if (this.fromLocationId) this.loadProducts();
    });
  }

  get fromLocations(): Location[] {
    return this.locations.filter(l => l.id !== this.toLocationId);
  }

  get toLocations(): Location[] {
    return this.locations.filter(l => l.id !== this.fromLocationId);
  }

  get filteredItems(): VanLoadItem[] {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) return this.items;
    return this.items.filter(i =>
      i.product.name.toLowerCase().includes(q) ||
      i.product.sku.toLowerCase().includes(q)  ||
      (i.product.category ?? '').toLowerCase().includes(q),
    );
  }

  get selectedItems(): VanLoadItem[] {
    return this.items.filter(i => i.selected && i.qty > 0);
  }

  get allSelected(): boolean {
    return this.filteredItems.length > 0 && this.filteredItems.every(i => i.selected);
  }

  get someSelected(): boolean {
    return this.filteredItems.some(i => i.selected) && !this.allSelected;
  }

  onFromChange(): void {
    this.items = [];
    if (this.fromLocationId) this.loadProducts();
  }

  loadProducts(): void {
    if (!this.fromLocationId) return;
    this.loading = true;
    this.productService.list({ location_id: this.fromLocationId, limit: 500 }).subscribe({
      next: res => {
        this.items = res.data
          .filter(p => +p.quantity > 0)
          .map(p => ({ product: p, selected: false, qty: 1 }));
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  toggleAll(checked: boolean): void {
    this.filteredItems.forEach(i => (i.selected = checked));
  }

  clampQty(item: VanLoadItem): void {
    const max = +item.product.quantity;
    if (item.qty < 1)    item.qty = 1;
    if (item.qty > max)  item.qty = max;
  }

  openConfirm(): void {
    const sel = this.selectedItems;
    if (sel.length === 0) {
      this.snack.open('Seleziona almeno un prodotto', 'OK', { duration: 3000 });
      return;
    }
    if (!this.toLocationId) {
      this.snack.open('Seleziona la destinazione (furgone)', 'OK', { duration: 3000 });
      return;
    }

    const fromLoc = this.locations.find(l => l.id === this.fromLocationId);
    const toLoc   = this.locations.find(l => l.id === this.toLocationId);

    const ref = this.dialog.open(VanLoadConfirmDialogComponent, {
      data: {
        items:    sel,
        fromName: fromLoc?.name ?? '—',
        toName:   toLoc?.name  ?? '—',
      } as VanLoadConfirmData,
      width: '540px',
    });

    ref.afterClosed().subscribe(confirmed => {
      if (confirmed) this.executeLoad(sel);
    });
  }

  locIcon(type: string): string {
    return type === 'warehouse' ? 'warehouse' : type === 'van' ? 'local_shipping' : type === 'site' ? 'construction' : 'place';
  }

  private executeLoad(sel: VanLoadItem[]): void {
    this.saving = true;
    const requests = sel.map(item =>
      this.movementService.create({
        product_id:       item.product.id,
        type:             'trasferimento',
        quantity:         item.qty,
        from_location_id: this.fromLocationId!,
        to_location_id:   this.toLocationId!,
      }),
    );

    forkJoin(requests).subscribe({
      next: () => {
        this.saving = false;
        this.snack.open(`${sel.length} prodotti trasferiti con successo`, 'OK', { duration: 4000 });
        this.loadProducts();
      },
      error: err => {
        this.saving = false;
        this.snack.open(err.error?.error || 'Errore durante il carico', 'OK', { duration: 4000 });
      },
    });
  }
}
