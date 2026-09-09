import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { BadgeService } from '../../core/services/badge.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-override-request-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    TranslateModule
  ],
  template: `
    <h2 mat-dialog-title>{{ 'BADGE.REQUEST_TITLE' | translate }}</h2>
    <mat-dialog-content>
      <div class="form-container">
        <p class="hint">{{ 'BADGE.REQUEST_HINT' | translate }}</p>
        
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'BADGE.REQUEST_TYPE' | translate }}</mat-label>
          <mat-select [(ngModel)]="request.type" required>
            <mat-option value="morning_in">{{ 'BADGE.STATE_MORNING_IN' | translate }}</mat-option>
            <mat-option value="morning_out">{{ 'BADGE.STATE_MORNING_OUT' | translate }}</mat-option>
            <mat-option value="afternoon_in">{{ 'BADGE.STATE_AFTERNOON_IN' | translate }}</mat-option>
            <mat-option value="afternoon_out">{{ 'BADGE.STATE_AFTERNOON_OUT' | translate }}</mat-option>
          </mat-select>
        </mat-form-field>

        <div class="date-time-row">
          <mat-form-field appearance="outline">
            <mat-label>{{ 'BADGE.REQUEST_DATE' | translate }}</mat-label>
            <input matInput [matDatepicker]="picker" [(ngModel)]="requestDate" required>
            <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
            <mat-datepicker #picker></mat-datepicker>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>{{ 'BADGE.REQUEST_TIME' | translate }}</mat-label>
            <input matInput type="time" [(ngModel)]="requestTime" required>
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'BADGE.REQUEST_REASON' | translate }}</mat-label>
          <textarea matInput [(ngModel)]="request.reason" rows="3" 
                    placeholder="e.g. Fotocamera non funzionante, QR scaduto..." required></textarea>
        </mat-form-field>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">{{ 'COMMON.CANCEL' | translate }}</button>
      <button mat-flat-button color="primary" [disabled]="!isValid()" (click)="submit()">
        {{ 'COMMON.CONFIRM' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .form-container {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding-top: 0.5rem;
    }
    .full-width {
      width: 100%;
    }
    .date-time-row {
      display: flex;
      gap: 1rem;
    }
    .date-time-row mat-form-field {
      flex: 1;
    }
    .hint {
      color: #666;
      font-size: 0.9rem;
      margin-bottom: 1rem;
    }
  `]
})
export class OverrideRequestDialogComponent {
  request = {
    type: '',
    reason: ''
  };
  requestDate = new Date();
  requestTime = this.getCurrentTimeStr();

  constructor(
    public dialogRef: MatDialogRef<OverrideRequestDialogComponent>,
    private badgeService: BadgeService,
    private snack: MatSnackBar
  ) {}

  private getCurrentTimeStr(): string {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  }

  isValid(): boolean {
    return !!(this.request.type && this.request.reason && this.requestDate && this.requestTime);
  }

  submit(): void {
    const [hours, minutes] = this.requestTime.split(':').map(Number);
    const fullDate = new Date(this.requestDate);
    fullDate.setHours(hours, minutes, 0, 0);

    this.badgeService.requestOverride(this.request.type, fullDate, this.request.reason).subscribe({
      next: () => {
        this.snack.open('Richiesta inviata all\'amministratore', 'OK', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: () => {
        this.snack.open('Errore durante l\'invio della richiesta', 'OK', { duration: 4000 });
      }
    });
  }
}
