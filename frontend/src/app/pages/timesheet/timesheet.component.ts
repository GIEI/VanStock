import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { BadgeService, Attendance, AttendanceRequest } from '../../core/services/badge.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-timesheet',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSnackBarModule,
    MatChipsModule,
    MatBadgeModule,
    TranslateModule
  ],
  template: `
    <div class="timesheet-container">
      <header class="page-header">
        <h1><mat-icon>timer</mat-icon> {{ 'BADGE.TIMESHEET_TITLE' | translate }}</h1>
      </header>

      <mat-tab-group animationDuration="0ms">
        <!-- ── TAB 1: Attendance List ───────────────────────────────────────── -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon class="tab-icon">list_alt</mat-icon>
            {{ 'BADGE.TAB_RECORDS' | translate }}
          </ng-template>

          <div class="tab-content">
            <mat-card class="filter-card">
              <div class="filters">
                <mat-form-field appearance="outline">
                  <mat-label>{{ 'COMMON.SEARCH' | translate }}</mat-label>
                  <input matInput [(ngModel)]="filters.user_id" placeholder="User ID">
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>{{ 'MOVEMENTS.DATE_FROM' | translate }}</mat-label>
                  <input matInput [matDatepicker]="df" [(ngModel)]="filters.date_from">
                  <mat-datepicker-toggle matSuffix [for]="df"></mat-datepicker-toggle>
                  <mat-datepicker #df></mat-datepicker>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>{{ 'MOVEMENTS.DATE_TO' | translate }}</mat-label>
                  <input matInput [matDatepicker]="dt" [(ngModel)]="filters.date_to">
                  <mat-datepicker-toggle matSuffix [for]="dt"></mat-datepicker-toggle>
                  <mat-datepicker #dt></mat-datepicker>
                </mat-form-field>

                <button mat-flat-button color="primary" (click)="loadTimesheet()">
                  <mat-icon>search</mat-icon> {{ 'COMMON.SEARCH' | translate }}
                </button>
              </div>
            </mat-card>

            <div class="table-wrapper mat-elevation-z2">
              <table mat-table [dataSource]="records" class="full-width">
                <ng-container matColumnDef="user">
                  <th mat-header-cell *matHeaderCellDef>{{ 'USERS.NAME' | translate }}</th>
                  <td mat-cell *matCellDef="let row">
                    <strong>{{ row.user_name }}</strong><br>
                    <small>{{ row.user_email }}</small>
                  </td>
                </ng-container>

                <ng-container matColumnDef="date">
                  <th mat-header-cell *matHeaderCellDef>{{ 'REPORTS.DATE' | translate }}</th>
                  <td mat-cell *matCellDef="let row">{{ row.date | date:'EEE dd/MM/yyyy' }}</td>
                </ng-container>

                <ng-container matColumnDef="morning">
                  <th mat-header-cell *matHeaderCellDef>Mattina</th>
                  <td mat-cell *matCellDef="let row">
                    <div class="time-slots">
                      <span class="slot" [class.empty]="!row.morning_in">{{ row.morning_in | date:'HH:mm' || '--:--' }}</span>
                      <mat-icon class="arrow">arrow_forward</mat-icon>
                      <span class="slot" [class.empty]="!row.morning_out">{{ row.morning_out | date:'HH:mm' || '--:--' }}</span>
                    </div>
                  </td>
                </ng-container>

                <ng-container matColumnDef="afternoon">
                  <th mat-header-cell *matHeaderCellDef>Pomeriggio</th>
                  <td mat-cell *matCellDef="let row">
                    <div class="time-slots">
                      <span class="slot" [class.empty]="!row.afternoon_in">{{ row.afternoon_in | date:'HH:mm' || '--:--' }}</span>
                      <mat-icon class="arrow">arrow_forward</mat-icon>
                      <span class="slot" [class.empty]="!row.afternoon_out">{{ row.afternoon_out | date:'HH:mm' || '--:--' }}</span>
                    </div>
                  </td>
                </ng-container>

                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef></th>
                  <td mat-cell *matCellDef="let row">
                    <button mat-icon-button color="primary" (click)="editRecord(row)" title="Modifica">
                      <mat-icon>edit</mat-icon>
                    </button>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
              </table>

              <div class="no-data" *ngIf="!records.length">
                <mat-icon>info</mat-icon> Nessun dato trovato
              </div>
            </div>
          </div>
        </mat-tab>

        <!-- ── TAB 2: Override Requests ────────────────────────────────────── -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon class="tab-icon" [matBadge]="pendingCount" [matBadgeHidden]="pendingCount === 0" matBadgeColor="warn">
              notifications
            </mat-icon>
            {{ 'BADGE.TAB_REQUESTS' | translate }}
          </ng-template>

          <div class="tab-content">
            <div class="requests-list">
              <mat-card *ngFor="let req of requests" class="request-card" [class.approved]="req.status === 'approved'" [class.rejected]="req.status === 'rejected'">
                <mat-card-header>
                  <mat-icon mat-card-avatar color="primary">account_circle</mat-icon>
                  <mat-card-title>{{ req.user_name }}</mat-card-title>
                  <mat-card-subtitle>{{ req.requested_at | date:'dd/MM/yyyy HH:mm' }}</mat-card-subtitle>
                  <span class="spacer"></span>
                  <mat-chip-listbox>
                    <mat-chip [color]="req.status === 'pending' ? 'accent' : 'default'">
                      {{ 'BADGE.STATUS_' + req.status.toUpperCase() | translate }}
                    </mat-chip>
                  </mat-chip-listbox>
                </mat-card-header>
                <mat-card-content>
                  <div class="request-details">
                    <p><strong>{{ 'BADGE.REQUEST_TYPE' | translate }}:</strong> {{ 'BADGE.STATE_' + req.type.toUpperCase() | translate }}</p>
                    <p><strong>{{ 'BADGE.REQUEST_REASON' | translate }}:</strong> {{ req.reason }}</p>
                  </div>
                </mat-card-content>
                <mat-card-actions *ngIf="req.status === 'pending'" align="end">
                  <button mat-button color="warn" (click)="review(req, 'rejected')">
                    <mat-icon>close</mat-icon> Rifiuta
                  </button>
                  <button mat-flat-button color="primary" (click)="review(req, 'approved')">
                    <mat-icon>check</mat-icon> Approva
                  </button>
                </mat-card-actions>
              </mat-card>

              <div class="no-data" *ngIf="!requests.length">
                <mat-icon>notifications_none</mat-icon> Nessuna richiesta pendente
              </div>
            </div>
          </div>
        </mat-tab>
      </mat-tab-group>

      <!-- ── Edit dialog overlay ──────────────────────────────────────────── -->
      <div class="edit-overlay" *ngIf="editingRow" (click)="cancelEdit()">
        <div class="edit-dialog" (click)="$event.stopPropagation()">
          <h3><mat-icon>edit</mat-icon> Modifica presenze</h3>
          <div class="edit-user">
            <strong>{{ editingRow.user_name }}</strong>
            <span>{{ editingRow.date | date:'EEEE dd/MM/yyyy' }}</span>
          </div>
          <div class="edit-grid">
            <label class="edit-label">Mattina entrata</label>
            <input type="time" [(ngModel)]="editTimes.morning_in" class="time-input">
            <label class="edit-label">Mattina uscita</label>
            <input type="time" [(ngModel)]="editTimes.morning_out" class="time-input">
            <label class="edit-label">Pomeriggio entrata</label>
            <input type="time" [(ngModel)]="editTimes.afternoon_in" class="time-input">
            <label class="edit-label">Pomeriggio uscita</label>
            <input type="time" [(ngModel)]="editTimes.afternoon_out" class="time-input">
          </div>
          <div class="edit-actions">
            <button mat-button (click)="cancelEdit()">Annulla</button>
            <button mat-flat-button color="primary" [disabled]="editSaving" (click)="saveEdit()">
              <mat-icon>save</mat-icon> {{ editSaving ? 'Salvataggio...' : 'Salva' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .timesheet-container { padding: 1.5rem; max-width: 1200px; margin: 0 auto; }
    .page-header { margin-bottom: 1.5rem; }
    .page-header h1 { display: flex; align-items: center; gap: 0.75rem; margin: 0; }
    .tab-icon { margin-right: 8px; }
    .tab-content { padding: 1.5rem 0; }
    .filter-card { margin-bottom: 1.5rem; padding: 1rem; }
    .filters { display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; }
    .full-width { width: 100%; }
    .table-wrapper { background: white; border-radius: 8px; overflow: hidden; }
    .time-slots { display: flex; align-items: center; gap: 0.5rem; }
    .slot { 
      background: #f0f4f8; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 1rem;
      min-width: 50px; text-align: center;
    }
    .slot.empty { color: #ccc; background: #fafafa; }
    .arrow { font-size: 16px; width: 16px; height: 16px; color: #999; }
    .no-data { padding: 3rem; text-align: center; color: #666; display: flex; flex-direction: column; align-items: center; gap: 1rem; }
    .requests-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 1.5rem; }
    @media (max-width: 600px) { .requests-list { grid-template-columns: 1fr; } }
    .request-card { border-left: 4px solid #2196f3; }
    .request-card.approved { border-left-color: #4caf50; opacity: 0.8; }
    .request-card.rejected { border-left-color: #f44336; opacity: 0.8; }
    .spacer { flex: 1; }
    .request-details { margin-top: 1rem; border-top: 1px solid #f0f0f0; padding-top: 1rem; }
    .request-details p { margin: 0.25rem 0; }
    .edit-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 1000;
      display: flex; align-items: center; justify-content: center;
    }
    .edit-dialog {
      background: #fff; border-radius: 12px; padding: 2rem; width: 360px; max-width: 95vw;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
    }
    .edit-dialog h3 { display: flex; align-items: center; gap: 8px; margin: 0 0 1rem; font-size: 1.1rem; }
    .edit-user { margin-bottom: 1.25rem; display: flex; flex-direction: column; gap: 2px; }
    .edit-user strong { font-size: 1rem; }
    .edit-user span { font-size: 0.85rem; color: #666; text-transform: capitalize; }
    .edit-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem 1rem; margin-bottom: 1.5rem; align-items: center; }
    .edit-label { font-size: 0.8rem; color: #555; font-weight: 500; }
    .time-input {
      font-family: monospace; font-size: 1rem; padding: 6px 8px;
      border: 1px solid #ccc; border-radius: 6px; width: 100%; box-sizing: border-box;
      outline: none;
    }
    .time-input:focus { border-color: #2196f3; box-shadow: 0 0 0 2px rgba(33,150,243,0.15); }
    .edit-actions { display: flex; justify-content: flex-end; gap: 8px; }
  `]
})
export class TimesheetComponent implements OnInit {
  records: Attendance[] = [];
  requests: AttendanceRequest[] = [];
  pendingCount = 0;

  editingRow: Attendance | null = null;
  editSaving = false;
  editTimes = { morning_in: '', morning_out: '', afternoon_in: '', afternoon_out: '' };

  filters = {
    user_id: '',
    date_from: null,
    date_to: null
  };

  displayedColumns = ['user', 'date', 'morning', 'afternoon', 'actions'];

  constructor(
    private badgeService: BadgeService,
    private snack: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadTimesheet();
    this.loadRequests();
  }

  loadTimesheet(): void {
    this.badgeService.getTimesheet(this.filters).subscribe({
      next: data => this.records = data,
      error: () => this.snack.open('Errore caricamento timesheet', 'OK', { duration: 3000 })
    });
  }

  loadRequests(): void {
    this.badgeService.getOverrideRequests().subscribe({
      next: data => {
        this.requests = data;
        this.pendingCount = data.filter(r => r.status === 'pending').length;
      },
      error: () => this.snack.open('Errore caricamento richieste', 'OK', { duration: 3000 })
    });
  }

  editRecord(row: Attendance): void {
    this.editingRow = row;
    this.editTimes = {
      morning_in:    this.toTimeStr(row.morning_in),
      morning_out:   this.toTimeStr(row.morning_out),
      afternoon_in:  this.toTimeStr(row.afternoon_in),
      afternoon_out: this.toTimeStr(row.afternoon_out),
    };
  }

  cancelEdit(): void {
    this.editingRow = null;
  }

  saveEdit(): void {
    if (!this.editingRow) return;
    this.editSaving = true;
    const date = this.editingRow.date.slice(0, 10);
    const payload: Partial<Attendance> = {
      morning_in:    this.toIso(date, this.editTimes.morning_in),
      morning_out:   this.toIso(date, this.editTimes.morning_out),
      afternoon_in:  this.toIso(date, this.editTimes.afternoon_in),
      afternoon_out: this.toIso(date, this.editTimes.afternoon_out),
    };
    this.badgeService.updateAttendance(this.editingRow.id, payload).subscribe({
      next: updated => {
        const idx = this.records.findIndex(r => r.id === updated.id);
        if (idx !== -1) this.records[idx] = { ...this.records[idx], ...updated };
        this.records = [...this.records];
        this.snack.open('Presenze aggiornate', 'OK', { duration: 3000 });
        this.editingRow = null;
        this.editSaving = false;
      },
      error: () => {
        this.snack.open('Errore salvataggio', 'OK', { duration: 3000 });
        this.editSaving = false;
      }
    });
  }

  private toTimeStr(iso?: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toTimeString().slice(0, 5); // HH:mm
  }

  private toIso(date: string, time: string): string | undefined {
    if (!time) return undefined;
    return new Date(`${date}T${time}:00`).toISOString();
  }

  review(req: AttendanceRequest, status: 'approved' | 'rejected'): void {
    this.badgeService.reviewRequest(req.id, status).subscribe({
      next: () => {
        this.snack.open(status === 'approved' ? 'Richiesta approvata' : 'Richiesta rifiutata', 'OK', { duration: 3000 });
        this.loadRequests();
        this.loadTimesheet();
      },
      error: () => this.snack.open('Errore salvataggio', 'OK', { duration: 3000 })
    });
  }
}
