import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { VehicleBookingService } from '../../core/services/vehicle-booking.service';
import { LocationService } from '../../core/services/location.service';
import { VehicleBooking } from '../../core/models/vehicle-booking.model';
import { Location } from '../../core/models/location.model';
import { AuthService } from '../../core/services/auth.service';

interface DayCell {
  date:       Date;
  dateStr:    string;        // YYYY-MM-DD
  isToday:    boolean;
  isWeekend:  boolean;
}

interface HourBooking {
  hour:      number;        // 7-18
  bookings:  VehicleBooking[];
}

interface VanRow {
  van:   Location;
  hours: HourBooking[];
}

// ── Dialog for displaying all jobs in a van cell ──────────────────────────────
@Component({
  selector: 'app-van-jobs-details',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  template: `
    <div class="vjd">
      <div class="vjd-header">
        <mat-icon>local_shipping</mat-icon>
        <div>
          <span class="vjd-title">{{ data.vanName }}</span>
          <span class="vjd-date">{{ data.date | date:'dd MMM yyyy' }}</span>
        </div>
      </div>
      <div class="vjd-list">
        <div *ngFor="let booking of data.bookings" class="vjd-item">
          <div class="vjd-item-title">
            <span class="vjd-job-title">{{ booking.job_title || 'Prenotazione' }}</span>
            <span *ngIf="booking.booked_by_name" class="vjd-booked-by">{{ booking.booked_by_name }}</span>
          </div>
          <div *ngIf="booking.job_address" class="vjd-address">
            <mat-icon>location_on</mat-icon>{{ booking.job_address }}
          </div>
          <div *ngIf="booking.notes" class="vjd-notes">
            <mat-icon>note</mat-icon>{{ booking.notes }}
          </div>
        </div>
      </div>
      <div class="vjd-actions">
        <button mat-raised-button (click)="ref.close()">Chiudi</button>
      </div>
    </div>
  `,
  styles: [`
    .vjd { padding: 20px; min-width: 360px; }
    .vjd-header { display: flex; gap: 12px; margin-bottom: 20px; }
    .vjd-header mat-icon { font-size: 32px; width: 32px; height: 32px; color: var(--c-primary); }
    .vjd-header > div { display: flex; flex-direction: column; }
    .vjd-title { font-weight: 700; font-size: 16px; }
    .vjd-date { font-size: 12px; color: var(--c-text3); }
    .vjd-list { display: flex; flex-direction: column; gap: 12px; max-height: 400px; overflow-y: auto; margin-bottom: 16px; }
    .vjd-item { padding: 12px; background: var(--c-surface2); border-radius: var(--r-sm); }
    .vjd-item-title { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
    .vjd-job-title { font-weight: 600; font-size: 14px; }
    .vjd-booked-by { font-size: 12px; color: var(--c-text3); }
    .vjd-address { display: flex; gap: 6px; align-items: flex-start; font-size: 12px; color: var(--c-text2); margin-bottom: 4px; }
    .vjd-address mat-icon { font-size: 16px; width: 16px; height: 16px; margin-top: 2px; flex-shrink: 0; }
    .vjd-notes { display: flex; gap: 6px; align-items: flex-start; font-size: 12px; color: var(--c-text2); }
    .vjd-notes mat-icon { font-size: 16px; width: 16px; height: 16px; margin-top: 2px; flex-shrink: 0; }
    .vjd-actions { display: flex; justify-content: flex-end; }
  `],
})
export class VanJobsDetailsDialog {
  constructor(
    public ref: MatDialogRef<VanJobsDetailsDialog>,
    @Inject(MAT_DIALOG_DATA) public data: { bookings: VehicleBooking[]; vanName: string; date: string },
  ) {}
}

@Component({
  selector: 'app-vehicle-calendar',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    TranslateModule,
    VanJobsDetailsDialog,
  ],
  templateUrl: './vehicle-calendar.component.html',
  styleUrls: ['./vehicle-calendar.component.scss'],
})
export class VehicleCalendarComponent implements OnInit {
  loading   = false;
  weekStart = this.getMonday(new Date());

  days:    DayCell[]  = [];
  vanRows: VanRow[]   = [];
  bookings: VehicleBooking[] = [];
  vans:     Location[]       = [];

  constructor(
    private bookingService:  VehicleBookingService,
    private locationService: LocationService,
    public  auth:            AuthService,
    private dialog:          MatDialog,
  ) {}

  ngOnInit(): void {
    this.locationService.list().subscribe(locs => {
      this.vans = locs.filter(l => l.type === 'van');
      this.load();
    });
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  prevWeek(): void { this.shiftWeek(-7); }
  nextWeek(): void { this.shiftWeek(7); }
  goToday():  void { this.weekStart = this.getMonday(new Date()); this.load(); }

  private shiftWeek(days: number): void {
    const d = new Date(this.weekStart);
    d.setDate(d.getDate() + days);
    this.weekStart = d;
    this.load();
  }

  // ── Data loading ──────────────────────────────────────────────────────────

  load(): void {
    this.loading = true;
    this.days = this.buildDays();
    const dateFrom = this.toDateStr(this.days[0].date);
    const dateTo   = this.toDateStr(this.days[this.days.length - 1].date);

    this.bookingService.list({ date_from: dateFrom, date_to: dateTo }).subscribe({
      next: bookings => {
        console.log('[VAN CALENDAR] Loaded bookings:', bookings.length, bookings);
        this.bookings = bookings;
        this.buildGrid();
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  private buildDays(): DayCell[] {
    const today  = this.toDateStr(new Date());
    const result: DayCell[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(this.weekStart);
      d.setDate(d.getDate() + i);
      result.push({
        date:      d,
        dateStr:   this.toDateStr(d),
        isToday:   this.toDateStr(d) === today,
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
      });
    }
    return result;
  }

  private buildGrid(): void {
    const hours = this.generateHours();
    this.vanRows = this.vans.map(van => ({
      van,
      hours: hours.map(hour => ({
        hour,
        bookings: this.findBookingsForHour(van.id, hour),
      })),
    }));
  }

  private generateHours(): number[] {
    const hours: number[] = [];
    for (let h = 7; h < 19; h++) {
      hours.push(h);
      if (h < 18) hours.push(h + 0.5);  // Add 30-minute slots
    }
    return hours;
  }

  private findBookingsForHour(vanId: number, hour: number): VehicleBooking[] {
    const result = this.bookings.filter(b => {
      if (b.location_id !== vanId) return false;
      return this.bookingOverlapsHour(b, hour);
    });
    if (result.length > 0) {
      console.log(`[VAN CALENDAR] Van ${vanId}, hour ${hour}: ${result.length} booking(s)`, result);
    }
    return result;
  }

  getBookingsForHourAndDay(vanId: number, hour: number, dateStr: string): VehicleBooking[] {
    return this.bookings.filter(b => {
      if (b.location_id !== vanId) return false;
      // Check if booking date matches the displayed day
      if (b.date.slice(0, 10) !== dateStr) return false;
      return this.bookingOverlapsHour(b, hour);
    });
  }

  private bookingOverlapsHour(booking: VehicleBooking, hour: number): boolean {
    const startHour = this.timeToDecimalHour(booking.start_time);
    const endHour = this.timeToDecimalHour(booking.end_time);
    const slotStart = hour;
    const slotEnd = hour + 0.5;  // Each slot is 30 minutes
    // Check if [startHour, endHour) overlaps with [slotStart, slotEnd)
    return startHour < slotEnd && endHour > slotStart;
  }

  private timeToDecimalHour(timeStr: string): number {
    if (!timeStr) return 0;
    const [hh, mm] = timeStr.split(':');
    return parseInt(hh, 10) + parseInt(mm, 10) / 60;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  get weekLabel(): string {
    const end = new Date(this.weekStart);
    end.setDate(end.getDate() + 6);
    const fmt = (d: Date) =>
      d.toLocaleDateString('it', { day: '2-digit', month: 'short' });
    return `${fmt(this.weekStart)} – ${fmt(end)} ${end.getFullYear()}`;
  }

  cellClass(bookings: VehicleBooking[]): string {
    return bookings.length > 0 ? 'cell--occupied' : 'cell--free';
  }

  cellTooltip(bookings: VehicleBooking[]): string {
    if (bookings.length === 0) return 'Disponibile';
    return `${bookings.length} job prenotato${bookings.length > 1 ? 'i' : ''}`;
  }

  openJobsDialog(bookings: VehicleBooking[], vanName: string, date: string): void {
    if (bookings.length === 0) return;
    this.dialog.open(VanJobsDetailsDialog, {
      data: { bookings, vanName, date },
      width: '500px',
    });
  }

  formatHour(hour: number): string {
    const h = Math.floor(hour);
    const m = hour % 1 === 0.5 ? 30 : 0;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  private getMonday(d: Date): Date {
    const day  = d.getDay(); // 0=sun
    const diff = day === 0 ? -6 : 1 - day;
    const m    = new Date(d);
    m.setDate(d.getDate() + diff);
    m.setHours(0, 0, 0, 0);
    return m;
  }

  private toDateStr(d: Date): string {
    const yyyy = d.getFullYear();
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    const dd   = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
}
