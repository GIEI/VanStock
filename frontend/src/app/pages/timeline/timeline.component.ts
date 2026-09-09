import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { TranslateModule } from '@ngx-translate/core';
import { TimelineService } from '../../core/services/timeline.service';
import { PhotoUrlPipe } from '../../core/pipes/photo-url.pipe';
import { TimelineTechnician, TimelineJob } from '../../core/models/timeline.model';

// Timeline runs from 07:00 to 20:00 = 780 minutes
const HOUR_START = 7;
const HOUR_END   = 20;
const TOTAL_MIN  = (HOUR_END - HOUR_START) * 60;

export interface TechRow {
  tech: TimelineTechnician;
  lanes: TimelineBar[][];  // each lane is a non-overlapping set of bars
}

export interface TimelineBar {
  job:       TimelineJob;
  left:      number;   // percent
  width:     number;   // percent
  color:     string;   // CSS class
  overflow:  boolean;  // bar extends beyond the visible range
  dayLabel?: string;   // shown in week view
}

@Component({
  selector: 'app-timeline',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatDatepickerModule,
    MatNativeDateModule,
    TranslateModule,
    PhotoUrlPipe,
  ],
  templateUrl: './timeline.component.html',
  styleUrls:   ['./timeline.component.scss'],
})
export class TimelineComponent implements OnInit, OnDestroy {
  loading     = true;
  selectedDate: Date = new Date();
  viewMode: 'day' | 'week' = 'day';
  filterUserId: number | null = null;

  technicians: TimelineTechnician[] = [];
  techRows:    TechRow[]            = [];

  hours: number[] = [];

  // Tooltip state
  tooltipJob: TimelineJob | null = null;
  tooltipX   = 0;
  tooltipY   = 0;

  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private timelineSvc: TimelineService,
    private router:      Router,
    private cdr:         ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.hours = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i);
    this.load();
    this.refreshTimer = setInterval(() => this.load(false), 60_000);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  }

  load(showSpinner = true): void {
    if (showSpinner) this.loading = true;
    const dateStr = this.formatDate(this.selectedDate);
    this.timelineSvc.get({
      date:    dateStr,
      week:    this.viewMode === 'week',
      user_id: this.filterUserId,
    }).subscribe({
      next: resp => {
        this.technicians = resp.technicians;
        this.techRows    = this.buildRows(resp.technicians, resp.jobs, resp.date_from);
        this.loading     = false;
        this.cdr.markForCheck();
      },
      error: () => { this.loading = false; },
    });
  }

  // ── Build TechRow with lane-based overlap resolution ─────────────────────────

  private buildRows(techs: TimelineTechnician[], jobs: TimelineJob[], dateFrom: string): TechRow[] {
    return techs.map(tech => {
      const techJobs = jobs.filter(j => j.assigned_to === tech.id);
      const bars     = techJobs.map(j => this.jobToBar(j, dateFrom));
      const lanes    = this.assignLanes(bars);
      return { tech, lanes };
    });
  }

  private jobToBar(job: TimelineJob, dateFrom: string): TimelineBar {
    const refDate = this.viewMode === 'week'
      ? new Date(dateFrom)
      : new Date(this.selectedDate);
    refDate.setHours(0, 0, 0, 0);

    // Determine start/end times
    let startMs: number;
    let endMs:   number | null = null;

    // The vehicle booking (set when the job is accepted) carries the real
    // planned start/end time of day (e.g. 10:00-11:00); prefer it over
    // started_at, which only reflects the instant the technician tapped "accept".
    const bookingDateBase = job.started_at ? new Date(job.started_at)
      : job.scheduled_date ? new Date(job.scheduled_date)
      : new Date(refDate);
    bookingDateBase.setHours(0, 0, 0, 0);

    if (job.booking_start_time) {
      startMs = this.applyTimeOfDay(bookingDateBase, job.booking_start_time).getTime();
    } else if (job.scheduled_time === 'custom' && job.scheduled_time_custom) {
      startMs = this.applyTimeOfDay(bookingDateBase, job.scheduled_time_custom).getTime();
    } else if (job.started_at) {
      startMs = new Date(job.started_at).getTime();
    } else if (job.scheduled_date) {
      const d = new Date(job.scheduled_date);
      d.setHours(HOUR_START, 0, 0, 0);
      startMs = d.getTime();
    } else {
      const d = new Date(refDate);
      d.setHours(HOUR_START, 0, 0, 0);
      startMs = d.getTime();
    }

    if (job.completed_at) {
      endMs = new Date(job.completed_at).getTime();
    } else if (job.booking_end_time) {
      const plannedEndMs = this.applyTimeOfDay(bookingDateBase, job.booking_end_time).getTime();
      endMs = job.status === 'in_corso' ? Math.max(plannedEndMs, Date.now()) : plannedEndMs;
    } else if (job.status === 'in_corso') {
      endMs = Date.now();  // live bar to current time
    }

    // Calculate position relative to the visible day window
    const dayStart = new Date(startMs);
    dayStart.setHours(HOUR_START, 0, 0, 0);
    const dayEnd   = new Date(startMs);
    dayEnd.setHours(HOUR_END, 0, 0, 0);

    let leftMin   = (startMs - dayStart.getTime()) / 60000;
    let widthMin  = endMs
      ? (endMs - startMs) / 60000
      : 60;   // default 1h for planned jobs

    // For week view, offset X by the day index
    let dayOffsetPercent = 0;
    if (this.viewMode === 'week') {
      const dayIdx    = Math.floor((startMs - refDate.getTime()) / 86400000);
      dayOffsetPercent = (dayIdx / 7) * 100;
    }

    const scale = this.viewMode === 'week' ? TOTAL_MIN * 7 : TOTAL_MIN;
    const left  = dayOffsetPercent + (Math.max(0, leftMin) / scale) * 100;
    const width = Math.max(0.5, (widthMin / scale) * 100);
    const overflow = (left + width) > 100;

    return {
      job,
      left,
      width:    Math.min(width, 100 - left),
      color:    this.statusClass(job),
      overflow,
    };
  }

  /** Returns a new Date at `dateBase`'s day with the "HH:MM" (or "HH:MM:SS") time-of-day applied. */
  private applyTimeOfDay(dateBase: Date, time: string): Date {
    const [h, m] = time.split(':').map(Number);
    const d = new Date(dateBase);
    d.setHours(h, m || 0, 0, 0);
    return d;
  }

  private assignLanes(bars: TimelineBar[]): TimelineBar[][] {
    const lanes: TimelineBar[][] = [];
    for (const bar of bars) {
      let placed = false;
      for (const lane of lanes) {
        const last = lane[lane.length - 1];
        if ((last.left + last.width) <= bar.left + 0.5) {
          lane.push(bar);
          placed = true;
          break;
        }
      }
      if (!placed) lanes.push([bar]);
    }
    return lanes.length ? lanes : [[]];
  }

  // ── Status → CSS color class ──────────────────────────────────────────────────

  statusClass(job: TimelineJob): string {
    if (job.status === 'completato') return 'bar--green';
    if (job.status === 'in_corso') {
      // Check if overtime: started more than 4h ago with no completion
      if (job.started_at) {
        const elapsed = (Date.now() - new Date(job.started_at).getTime()) / 3600000;
        if (elapsed > 4) return 'bar--red';
      }
      return 'bar--orange';
    }
    return 'bar--grey';
  }

  // ── Navigation ────────────────────────────────────────────────────────────────

  prevDay(): void {
    const d = new Date(this.selectedDate);
    d.setDate(d.getDate() - (this.viewMode === 'week' ? 7 : 1));
    this.selectedDate = d;
    this.load();
  }

  nextDay(): void {
    const d = new Date(this.selectedDate);
    d.setDate(d.getDate() + (this.viewMode === 'week' ? 7 : 1));
    this.selectedDate = d;
    this.load();
  }

  today(): void {
    this.selectedDate = new Date();
    this.load();
  }

  onViewModeChange(): void { this.load(); }
  onDateChange():     void { this.load(); }
  onUserFilter():     void { this.load(); }

  // ── Tooltip ───────────────────────────────────────────────────────────────────

  showTooltip(event: MouseEvent, job: TimelineJob): void {
    this.tooltipJob = job;
    this.tooltipX   = event.clientX + 12;
    this.tooltipY   = event.clientY + 12;
  }

  moveTooltip(event: MouseEvent): void {
    this.tooltipX = event.clientX + 12;
    this.tooltipY = event.clientY + 12;
  }

  hideTooltip(): void {
    this.tooltipJob = null;
  }

  // ── Click → job detail ─────────────────────────────────────────────────────

  openJob(job: TimelineJob): void {
    this.router.navigate(['/jobs', job.id]);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  formatDate(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  formatDateLabel(d: Date): string {
    return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  }

  dateLabel(): string {
    if (this.viewMode === 'week') {
      const end = new Date(this.selectedDate);
      end.setDate(end.getDate() + 6);
      return `${this.formatDateLabel(this.selectedDate)} – ${this.formatDateLabel(end)}`;
    }
    return this.formatDateLabel(this.selectedDate);
  }

  hourLabel(h: number): string {
    return `${h.toString().padStart(2, '0')}:00`;
  }

  durationLabel(job: TimelineJob): string {
    if (!job.started_at) return '';
    const end  = job.completed_at ? new Date(job.completed_at) : new Date();
    const mins = Math.round((end.getTime() - new Date(job.started_at).getTime()) / 60000);
    const h    = Math.floor(mins / 60);
    const m    = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  // Returns true if any bar in the row has content (used to skip empty rows)
  rowHasJobs(row: TechRow): boolean {
    return row.lanes.some(lane => lane.length > 0);
  }

  getRowHeight(row: TechRow): number {
    const lanesCount = row.lanes.filter(lane => lane.length > 0).length;
    return Math.max(48, lanesCount * 32 + 8);
  }

  readonly HOUR_START = HOUR_START;
  readonly HOUR_END   = HOUR_END;

  /** Left% for the "now" red line within the day view */
  get nowLineLeft(): number {
    const now   = new Date();
    const mins  = now.getHours() * 60 + now.getMinutes() - HOUR_START * 60;
    return Math.max(0, Math.min(100, (mins / TOTAL_MIN) * 100));
  }
}
