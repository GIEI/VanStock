import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { TranslateModule } from '@ngx-translate/core';
import { VehicleBookingService } from '../../core/services/vehicle-booking.service';
import { LocationService } from '../../core/services/location.service';
import { UserService } from '../../core/services/user.service';
import { VehicleBooking } from '../../core/models/vehicle-booking.model';
import { Location } from '../../core/models/location.model';
import { User } from '../../core/models/user.model';

interface DayCell {
  date:      Date;
  dateStr:   string;
  isToday:   boolean;
  isWeekend: boolean;
}

interface HourBooking {
  hour:     number;
  bookings: VehicleBooking[];
}

interface VanRow {
  van:   Location;
  hours: HourBooking[];
}

interface AvailableUser {
  id:    number;
  name:  string;
  email: string;
}

@Component({
  selector: 'app-availability-calendar',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatChipsModule,
    TranslateModule,
  ],
  templateUrl: './availability-calendar.component.html',
  styleUrls: ['./availability-calendar.component.scss'],
})
export class AvailabilityCalendarComponent implements OnInit {
  loading = false;
  weekStart = this.getMonday(new Date());

  days: DayCell[] = [];
  vanRows: VanRow[] = [];
  bookings: VehicleBooking[] = [];
  vans: Location[] = [];

  selectedSlot: { dateStr: string; hour: number } | null = null;
  availableUsers: AvailableUser[] | null = null;
  loadingUsers = false;

  constructor(
    private bookingService: VehicleBookingService,
    private locationService: LocationService,
    private userService: UserService,
    public dialogRef: MatDialogRef<AvailabilityCalendarComponent>,
  ) {}

  ngOnInit(): void {
    this.locationService.list().subscribe(locs => {
      this.vans = locs.filter(l => l.type === 'van');
      this.load();
    });
  }

  prevWeek(): void { this.shiftWeek(-7); }
  nextWeek(): void { this.shiftWeek(7); }
  goToday(): void { this.weekStart = this.getMonday(new Date()); this.load(); }

  private shiftWeek(days: number): void {
    const d = new Date(this.weekStart);
    d.setDate(d.getDate() + days);
    this.weekStart = d;
    this.load();
  }

  load(): void {
    this.loading = true;
    this.days = this.buildDays();
    const dateFrom = this.toDateStr(this.days[0].date);
    const dateTo = this.toDateStr(this.days[this.days.length - 1].date);

    this.bookingService.list({ date_from: dateFrom, date_to: dateTo }).subscribe({
      next: bookings => {
        this.bookings = bookings;
        this.buildGrid();
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  private buildDays(): DayCell[] {
    const today = this.toDateStr(new Date());
    const result: DayCell[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(this.weekStart);
      d.setDate(d.getDate() + i);
      result.push({
        date: d,
        dateStr: this.toDateStr(d),
        isToday: this.toDateStr(d) === today,
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
      if (h < 18) hours.push(h + 0.5);
    }
    return hours;
  }

  private findBookingsForHour(vanId: number, hour: number): VehicleBooking[] {
    return this.bookings.filter(b => {
      if (b.location_id !== vanId) return false;
      return this.bookingOverlapsHour(b, hour);
    });
  }

  getBookingsForSlot(vanId: number, dateStr: string, hour: number): VehicleBooking[] {
    return this.bookings.filter(b => {
      if (b.location_id !== vanId) return false;
      if (b.date !== dateStr) return false;
      return this.bookingOverlapsHour(b, hour);
    });
  }

  private bookingOverlapsHour(booking: VehicleBooking, hour: number): boolean {
    const startHour = this.timeToDecimalHour(booking.start_time);
    const endHour = this.timeToDecimalHour(booking.end_time);
    const slotStart = hour;
    const slotEnd = hour + 0.5;
    return startHour < slotEnd && endHour > slotStart;
  }

  private timeToDecimalHour(timeStr: string): number {
    if (!timeStr) return 0;
    const [hh, mm] = timeStr.split(':');
    return parseInt(hh, 10) + parseInt(mm, 10) / 60;
  }

  formatHour(hour: number): string {
    const h = Math.floor(hour);
    const m = hour % 1 === 0.5 ? 30 : 0;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  isFreeSlot(hourBooking: HourBooking): boolean {
    return hourBooking.bookings.length === 0;
  }

  cellClass(hourBooking: HourBooking): string {
    return hourBooking.bookings.length > 0 ? 'cell--occupied' : 'cell--free';
  }

  onSlotClick(van: Location, day: DayCell, hourBooking: HourBooking): void {
    const slotBookings = this.getBookingsForSlot(van.id, day.dateStr, hourBooking.hour);
    if (slotBookings.length > 0) return;

    this.selectedSlot = { dateStr: day.dateStr, hour: hourBooking.hour };

    const h = Math.floor(hourBooking.hour);
    const m = hourBooking.hour % 1 === 0.5 ? 30 : 0;
    const startTime = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

    // Calculate end time: add 30 minutes to start
    const endMinutes = m + 30;
    const endH = h + Math.floor(endMinutes / 60);
    const endM = endMinutes % 60;
    const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;

    this.loadingUsers = true;
    this.availableUsers = null;

    this.userService.available(day.dateStr, startTime, endTime).subscribe({
      next: users => {
        this.availableUsers = users;
        this.loadingUsers = false;
      },
      error: () => { this.loadingUsers = false; },
    });
  }

  selectUser(user: AvailableUser): void {
    if (!this.selectedSlot) return;

    const h = Math.floor(this.selectedSlot.hour);
    const m = this.selectedSlot.hour % 1 === 0.5 ? 30 : 0;
    const startTime = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

    this.dialogRef.close({
      date: this.selectedSlot.dateStr,
      startTime,
      userId: user.id,
      userName: user.name,
    });
  }

  closeSlotSelection(): void {
    this.selectedSlot = null;
    this.availableUsers = null;
  }

  get weekLabel(): string {
    const end = new Date(this.weekStart);
    end.setDate(end.getDate() + 6);
    const fmt = (d: Date) => d.toLocaleDateString('it', { day: '2-digit', month: 'short' });
    return `${fmt(this.weekStart)} – ${fmt(end)} ${end.getFullYear()}`;
  }

  private getMonday(d: Date): Date {
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const m = new Date(d);
    m.setDate(d.getDate() + diff);
    m.setHours(0, 0, 0, 0);
    return m;
  }

  private toDateStr(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
}
