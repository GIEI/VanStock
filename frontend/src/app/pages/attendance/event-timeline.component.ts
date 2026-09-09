import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AttendanceEvent } from '../../core/models/attendance.models';

@Component({
  selector: 'app-event-timeline',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatTooltipModule,
    TranslateModule,
  ],
  template: `
    <div class="timeline" *ngIf="events.length > 0; else emptyTpl">
      <div class="event-row" *ngFor="let e of events" [class.invalid]="e.status !== 'valid'">
        <div class="time-col">
          <div class="date">{{ e.occurred_at | date: 'dd/MM' }}</div>
          <div class="time">{{ e.occurred_at | date: 'HH:mm' }}</div>
        </div>
        <div class="icon-col">
          <mat-icon [style.color]="actionColor(e.detected_action)">
            {{ actionIcon(e.detected_action) }}
          </mat-icon>
        </div>
        <div class="info-col">
          <div class="action-row">
            <span class="action-label">{{ 'ATTENDANCE.ACTION_' + e.detected_action | translate }}</span>
            <mat-icon
              class="source-icon"
              [matTooltip]="('ATTENDANCE.SOURCE_ORIGIN' | translate) + ': ' + e.source"
            >
              {{ sourceIcon(e.source) }}
            </mat-icon>
            <span
              *ngIf="e.source === 'admin'"
              class="badge badge-manual"
            >{{ 'ATTENDANCE.BADGE_MANUAL' | translate }}</span>
            <span
              *ngIf="isAnomalous(e)"
              class="badge badge-anomaly"
            >{{ 'ATTENDANCE.BADGE_ANOMALY' | translate }}</span>
            <span *ngIf="e.status !== 'valid'" class="badge badge-status">
              {{ e.status | uppercase }}
            </span>
          </div>
          <div class="meta-row">
            <span *ngIf="e.user_name">{{ e.user_name }}</span>
            <span *ngIf="e.previous_state && e.resulting_state">
              {{ e.previous_state }} → {{ e.resulting_state }}
            </span>
            <span *ngIf="e.created_by_name">
              {{ 'ATTENDANCE.BY' | translate }}: {{ e.created_by_name }}
            </span>
          </div>
          <div *ngIf="e.notes" class="notes-row">{{ e.notes }}</div>
        </div>
        <div class="actions-col" *ngIf="showActions && e.status === 'valid'">
          <button mat-icon-button (click)="edit.emit(e)" [matTooltip]="'ATTENDANCE.EDIT_TOOLTIP' | translate">
            <mat-icon>edit</mat-icon>
          </button>
          <button
            *ngIf="!isAnomalous(e)"
            mat-icon-button
            color="warn"
            (click)="invalidate.emit(e)"
            [matTooltip]="'ATTENDANCE.DELETE_TOOLTIP' | translate"
          >
            <mat-icon>delete</mat-icon>
          </button>
          <button
            *ngIf="isAnomalous(e)"
            mat-icon-button
            color="warn"
            (click)="dismiss.emit(e)"
            [matTooltip]="'ATTENDANCE.DISMISS_TOOLTIP' | translate"
          >
            <mat-icon>notifications_off</mat-icon>
          </button>
          <button
            *ngIf="isAnomalous(e)"
            mat-icon-button
            color="primary"
            (click)="resolve.emit(e)"
            [matTooltip]="'ATTENDANCE.RESOLVE_TOOLTIP' | translate"
          >
            <mat-icon>check_circle</mat-icon>
          </button>
        </div>
      </div>
    </div>
    <ng-template #emptyTpl>
      <div class="empty-state">{{ 'ATTENDANCE.NO_EVENTS' | translate }}</div>
    </ng-template>
  `,
  styles: [
    `
      .timeline {
        display: flex;
        flex-direction: column;
        gap: 0;
      }
      .event-row {
        display: flex;
        align-items: center;
        padding: 12px 8px;
        border-bottom: 1px solid #eee;
        gap: 14px;
      }
      .event-row.invalid {
        opacity: 0.45;
        text-decoration: line-through;
      }
      .time-col {
        min-width: 70px;
        text-align: center;
      }
      .time-col .date {
        font-size: 11px;
        color: #888;
      }
      .time-col .time {
        font-size: 16px;
        font-weight: 600;
      }
      .icon-col mat-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
      }
      .info-col {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .action-row {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .action-label {
        font-weight: 600;
      }
      .source-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        color: #999;
      }
      .badge {
        padding: 2px 8px;
        border-radius: 6px;
        font-size: 10px;
        font-weight: 700;
      }
      .badge-manual {
        background: #ede4ff;
        color: #6a1b9a;
      }
      .badge-anomaly {
        background: #ffe4e1;
        color: #c62828;
      }
      .badge-status {
        background: #f0f0f0;
        color: #555;
      }
      .meta-row {
        font-size: 12px;
        color: #777;
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }
      .notes-row {
        font-size: 12px;
        color: #555;
        font-style: italic;
        padding: 4px 8px;
        background: #f9f9f9;
        border-radius: 4px;
        margin-top: 4px;
      }
      .actions-col {
        display: flex;
        gap: 4px;
      }
      .empty-state {
        text-align: center;
        padding: 40px;
        color: #999;
      }
    `,
  ],
})
export class EventTimelineComponent {
  @Input() events: AttendanceEvent[] = [];
  @Input() showActions = true;

  @Output() edit = new EventEmitter<AttendanceEvent>();
  @Output() invalidate = new EventEmitter<AttendanceEvent>();
  @Output() resolve = new EventEmitter<AttendanceEvent>();
  @Output() dismiss = new EventEmitter<AttendanceEvent>();

  isAnomalous(e: AttendanceEvent): boolean {
    return (
      e.status === 'valid' &&
      !e.anomaly_dismissed &&
      !!(e.anomaly_type || e.resulting_state === 'PENDING_REVIEW')
    );
  }

  actionIcon(action: string): string {
    return (
      {
        CHECK_IN: 'login',
        CHECK_OUT: 'logout',
        BREAK_START: 'coffee',
        BREAK_END: 'play_arrow',
      } as Record<string, string>
    )[action] || 'help_outline';
  }

  actionColor(action: string): string {
    return (
      {
        CHECK_IN: '#2e7d32',
        CHECK_OUT: '#c62828',
        BREAK_START: '#f57c00',
        BREAK_END: '#1976d2',
      } as Record<string, string>
    )[action] || '#666';
  }

  sourceIcon(source: string): string {
    return (
      {
        mobile: 'phone_iphone',
        web: 'computer',
        admin: 'shield',
      } as Record<string, string>
    )[source] || 'help_outline';
  }
}
