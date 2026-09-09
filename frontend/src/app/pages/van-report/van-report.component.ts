import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule, MatCalendarCellClassFunction } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { TranslateModule } from '@ngx-translate/core';
import { MovementService } from '../../core/services/movement.service';
import { LocationService } from '../../core/services/location.service';
import { AuthService } from '../../core/services/auth.service';
import { Movement } from '../../core/models/product.model';
import { Location } from '../../core/models/location.model';

interface ProductSummary {
  product_name: string;
  sku:          string;
  unit:         string;
  carico:       number;
  scarico:      number;
  trasferimento_in:  number;
  trasferimento_out: number;
}

@Component({
  selector: 'app-van-report',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDatepickerModule,
    MatNativeDateModule,
    TranslateModule,
  ],
  templateUrl: './van-report.component.html',
  styleUrls: ['./van-report.component.scss'],
})
export class VanReportComponent implements OnInit {
  locations:      Location[]  = [];
  movements:      Movement[]  = [];
  summary:        ProductSummary[] = [];
  availableUsers: string[] = [];

  locationId: number | null = null;
  reportDate: Date = new Date();
  filterUser = '';

  loading = false;
  activeDates = new Set<string>();
  dateClass: MatCalendarCellClassFunction<Date> = () => '';

  private loadedMonth = -1;
  private loadedYear  = -1;

  constructor(
    private movementService: MovementService,
    private locationService: LocationService,
    public  auth: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.locationService.list().subscribe(l => {
      this.locations = l;
    });
  }

  onLocationChange(): void {
    this.activeDates = new Set();
    this.loadedMonth = -1;
    this.loadedYear  = -1;
    this.refreshDateClass();
    if (this.locationId) {
      this.loadMonthDates(this.reportDate);
      this.load();
    } else {
      this.movements     = [];
      this.summary       = [];
      this.availableUsers = [];
    }
  }

  onUserFilterChange(): void {
    this.load();
  }

  onDateChange(): void {
    this.load();
    if (
      this.reportDate &&
      (this.reportDate.getMonth()    !== this.loadedMonth ||
       this.reportDate.getFullYear() !== this.loadedYear)
    ) {
      this.loadMonthDates(this.reportDate);
    }
  }

  load(): void {
    if (!this.locationId) return;
    this.loading = true;

    const date = this.reportDate ?? new Date();
    const from = new Date(date);
    from.setHours(0, 0, 0, 0);
    const to = new Date(date);
    to.setHours(23, 59, 59, 999);

    this.movementService.list({
      location_id: this.locationId,
      from:        from.toISOString(),
      to:          to.toISOString(),
      created_by:  this.filterUser || undefined,
      limit:       500,
    }).subscribe({
      next: mv => {
        this.movements = mv;
        this.buildSummary(mv);
        // Collect unique users for the filter dropdown (only for first load without user filter)
        if (!this.filterUser) {
          const users = new Set(mv.map(m => m.created_by).filter((u): u is string => !!u));
          this.availableUsers = Array.from(users).sort();
        }
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  private loadMonthDates(date: Date): void {
    if (!this.locationId) return;
    const from = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
    const to   = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

    this.movementService.list({
      location_id: this.locationId,
      from: from.toISOString(),
      to:   to.toISOString(),
      limit: 1000,
    }).subscribe({
      next: mv => {
        const newDates = new Set<string>();
        mv.forEach(m => {
          if (m.created_at) {
            newDates.add(this.toDateKey(new Date(m.created_at)));
          }
        });
        this.activeDates  = newDates;
        this.loadedMonth  = date.getMonth();
        this.loadedYear   = date.getFullYear();
        this.refreshDateClass();
        this.cdr.detectChanges();
      },
    });
  }

  private refreshDateClass(): void {
    const snapshot = this.activeDates;
    this.dateClass = (date: Date, view: string) => {
      if (view === 'month') {
        return snapshot.has(this.toDateKey(date)) ? 'has-movements' : '';
      }
      return '';
    };
  }

  private toDateKey(d: Date): string {
    const y   = d.getFullYear();
    const m   = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private buildSummary(mv: Movement[]): void {
    const map = new Map<number, ProductSummary>();

    for (const m of mv) {
      const key = m.product_id;
      if (!map.has(key)) {
        map.set(key, {
          product_name: m.product_name ?? '',
          sku:          m.sku          ?? '',
          unit:         m.unit         ?? '',
          carico:       0,
          scarico:      0,
          trasferimento_in:  0,
          trasferimento_out: 0,
        });
      }
      const s = map.get(key)!;
      const qty = +m.quantity;
      if (m.type === 'carico')         s.carico += qty;
      else if (m.type === 'scarico')   s.scarico += qty;
      else if (m.type === 'trasferimento') {
        if (m.to_location_id === this.locationId)   s.trasferimento_in  += qty;
        if (m.from_location_id === this.locationId) s.trasferimento_out += qty;
      }
    }

    this.summary = Array.from(map.values()).sort((a, b) => a.product_name.localeCompare(b.product_name));
  }

  get selectedLocation(): Location | undefined {
    return this.locations.find(l => l.id === this.locationId);
  }

  get totalMovements(): number { return this.movements.length; }

  get totalScarico(): number {
    return this.movements.filter(m => m.type === 'scarico').reduce((acc, m) => acc + +m.quantity, 0);
  }

  movColor(type: string): string {
    return { carico: '#22c55e', scarico: '#f97316', trasferimento: '#6366f1' }[type] ?? '#6366f1';
  }

  movIcon(type: string): string {
    return { carico: 'add_circle', scarico: 'remove_circle', trasferimento: 'swap_horiz' }[type] ?? 'swap_horiz';
  }

  movLabel(type: string): string {
    return { carico: 'Carico', scarico: 'Scarico', trasferimento: 'Trasferimento' }[type] ?? type;
  }

  print(): void {
    window.print();
  }
}
