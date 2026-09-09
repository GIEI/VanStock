import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTableModule } from '@angular/material/table';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { AttendanceService } from '../../core/services/attendance.service';
import { UserService } from '../../core/services/user.service';
import {
  AttendanceEvent,
  AttendanceOverrideRequest,
  AttendanceAuditEntry,
  EventsFilters,
} from '../../core/models/attendance.models';
import { User } from '../../core/models/user.model';

import {
  ReasonDialogComponent,
  ReasonDialogData,
  ReasonDialogResult,
} from './reason-dialog.component';
import { EditEventDialogComponent, EditEventDialogResult } from './edit-event-dialog.component';
import { EventTimelineComponent } from './event-timeline.component';
import { AttendanceOverviewComponent } from './attendance-overview.component';

@Component({
  selector: 'app-attendance',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTabsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatSnackBarModule,
    MatDialogModule,
    MatExpansionModule,
    MatTableModule,
    TranslateModule,
    EventTimelineComponent,
    AttendanceOverviewComponent,
  ],
  template: `
    <div class="page">
      <header class="page-header">
        <h1>
          <mat-icon>schedule</mat-icon>
          {{ 'ATTENDANCE.PAGE_TITLE' | translate }}
        </h1>
      </header>

      <mat-tab-group animationDuration="0ms">
        <!-- ── TAB: Panoramica ────────────────────────────────────────── -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon class="tab-icon">dashboard</mat-icon>
            {{ 'ATTENDANCE.OVERVIEW_TAB' | translate }}
          </ng-template>
          <app-attendance-overview [users]="users"></app-attendance-overview>
        </mat-tab>

        <!-- ── TAB: Eventi ─────────────────────────────────────────────── -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon class="tab-icon">timeline</mat-icon>
            {{ 'ATTENDANCE.EVENTS_TAB' | translate }}
          </ng-template>

          <div class="tab-content">
            <mat-card class="filter-card">
              <div class="filters">
                <mat-form-field appearance="outline">
                  <mat-label>{{ 'ATTENDANCE.USER' | translate }}</mat-label>
                  <mat-select [(ngModel)]="eventFilters.user_id" (ngModelChange)="loadEvents()">
                    <mat-option [value]="undefined">{{ 'COMMON.ALL' | translate }}</mat-option>
                    <mat-option *ngFor="let u of users" [value]="u.id">{{ u.name }}</mat-option>
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>{{ 'ATTENDANCE.DATE_FROM' | translate }}</mat-label>
                  <input matInput [matDatepicker]="df" [(ngModel)]="dateFrom" (dateChange)="loadEvents()">
                  <mat-datepicker-toggle matSuffix [for]="df"></mat-datepicker-toggle>
                  <mat-datepicker #df></mat-datepicker>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>{{ 'ATTENDANCE.DATE_TO' | translate }}</mat-label>
                  <input matInput [matDatepicker]="dt" [(ngModel)]="dateTo" (dateChange)="loadEvents()">
                  <mat-datepicker-toggle matSuffix [for]="dt"></mat-datepicker-toggle>
                  <mat-datepicker #dt></mat-datepicker>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>{{ 'ATTENDANCE.STATUS' | translate }}</mat-label>
                  <mat-select [(ngModel)]="eventFilters.status" (ngModelChange)="loadEvents()">
                    <mat-option [value]="undefined">{{ 'COMMON.ALL' | translate }}</mat-option>
                    <mat-option value="valid">Valid</mat-option>
                    <mat-option value="invalid">Invalid</mat-option>
                    <mat-option value="reviewed">Reviewed</mat-option>
                    <mat-option value="superseded">Superseded</mat-option>
                  </mat-select>
                </mat-form-field>

                <button mat-stroked-button (click)="toggleAnomalyFilter()">
                  <mat-icon>{{ eventFilters.anomaly_only ? 'check_box' : 'check_box_outline_blank' }}</mat-icon>
                  {{ 'ATTENDANCE.ANOMALIES_ONLY' | translate }}
                </button>
              </div>
            </mat-card>

            <app-event-timeline
              [events]="events"
              (edit)="onEditEvent($event)"
              (invalidate)="onInvalidateEvent($event)"
              (resolve)="onResolveAnomaly($event)"
              (dismiss)="onDismissAnomaly($event)"
            ></app-event-timeline>
          </div>
        </mat-tab>

        <!-- ── TAB: Anomalie ────────────────────────────────────────────── -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon class="tab-icon">warning_amber</mat-icon>
            {{ 'ATTENDANCE.ANOMALIES_TAB' | translate }}
            <span *ngIf="anomalies.length > 0" class="counter">{{ anomalies.length }}</span>
          </ng-template>

          <div class="tab-content">
            <p class="hint" *ngIf="anomalies.length > 0">
              {{ 'ATTENDANCE.ANOMALIES_DESC' | translate }}
            </p>
            <app-event-timeline
              [events]="anomalies"
              [showActions]="true"
              (resolve)="onResolveAnomaly($event)"
              (edit)="onEditEvent($event)"
              (invalidate)="onInvalidateEvent($event)"
              (dismiss)="onDismissAnomaly($event)"
            ></app-event-timeline>
          </div>
        </mat-tab>

        <!-- ── TAB: Richieste override ───────────────────────────────── -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon class="tab-icon">assignment_late</mat-icon>
            {{ 'ATTENDANCE.REQUESTS_TAB' | translate }}
          </ng-template>

          <div class="tab-content">
            <div class="filter-row">
              <mat-form-field appearance="outline">
                <mat-label>{{ 'ATTENDANCE.STATUS' | translate }}</mat-label>
                <mat-select [(ngModel)]="requestStatusFilter" (ngModelChange)="loadOverrideRequests()">
                  <mat-option [value]="undefined">{{ 'COMMON.ALL' | translate }}</mat-option>
                  <mat-option value="pending">{{ 'BADGE.STATUS_PENDING' | translate }}</mat-option>
                  <mat-option value="approved">{{ 'BADGE.STATUS_APPROVED' | translate }}</mat-option>
                  <mat-option value="rejected">{{ 'BADGE.STATUS_REJECTED' | translate }}</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <div *ngIf="overrideRequests.length === 0" class="empty">
              {{ 'ATTENDANCE.NO_REQUESTS' | translate }}
            </div>

            <mat-card *ngFor="let r of overrideRequests" class="request-card">
              <div class="request-header">
                <div>
                  <strong>{{ r.user_name || ('User #' + r.user_id) }}</strong>
                  <span class="request-action">{{ 'ATTENDANCE.ACTION_' + r.requested_action | translate }}</span>
                  <span class="request-time">
                    {{ r.requested_at | date: 'dd/MM/yyyy HH:mm' }}
                  </span>
                </div>
                <span class="status-chip" [ngClass]="'status-' + r.status">
                  {{ 'BADGE.STATUS_' + r.status.toUpperCase() | translate }}
                </span>
              </div>
              <div class="request-reason">{{ r.reason }}</div>
              <div *ngIf="r.review_notes" class="review-notes">
                <strong>{{ 'ATTENDANCE.REVIEW_NOTES' | translate }}:</strong> {{ r.review_notes }}
              </div>
              <div class="request-actions" *ngIf="r.status === 'pending'">
                <button mat-stroked-button color="warn" (click)="onReviewRequest(r, 'reject')">
                  <mat-icon>close</mat-icon> {{ 'ATTENDANCE.REJECT_BTN' | translate }}
                </button>
                <button mat-flat-button color="primary" (click)="onReviewRequest(r, 'approve')">
                  <mat-icon>check</mat-icon> {{ 'ATTENDANCE.APPROVE_BTN' | translate }}
                </button>
              </div>
            </mat-card>
          </div>
        </mat-tab>

        <!-- ── TAB: Audit log ─────────────────────────────────────────── -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon class="tab-icon">history_edu</mat-icon>
            {{ 'ATTENDANCE.AUDIT_TAB' | translate }}
          </ng-template>

          <div class="tab-content">
            <p class="hint">{{ 'ATTENDANCE.AUDIT_DESC' | translate }}</p>
            <table mat-table [dataSource]="auditLog" class="full-width audit-table">
              <ng-container matColumnDef="when">
                <th mat-header-cell *matHeaderCellDef>{{ 'ATTENDANCE.AUDIT_WHEN' | translate }}</th>
                <td mat-cell *matCellDef="let row">{{ row.created_at | date: 'dd/MM/yy HH:mm' }}</td>
              </ng-container>
              <ng-container matColumnDef="admin">
                <th mat-header-cell *matHeaderCellDef>Admin</th>
                <td mat-cell *matCellDef="let row">{{ row.admin_name || ('#' + row.admin_id) }}</td>
              </ng-container>
              <ng-container matColumnDef="action">
                <th mat-header-cell *matHeaderCellDef>{{ 'ATTENDANCE.AUDIT_ACTION' | translate }}</th>
                <td mat-cell *matCellDef="let row">
                  <span class="audit-action">{{ row.action }}</span>
                  <span *ngIf="row.attendance_event_id" class="audit-event-ref">
                    {{ 'ATTENDANCE.AUDIT_EVENT_REF' | translate }} #{{ row.attendance_event_id }}
                  </span>
                </td>
              </ng-container>
              <ng-container matColumnDef="reason">
                <th mat-header-cell *matHeaderCellDef>{{ 'ATTENDANCE.REASON' | translate }}</th>
                <td mat-cell *matCellDef="let row">{{ row.reason }}</td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="auditColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: auditColumns"></tr>
            </table>
            <div *ngIf="auditLog.length === 0" class="empty">
              {{ 'ATTENDANCE.NO_AUDIT' | translate }}
            </div>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [
    `
      .page {
        padding: 16px;
      }
      .page-header h1 {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .tab-icon {
        margin-right: 6px;
      }
      .tab-content {
        padding: 16px;
      }
      .filter-card {
        margin-bottom: 16px;
      }
      .filters {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        align-items: center;
      }
      .filter-row {
        margin-bottom: 12px;
      }
      .counter {
        margin-left: 6px;
        background: #f44336;
        color: white;
        border-radius: 10px;
        padding: 0 6px;
        font-size: 11px;
        font-weight: 700;
      }
      .empty {
        text-align: center;
        padding: 40px;
        color: #999;
      }
      .hint {
        color: #555;
        font-size: 13px;
        margin: 0 0 12px;
      }
      .request-card {
        margin-bottom: 12px;
        padding: 12px;
      }
      .request-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }
      .request-action {
        margin-left: 12px;
        color: #555;
        font-weight: 500;
      }
      .request-time {
        margin-left: 12px;
        color: #999;
        font-size: 13px;
      }
      .request-reason {
        font-size: 14px;
        color: #333;
        margin-bottom: 8px;
      }
      .review-notes {
        font-size: 13px;
        color: #555;
        background: #f9f9f9;
        padding: 8px;
        border-radius: 4px;
        margin-bottom: 8px;
      }
      .request-actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
      }
      .status-chip {
        padding: 4px 10px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 700;
      }
      .status-pending {
        background: #fff3e0;
        color: #e65100;
      }
      .status-approved {
        background: #e8f5e9;
        color: #2e7d32;
      }
      .status-rejected {
        background: #ffebee;
        color: #c62828;
      }
      .audit-table {
        background: white;
      }
      .audit-action {
        font-weight: 700;
        color: #1976d2;
      }
      .audit-event-ref {
        margin-left: 8px;
        font-size: 11px;
        color: #888;
      }
      .full-width {
        width: 100%;
      }
    `,
  ],
})
export class AttendanceComponent implements OnInit {
  users: User[] = [];

  // Tab 1: events
  events: AttendanceEvent[] = [];
  eventFilters: EventsFilters = {};
  dateFrom?: Date;
  dateTo?: Date;

  // Tab 2: anomalies
  anomalies: AttendanceEvent[] = [];

  // Tab 3: override requests
  overrideRequests: AttendanceOverrideRequest[] = [];
  requestStatusFilter?: string;

  // Tab 4: audit log
  auditLog: AttendanceAuditEntry[] = [];
  auditColumns = ['when', 'admin', 'action', 'reason'];

  constructor(
    private attendance: AttendanceService,
    private userService: UserService,
    private dialog: MatDialog,
    private snack: MatSnackBar,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.userService.list().subscribe((users) => (this.users = users.filter(u => u.role !== 'admin')));
    this.loadEvents();
    this.loadAnomalies();
    this.loadOverrideRequests();
    this.loadAuditLog();
  }

  loadEvents(): void {
    const filters: EventsFilters = { ...this.eventFilters };
    if (this.dateFrom) filters.date_from = this.dateFrom.toISOString();
    if (this.dateTo) filters.date_to = this.dateTo.toISOString();
    this.attendance.listEvents(filters).subscribe((rows) => (this.events = rows));
  }

  toggleAnomalyFilter(): void {
    this.eventFilters.anomaly_only = !this.eventFilters.anomaly_only;
    this.loadEvents();
  }

  loadAnomalies(): void {
    this.attendance.listAnomalies().subscribe((rows) => (this.anomalies = rows));
  }

  loadOverrideRequests(): void {
    this.attendance.listOverrideRequests(this.requestStatusFilter).subscribe(
      (rows) => (this.overrideRequests = rows),
    );
  }

  loadAuditLog(): void {
    this.attendance.listAuditLog().subscribe((rows) => (this.auditLog = rows));
  }

  // ── Event actions ──────────────────────────────────────────────────────

  onEditEvent(event: AttendanceEvent): void {
    const ref = this.dialog.open<EditEventDialogComponent, AttendanceEvent, EditEventDialogResult>(
      EditEventDialogComponent,
      { data: event, width: '500px' },
    );
    ref.afterClosed().subscribe((result) => {
      if (!result) return;
      this.attendance
        .updateEvent(event.id, {
          occurred_at: result.occurred_at,
          detected_action: result.detected_action,
          notes: result.notes,
          reason: result.reason,
        })
        .subscribe({
          next: () => {
            this.snack.open(this.translate.instant('ATTENDANCE.EVENT_UPDATED'), 'OK', { duration: 3000 });
            this.refreshAll();
          },
          error: (err) =>
            this.snack.open(
              err?.error?.error || this.translate.instant('ATTENDANCE.EVENT_UPDATE_ERROR'),
              'OK',
              { duration: 4000 },
            ),
        });
    });
  }

  onInvalidateEvent(event: AttendanceEvent): void {
    const ref = this.dialog.open<ReasonDialogComponent, ReasonDialogData, ReasonDialogResult>(
      ReasonDialogComponent,
      {
        data: {
          title: this.translate.instant('ATTENDANCE.DELETE_EVENT_TITLE'),
          description: this.translate.instant('ATTENDANCE.DELETE_EVENT_DESC'),
        },
        width: '500px',
      },
    );
    ref.afterClosed().subscribe((result) => {
      if (!result) return;
      this.attendance.deleteEvent(event.id, result.reason).subscribe({
        next: () => {
          this.snack.open(this.translate.instant('ATTENDANCE.EVENT_DELETED'), 'OK', { duration: 3000 });
          this.refreshAll();
        },
        error: (err) =>
          this.snack.open(
            err?.error?.error || this.translate.instant('ATTENDANCE.EVENT_DELETE_ERROR'),
            'OK',
            { duration: 4000 },
          ),
      });
    });
  }

  onResolveAnomaly(event: AttendanceEvent): void {
    const ref = this.dialog.open<ReasonDialogComponent, ReasonDialogData, ReasonDialogResult>(
      ReasonDialogComponent,
      {
        data: {
          title: this.translate.instant('ATTENDANCE.RESOLVE_ANOMALY_TITLE'),
          description: this.translate.instant('ATTENDANCE.RESOLVE_ANOMALY_DESC'),
          statusOptions: [
            { value: 'reviewed', label: this.translate.instant('ATTENDANCE.STATUS_REVIEWED') },
            { value: 'invalid', label: this.translate.instant('ATTENDANCE.STATUS_INVALID_LABEL') },
          ],
          initialStatus: 'reviewed',
        },
        width: '500px',
      },
    );
    ref.afterClosed().subscribe((result) => {
      if (!result) return;
      this.attendance
        .resolveAnomaly(event.id, {
          reason: result.reason,
          new_status: result.newStatus,
        })
        .subscribe({
          next: () => {
            this.snack.open(this.translate.instant('ATTENDANCE.ANOMALY_RESOLVED'), 'OK', { duration: 3000 });
            this.refreshAll();
          },
          error: (err) =>
            this.snack.open(
              err?.error?.error || this.translate.instant('ATTENDANCE.ANOMALY_RESOLVE_ERROR'),
              'OK',
              { duration: 4000 },
            ),
        });
    });
  }

  onDismissAnomaly(event: AttendanceEvent): void {
    const ref = this.dialog.open<ReasonDialogComponent, ReasonDialogData, ReasonDialogResult>(
      ReasonDialogComponent,
      {
        data: {
          title: this.translate.instant('ATTENDANCE.DISMISS_ANOMALY_TITLE'),
          description: this.translate.instant('ATTENDANCE.DISMISS_ANOMALY_DESC'),
        },
        width: '500px',
      },
    );
    ref.afterClosed().subscribe((result) => {
      if (!result) return;
      this.attendance.dismissAnomaly(event.id, { reason: result.reason }).subscribe({
        next: () => {
          this.snack.open(this.translate.instant('ATTENDANCE.ANOMALY_DISMISSED'), 'OK', { duration: 3000 });
          this.refreshAll();
        },
        error: (err) =>
          this.snack.open(
            err?.error?.error || this.translate.instant('ATTENDANCE.ANOMALY_DISMISS_ERROR'),
            'OK',
            { duration: 4000 },
          ),
      });
    });
  }

  // ── Override request actions ──────────────────────────────────────────

  onReviewRequest(request: AttendanceOverrideRequest, decision: 'approve' | 'reject'): void {
    const ref = this.dialog.open<ReasonDialogComponent, ReasonDialogData, ReasonDialogResult>(
      ReasonDialogComponent,
      {
        data: {
          title: this.translate.instant(
            decision === 'approve' ? 'ATTENDANCE.APPROVE_REQUEST_TITLE' : 'ATTENDANCE.REJECT_REQUEST_TITLE',
          ),
          description: this.translate.instant(
            decision === 'approve' ? 'ATTENDANCE.APPROVE_REQUEST_DESC' : 'ATTENDANCE.REJECT_REQUEST_DESC',
          ),
        },
        width: '500px',
      },
    );
    ref.afterClosed().subscribe((result) => {
      if (!result) return;
      this.attendance
        .reviewOverrideRequest(request.id, {
          decision,
          review_notes: result.reason,
        })
        .subscribe({
          next: () => {
            this.snack.open(
              this.translate.instant(
                decision === 'approve' ? 'ATTENDANCE.REQUEST_APPROVED' : 'ATTENDANCE.REQUEST_REJECTED',
              ),
              'OK',
              { duration: 3000 },
            );
            this.refreshAll();
          },
          error: (err) =>
            this.snack.open(
              err?.error?.error || this.translate.instant('ATTENDANCE.REQUEST_REVIEW_ERROR'),
              'OK',
              { duration: 4000 },
            ),
        });
    });
  }

  refreshAll(): void {
    this.loadEvents();
    this.loadAnomalies();
    this.loadOverrideRequests();
    this.loadAuditLog();
  }
}
