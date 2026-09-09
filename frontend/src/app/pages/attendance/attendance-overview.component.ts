import {
  Component,
  OnInit,
  OnDestroy,
  Input,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { interval, Subscription } from 'rxjs';
import { AttendanceService } from '../../core/services/attendance.service';
import { AttendanceEvent, AttendanceState } from '../../core/models/attendance.models';
import { User } from '../../core/models/user.model';
import { UserService } from '../../core/services/user.service';
import { SystemService } from '../../core/services/system.service';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TimelineSegment {
  startMinutes: number; // minutes from 00:00
  endMinutes: number;
  state: AttendanceState | 'absent';
}

interface EmployeeRow {
  userId: number;
  name: string;
  initials: string;
  avatarColor: string;
  liveState: AttendanceState | 'absent';
  firstEntry?: string;
  lastExit?: string;
  workedMinutes: number;
  breakMinutes: number;
  anomaliesCount: number;
  segments: TimelineSegment[];
  isLate: boolean;
  morningLateMin?: number;
  afternoonLateMin?: number;
}

interface KPI {
  label: string;
  value: number;
  icon: string;
  color: string;
  bgColor: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TIMELINE_START = 6 * 60;   // 06:00
const TIMELINE_END   = 22 * 60;  // 22:00
const TIMELINE_RANGE = TIMELINE_END - TIMELINE_START; // 960 min
const DEFAULT_MORNING_LATE   = 9 * 60 + 10;  // 09:10
const DEFAULT_AFTERNOON_LATE = 14 * 60 + 10; // 14:10
const DEFAULT_AFTERNOON_START = 13 * 60 + 31; // 13:31

function hhmmToMinutes(s: string): number {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
}

const AVATAR_COLORS = [
  '#6366f1','#8b5cf6','#ec4899','#14b8a6','#f59e0b',
  '#10b981','#3b82f6','#ef4444','#f97316','#06b6d4',
];

function toMinutes(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

function pct(minutes: number): number {
  const clamped = Math.max(TIMELINE_START, Math.min(TIMELINE_END, minutes));
  return ((clamped - TIMELINE_START) / TIMELINE_RANGE) * 100;
}

function formatMinutes(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${h}h ${min.toString().padStart(2, '0')}m`;
}

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('');
}

// ─── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-attendance-overview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatTooltipModule, TranslateModule],
  template: `
<div class="ov-root">

  <!-- ── Toolbar ──────────────────────────────────────────────────────── -->
  <div class="ov-toolbar">
    <div class="ov-toolbar-left">
      <span class="ov-date">{{ selectedDate | date:'EEEE d MMMM yyyy' : '' : translate.currentLang }}</span>
      <input type="date" class="ov-date-input" [(ngModel)]="selectedDateStr" (ngModelChange)="onDateChange()" />
    </div>
    <div class="ov-toolbar-right">
      <div class="ov-search">
        <mat-icon>search</mat-icon>
        <input [placeholder]="'ATTENDANCE.OV_SEARCH_PLACEHOLDER' | translate" [(ngModel)]="searchQuery" (ngModelChange)="applyFilters()" />
      </div>
      <select class="ov-select" [(ngModel)]="filterState" (ngModelChange)="applyFilters()">
        <option value="">{{ 'ATTENDANCE.OV_ALL_STATES' | translate }}</option>
        <option value="IN">{{ 'ATTENDANCE.OV_STATE_IN' | translate }}</option>
        <option value="BREAK">{{ 'ATTENDANCE.OV_STATE_BREAK' | translate }}</option>
        <option value="OUT">{{ 'ATTENDANCE.OV_STATE_OUT' | translate }}</option>
        <option value="absent">{{ 'ATTENDANCE.OV_STATE_ABSENT' | translate }}</option>
      </select>
      <button class="ov-btn ov-btn-ghost" (click)="load()">
        <mat-icon>refresh</mat-icon> {{ 'ATTENDANCE.OV_REFRESH' | translate }}
      </button>
      <button class="ov-btn ov-btn-primary" (click)="exportCSV()">
        <mat-icon>download</mat-icon> {{ 'ATTENDANCE.OV_EXPORT' | translate }}
      </button>
    </div>
  </div>

  <!-- ── KPI Cards ─────────────────────────────────────────────────────── -->
  <div class="ov-kpis">
    <div class="ov-kpi-card" *ngFor="let k of kpis">
      <div class="ov-kpi-icon" [style.background]="k.bgColor" [style.color]="k.color">
        <mat-icon>{{ k.icon }}</mat-icon>
      </div>
      <div class="ov-kpi-body">
        <div class="ov-kpi-value" [style.color]="k.color">{{ k.value }}</div>
        <div class="ov-kpi-label">{{ k.label }}</div>
      </div>
    </div>
  </div>

  <!-- ── Loading ───────────────────────────────────────────────────────── -->
  <div *ngIf="loading" class="ov-loading">
    <mat-icon class="spin">autorenew</mat-icon> {{ 'ATTENDANCE.OV_LOADING' | translate }}
  </div>

  <!-- ── Empty ─────────────────────────────────────────────────────────── -->
  <div *ngIf="!loading && filtered.length === 0" class="ov-empty">
    <mat-icon>people_outline</mat-icon>
    <p>{{ 'ATTENDANCE.OV_EMPTY' | translate }}</p>
  </div>

  <!-- ── Timeline Table ────────────────────────────────────────────────── -->
  <div class="ov-table-wrap" *ngIf="!loading && filtered.length > 0">
    <table class="ov-table">
      <thead>
        <tr>
          <th class="col-user">{{ 'ATTENDANCE.OV_COL_EMPLOYEE' | translate }}</th>
          <th class="col-state">{{ 'ATTENDANCE.OV_COL_STATUS' | translate }}</th>
          <th class="col-entry">{{ 'ATTENDANCE.OV_COL_FIRST_PUNCH' | translate }}</th>
          <th class="col-timeline">
            <div class="tl-header">
              <span *ngFor="let h of timelineHours" class="tl-hour">{{ h }}</span>
            </div>
          </th>
          <th class="col-hours">{{ 'ATTENDANCE.OV_COL_HOURS' | translate }}</th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let emp of filtered" class="ov-row" [class.ov-row-late]="emp.isLate">
          <!-- Avatar + Name -->
          <td class="col-user">
            <div class="emp-cell">
              <div class="emp-avatar" [style.background]="emp.avatarColor">{{ emp.initials }}</div>
              <div class="emp-info">
                <div class="emp-name">{{ emp.name }}</div>
                <div class="emp-anomaly" *ngIf="emp.anomaliesCount > 0">
                  <mat-icon>warning_amber</mat-icon>
                  {{ emp.anomaliesCount }} {{ (emp.anomaliesCount === 1 ? 'ATTENDANCE.OV_ANOMALY_LABEL' : 'ATTENDANCE.OV_ANOMALY_LABEL_PLURAL') | translate }}
                </div>
              </div>
            </div>
          </td>

          <!-- Live state badge -->
          <td class="col-state">
            <span class="state-badge" [ngClass]="'badge-' + emp.liveState">
              {{ stateLabel(emp.liveState) }}
            </span>
          </td>

          <!-- First entry -->
          <td class="col-entry">
            <span *ngIf="emp.firstEntry" [class.late-time]="emp.isLate">
              {{ emp.firstEntry | date:'HH:mm' }}
              <mat-icon *ngIf="emp.isLate" class="late-icon" [matTooltip]="lateTooltip(emp)">schedule</mat-icon>
            </span>
            <span *ngIf="!emp.firstEntry" class="no-entry">–</span>
          </td>

          <!-- Timeline bar -->
          <td class="col-timeline">
            <div class="tl-track">
              <!-- Current time indicator -->
              <div class="tl-now" [style.left.%]="nowPct" *ngIf="isToday"></div>

              <!-- Segments -->
              <div
                *ngFor="let seg of emp.segments"
                class="tl-seg"
                [ngClass]="'seg-' + seg.state"
                [style.left.%]="pct(seg.startMinutes)"
                [style.width.%]="pct(seg.endMinutes) - pct(seg.startMinutes)"
                [matTooltip]="segTooltip(seg)"
              ></div>
            </div>
          </td>

          <!-- Worked hours -->
          <td class="col-hours">
            <span class="hours-val" *ngIf="emp.workedMinutes > 0">{{ formatMin(emp.workedMinutes) }}</span>
            <span class="hours-none" *ngIf="emp.workedMinutes === 0">0h 00m</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- ── Anomaly sidebar feed ──────────────────────────────────────────── -->
  <div class="ov-alerts" *ngIf="alertRows.length > 0">
    <div class="ov-alerts-title">
      <mat-icon>notifications_active</mat-icon> {{ 'ATTENDANCE.OV_ALERT_TITLE' | translate }}
    </div>
    <div class="ov-alert-item" *ngFor="let a of alertRows">
      <div class="oa-icon" [ngClass]="'oa-' + a.type">
        <mat-icon>{{ a.icon }}</mat-icon>
      </div>
      <div class="oa-body">
        <div class="oa-name">{{ a.name }}</div>
        <div class="oa-msg">{{ a.message }}</div>
      </div>
    </div>
  </div>

</div>
  `,
  styles: [`
    :host { display: block; }

    /* ── Root ─────────────────────────────────────────────────────────── */
    .ov-root {
      padding: 20px 24px;
      background: #f8f9fc;
      min-height: 100%;
      font-family: 'Inter', 'Roboto', sans-serif;
    }

    /* ── Toolbar ──────────────────────────────────────────────────────── */
    .ov-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 20px;
    }
    .ov-toolbar-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .ov-date {
      font-size: 15px;
      font-weight: 600;
      color: #1e293b;
      text-transform: capitalize;
    }
    .ov-date-input {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 6px 10px;
      font-size: 13px;
      color: #475569;
      background: white;
      cursor: pointer;
      outline: none;
    }
    .ov-date-input:focus { border-color: #6366f1; }
    .ov-toolbar-right {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .ov-search {
      display: flex;
      align-items: center;
      gap: 6px;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 6px 12px;
    }
    .ov-search mat-icon { font-size: 18px; color: #94a3b8; }
    .ov-search input {
      border: none; outline: none; font-size: 13px;
      color: #1e293b; background: transparent; width: 180px;
    }
    .ov-select {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 7px 12px;
      font-size: 13px;
      color: #475569;
      background: white;
      cursor: pointer;
      outline: none;
    }
    .ov-btn {
      display: flex;
      align-items: center;
      gap: 4px;
      border: none;
      border-radius: 8px;
      padding: 8px 14px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s;
    }
    .ov-btn mat-icon { font-size: 17px; }
    .ov-btn-ghost {
      background: white;
      border: 1px solid #e2e8f0;
      color: #475569;
    }
    .ov-btn-ghost:hover { background: #f1f5f9; }
    .ov-btn-primary {
      background: #6366f1;
      color: white;
    }
    .ov-btn-primary:hover { background: #4f46e5; }

    /* ── KPI Cards ────────────────────────────────────────────────────── */
    .ov-kpis {
      display: flex;
      gap: 14px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }
    .ov-kpi-card {
      flex: 1;
      min-width: 140px;
      background: white;
      border-radius: 14px;
      padding: 16px 18px;
      display: flex;
      align-items: center;
      gap: 14px;
      box-shadow: 0 1px 3px rgba(0,0,0,.06);
    }
    .ov-kpi-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .ov-kpi-icon mat-icon { font-size: 22px; }
    .ov-kpi-value {
      font-size: 26px;
      font-weight: 700;
      line-height: 1;
    }
    .ov-kpi-label {
      font-size: 12px;
      color: #94a3b8;
      margin-top: 2px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: .3px;
    }

    /* ── Table wrap ───────────────────────────────────────────────────── */
    .ov-table-wrap {
      background: white;
      border-radius: 16px;
      box-shadow: 0 1px 4px rgba(0,0,0,.07);
      overflow: auto;
    }
    .ov-table {
      width: 100%;
      border-collapse: collapse;
      min-width: 900px;
    }
    .ov-table thead th {
      padding: 12px 14px;
      text-align: left;
      font-size: 11px;
      font-weight: 600;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: .5px;
      border-bottom: 1px solid #f1f5f9;
      background: white;
      position: sticky;
      top: 0;
      z-index: 2;
    }
    .ov-table tbody tr {
      border-bottom: 1px solid #f8fafc;
      transition: background 0.1s;
    }
    .ov-table tbody tr:hover { background: #fafbff; }
    .ov-table td {
      padding: 12px 14px;
      vertical-align: middle;
    }
    .ov-row-late { background: #fffbeb !important; }
    .ov-row-late:hover { background: #fef3c7 !important; }

    /* Column widths */
    .col-user      { width: 220px; }
    .col-state     { width: 120px; }
    .col-entry     { width: 130px; }
    .col-timeline  { min-width: 360px; }
    .col-hours     { width: 110px; text-align: right; }

    /* ── Employee cell ────────────────────────────────────────────────── */
    .emp-cell { display: flex; align-items: center; gap: 10px; }
    .emp-avatar {
      width: 34px; height: 34px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 700; color: white;
      flex-shrink: 0;
    }
    .emp-name { font-size: 13px; font-weight: 600; color: #1e293b; }
    .emp-anomaly {
      display: flex; align-items: center; gap: 3px;
      font-size: 11px; color: #f59e0b; font-weight: 500; margin-top: 2px;
    }
    .emp-anomaly mat-icon { font-size: 13px; }

    /* ── State badge ──────────────────────────────────────────────────── */
    .state-badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: .3px;
    }
    .badge-IN      { background: #dcfce7; color: #16a34a; }
    .badge-BREAK   { background: #fef9c3; color: #ca8a04; }
    .badge-OUT     { background: #f1f5f9; color: #64748b; }
    .badge-absent  { background: #fee2e2; color: #dc2626; }
    .badge-PENDING_REVIEW { background: #fef3c7; color: #d97706; }
    .badge-LOCKED  { background: #f3e8ff; color: #9333ea; }

    /* ── Entry column ─────────────────────────────────────────────────── */
    .col-entry span {
      display: flex; align-items: center; gap: 4px;
      font-size: 13px; font-weight: 500; color: #475569;
    }
    .late-time { color: #f59e0b !important; }
    .late-icon { font-size: 15px !important; color: #f59e0b; }
    .no-entry { color: #cbd5e1; font-size: 13px; }

    /* ── Timeline ─────────────────────────────────────────────────────── */
    .tl-header {
      display: flex;
      justify-content: space-between;
      padding: 0 0 4px;
    }
    .tl-hour { font-size: 10px; color: #94a3b8; font-weight: 500; }
    .tl-track {
      position: relative;
      height: 10px;
      background: #f1f5f9;
      border-radius: 8px;
      overflow: visible;
    }
    .tl-now {
      position: absolute;
      top: -4px;
      bottom: -4px;
      width: 2px;
      background: #6366f1;
      border-radius: 2px;
      z-index: 3;
    }
    .tl-seg {
      position: absolute;
      height: 100%;
      border-radius: 4px;
      min-width: 2px;
      cursor: default;
      transition: opacity 0.15s;
    }
    .tl-seg:hover { opacity: .8; filter: brightness(1.05); }
    .seg-IN      { background: #22c55e; }
    .seg-BREAK   { background: #eab308; }
    .seg-OUT     { background: #94a3b8; }
    .seg-absent  { background: #fca5a5; }
    .seg-PENDING_REVIEW { background: #fbbf24; }
    .seg-LOCKED  { background: #c084fc; }

    /* ── Hours column ─────────────────────────────────────────────────── */
    .hours-val  { font-size: 13px; font-weight: 600; color: #1e293b; }
    .hours-none { font-size: 13px; color: #cbd5e1; }

    /* ── Loading / empty ──────────────────────────────────────────────── */
    .ov-loading {
      display: flex; align-items: center; gap: 8px;
      justify-content: center; padding: 60px; color: #94a3b8;
    }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .ov-empty {
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      padding: 60px; color: #94a3b8;
    }
    .ov-empty mat-icon { font-size: 40px; }

    /* ── Alert sidebar feed ───────────────────────────────────────────── */
    .ov-alerts {
      margin-top: 20px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 1px 4px rgba(0,0,0,.07);
      padding: 16px;
    }
    .ov-alerts-title {
      display: flex; align-items: center; gap: 6px;
      font-size: 13px; font-weight: 700; color: #1e293b;
      margin-bottom: 12px;
    }
    .ov-alert-item {
      display: flex; align-items: flex-start; gap: 10px;
      padding: 10px 0; border-bottom: 1px solid #f8fafc;
    }
    .ov-alert-item:last-child { border-bottom: none; }
    .oa-icon {
      width: 30px; height: 30px; border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .oa-icon mat-icon { font-size: 16px; }
    .oa-late    { background: #fef3c7; color: #d97706; }
    .oa-anomaly { background: #fee2e2; color: #dc2626; }
    .oa-break   { background: #fff7ed; color: #ea580c; }
    .oa-name { font-size: 13px; font-weight: 600; color: #1e293b; }
    .oa-msg  { font-size: 12px; color: #94a3b8; margin-top: 2px; }
  `],
})
export class AttendanceOverviewComponent implements OnInit, OnDestroy {
  @Input() users: User[] = [];

  loading = true;
  selectedDate = new Date();
  selectedDateStr = this.toDateStr(new Date());
  searchQuery = '';
  filterState = '';
  isToday = true;

  rows: EmployeeRow[] = [];
  filtered: EmployeeRow[] = [];
  kpis: KPI[] = [];
  alertRows: { type: string; icon: string; name: string; message: string }[] = [];

  readonly timelineHours = ['06:00','08:00','10:00','12:00','14:00','16:00','18:00','20:00','22:00'];
  nowPct = 0;

  private refreshSub?: Subscription;

  private morningLateMin    = DEFAULT_MORNING_LATE;
  private afternoonLateMin  = DEFAULT_AFTERNOON_LATE;
  private afternoonStartMin = DEFAULT_AFTERNOON_START;

  constructor(
    private attendance: AttendanceService,
    private userService: UserService,
    private system: SystemService,
    private cdr: ChangeDetectorRef,
    public translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.updateNowPct();
    this.system.getWorkShifts().subscribe(s => {
      this.morningLateMin    = hhmmToMinutes(s.morning_late_threshold);
      this.afternoonLateMin  = hhmmToMinutes(s.afternoon_late_threshold);
      this.afternoonStartMin = hhmmToMinutes(s.afternoon_start);
      // Recompute if rows already loaded
      if (this.rows.length) this.load();
    });
    this.load();
    // Auto-refresh every 60 seconds
    this.refreshSub = interval(60_000).subscribe(() => {
      this.updateNowPct();
      if (this.isToday) this.load();
    });
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  // ── Public helpers (used in template) ───────────────────────────────────

  pct(minutes: number): number { return pct(minutes); }
  formatMin(m: number): string { return formatMinutes(m); }

  stateLabel(state: string): string {
    const keyMap: Record<string, string> = {
      IN: 'ATTENDANCE.OV_STATE_PRESENT',
      BREAK: 'ATTENDANCE.OV_STATE_BREAK',
      OUT: 'ATTENDANCE.OV_STATE_OUT_LABEL',
      absent: 'ATTENDANCE.OV_STATE_ABSENT',
      PENDING_REVIEW: 'ATTENDANCE.OV_STATE_PENDING',
      LOCKED: 'ATTENDANCE.OV_STATE_LOCKED',
    };
    return this.translate.instant(keyMap[state] ?? state);
  }

  lateTooltip(emp: EmployeeRow): string {
    const t = (key: string) => this.translate.instant(key);
    const parts: string[] = [];
    if (emp.morningLateMin)   parts.push(`${t('ATTENDANCE.OV_LATE_MORNING')} +${emp.morningLateMin}min`);
    if (emp.afternoonLateMin) parts.push(`${t('ATTENDANCE.OV_LATE_AFTERNOON')} +${emp.afternoonLateMin}min`);
    return `${t('ATTENDANCE.OV_LATE_PREFIX')}: ${parts.join(', ')}`;
  }

  segTooltip(seg: TimelineSegment): string {
    const fmt = (m: number) => {
      const h = Math.floor(m / 60).toString().padStart(2, '0');
      const min = (m % 60).toString().padStart(2, '0');
      return `${h}:${min}`;
    };
    const dur = seg.endMinutes - seg.startMinutes;
    return `${fmt(seg.startMinutes)} → ${fmt(seg.endMinutes)}  (${formatMinutes(dur)})`;
  }

  // ── Date handling ────────────────────────────────────────────────────────

  onDateChange(): void {
    this.selectedDate = new Date(this.selectedDateStr);
    const today = this.toDateStr(new Date());
    this.isToday = this.selectedDateStr === today;
    this.load();
  }

  private toDateStr(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  // ── Data loading ─────────────────────────────────────────────────────────

  load(): void {
    this.loading = true;
    const dayStart = new Date(this.selectedDateStr + 'T00:00:00');
    const dayEnd   = new Date(this.selectedDateStr + 'T23:59:59');

    this.attendance.listEvents({
      date_from: dayStart.toISOString(),
      date_to:   dayEnd.toISOString(),
    }).subscribe({
      next: (events) => {
        // Also ensure we have users loaded
        if (this.users.length === 0) {
          this.userService.list().subscribe(users => {
            this.users = users;
            this.processEvents(events);
          });
        } else {
          this.processEvents(events);
        }
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  // ── Event processing ─────────────────────────────────────────────────────

  private processEvents(events: AttendanceEvent[]): void {
    // Group valid events by user
    const byUser = new Map<number, AttendanceEvent[]>();
    const userNames = new Map<number, string>();

    for (const ev of events) {
      if (ev.status === 'invalid' || ev.status === 'superseded') continue;
      if (!byUser.has(ev.user_id)) byUser.set(ev.user_id, []);
      byUser.get(ev.user_id)!.push(ev);
      if (ev.user_name) userNames.set(ev.user_id, ev.user_name);
    }

    // Add users who had no events today (absent)
    for (const u of this.users) {
      if (!byUser.has(u.id)) {
        byUser.set(u.id, []);
        userNames.set(u.id, u.name);
      }
    }

    const rows: EmployeeRow[] = [];
    let colorIdx = 0;

    for (const [userId, userEvents] of byUser) {
      const name = userNames.get(userId) ?? `Utente #${userId}`;
      userEvents.sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime());

      const segments = this.buildSegments(userEvents);
      const { workedMinutes, breakMinutes } = this.computeTime(userEvents);
      const liveState = this.computeLiveState(userEvents);
      const anomaliesCount = userEvents.filter(e => !!e.anomaly_type).length;
      const checkIns = userEvents.filter(e => e.detected_action === 'CHECK_IN');
      const firstEntry = checkIns[0]?.occurred_at;
      const lastExit  = [...userEvents].reverse().find(e => e.detected_action === 'CHECK_OUT')?.occurred_at;

      const firstMorning   = checkIns.find(e => toMinutes(e.occurred_at) <  this.afternoonStartMin)?.occurred_at;
      const firstAfternoon = checkIns.find(e => toMinutes(e.occurred_at) >= this.afternoonStartMin)?.occurred_at;
      const morningLateMin   = firstMorning   ? Math.max(0, toMinutes(firstMorning)   - this.morningLateMin)   : 0;
      const afternoonLateMin = firstAfternoon ? Math.max(0, toMinutes(firstAfternoon) - this.afternoonLateMin) : 0;
      const isLate = morningLateMin > 0 || afternoonLateMin > 0;

      rows.push({
        userId,
        name,
        initials: initials(name),
        avatarColor: AVATAR_COLORS[colorIdx++ % AVATAR_COLORS.length],
        liveState,
        firstEntry,
        lastExit,
        workedMinutes,
        breakMinutes,
        anomaliesCount,
        segments,
        isLate,
        morningLateMin:   morningLateMin   > 0 ? morningLateMin   : undefined,
        afternoonLateMin: afternoonLateMin > 0 ? afternoonLateMin : undefined,
      });
    }

    // Sort: IN first, then BREAK, then OUT, then absent
    const order: Record<string, number> = { IN: 0, BREAK: 1, OUT: 2, absent: 3 };
    rows.sort((a, b) => (order[a.liveState] ?? 9) - (order[b.liveState] ?? 9));

    this.rows = rows;
    this.buildKPIs();
    this.buildAlerts();
    this.applyFilters();
    this.loading = false;
    this.cdr.markForCheck();
  }

  private buildSegments(events: AttendanceEvent[]): TimelineSegment[] {
    if (events.length === 0) return [];
    const segs: TimelineSegment[] = [];
    const nowMin = this.isToday
      ? new Date().getHours() * 60 + new Date().getMinutes()
      : TIMELINE_END;

    for (let i = 0; i < events.length; i++) {
      const ev  = events[i];
      const next = events[i + 1];
      const start = toMinutes(ev.occurred_at);
      const end   = next ? toMinutes(next.occurred_at) : (ev.resulting_state === 'IN' || ev.resulting_state === 'BREAK' ? nowMin : start);

      if (end <= start) continue;
      segs.push({
        startMinutes: start,
        endMinutes: end,
        state: ev.resulting_state,
      });
    }
    return segs;
  }

  private computeLiveState(events: AttendanceEvent[]): AttendanceState | 'absent' {
    if (events.length === 0) return 'absent';
    const last = events[events.length - 1];
    return last.resulting_state;
  }

  private computeTime(events: AttendanceEvent[]): { workedMinutes: number; breakMinutes: number } {
    let worked = 0;
    let brk = 0;
    const nowMin = new Date().getHours() * 60 + new Date().getMinutes();

    for (let i = 0; i < events.length; i++) {
      const ev = events[i];
      const next = events[i + 1];
      const start = toMinutes(ev.occurred_at);
      const end   = next ? toMinutes(next.occurred_at) : (this.isToday ? nowMin : start);
      const dur = Math.max(0, end - start);

      if (ev.resulting_state === 'IN') worked += dur;
      else if (ev.resulting_state === 'BREAK') brk += dur;
    }
    return { workedMinutes: worked, breakMinutes: brk };
  }

  private buildKPIs(): void {
    const present  = this.rows.filter(r => r.liveState === 'IN').length;
    const onBreak  = this.rows.filter(r => r.liveState === 'BREAK').length;
    const absent   = this.rows.filter(r => r.liveState === 'absent').length;
    const late     = this.rows.filter(r => r.isLate).length;
    const anomalies = this.rows.reduce((s, r) => s + r.anomaliesCount, 0);

    const t = (key: string) => this.translate.instant(key);
    this.kpis = [
      { label: t('ATTENDANCE.OV_KPI_PRESENT'),   value: present,   icon: 'groups',        color: '#16a34a', bgColor: '#dcfce7' },
      { label: t('ATTENDANCE.OV_KPI_ABSENT'),    value: absent,    icon: 'person_off',    color: '#dc2626', bgColor: '#fee2e2' },
      { label: t('ATTENDANCE.OV_KPI_BREAK'),     value: onBreak,   icon: 'coffee',        color: '#ca8a04', bgColor: '#fef9c3' },
      { label: t('ATTENDANCE.OV_KPI_LATE'),      value: late,      icon: 'schedule',      color: '#ea580c', bgColor: '#ffedd5' },
      { label: t('ATTENDANCE.OV_KPI_ANOMALIES'), value: anomalies, icon: 'warning_amber', color: '#9333ea', bgColor: '#f3e8ff' },
    ];
  }

  private buildAlerts(): void {
    const t = (key: string, params?: Record<string, unknown>) => this.translate.instant(key, params);
    const alerts: typeof this.alertRows = [];
    for (const r of this.rows) {
      if (r.morningLateMin) {
        alerts.push({ type: 'late', icon: 'schedule', name: r.name,
          message: t('ATTENDANCE.OV_LATE_ALERT', { period: t('ATTENDANCE.OV_LATE_MORNING'), min: r.morningLateMin }) });
      }
      if (r.afternoonLateMin) {
        alerts.push({ type: 'late', icon: 'schedule', name: r.name,
          message: t('ATTENDANCE.OV_LATE_ALERT', { period: t('ATTENDANCE.OV_LATE_AFTERNOON'), min: r.afternoonLateMin }) });
      }
      if (r.anomaliesCount > 0) {
        const key = r.anomaliesCount === 1 ? 'ATTENDANCE.OV_ANOMALY_ALERT' : 'ATTENDANCE.OV_ANOMALY_ALERT_PLURAL';
        alerts.push({ type: 'anomaly', icon: 'warning_amber', name: r.name,
          message: t(key, { count: r.anomaliesCount }) });
      }
    }
    for (const r of this.rows) {
      if (r.liveState === 'BREAK' && r.breakMinutes > 30) {
        alerts.push({ type: 'break', icon: 'coffee', name: r.name,
          message: t('ATTENDANCE.OV_BREAK_ALERT', { min: r.breakMinutes }) });
      }
    }
    this.alertRows = alerts.slice(0, 8);
  }

  applyFilters(): void {
    let result = this.rows;
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(r => r.name.toLowerCase().includes(q));
    }
    if (this.filterState) {
      result = result.filter(r => r.liveState === this.filterState);
    }
    this.filtered = result;
  }

  private updateNowPct(): void {
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    this.nowPct = pct(nowMin);
  }

  exportCSV(): void {
    const lang = this.translate.currentLang || 'en';
    const header = this.translate.instant('ATTENDANCE.OV_CSV_HEADER');
    const rows = this.filtered.map(r => [
      r.name,
      this.stateLabel(r.liveState),
      r.firstEntry ? new Date(r.firstEntry).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' }) : '',
      r.lastExit   ? new Date(r.lastExit).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' }) : '',
      formatMinutes(r.workedMinutes),
      r.anomaliesCount,
    ].join(','));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.translate.instant('ATTENDANCE.OV_CSV_FILENAME')}-${this.selectedDateStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
