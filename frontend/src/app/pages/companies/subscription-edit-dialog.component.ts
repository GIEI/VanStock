import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateModule } from '@ngx-translate/core';
import {
  SubscriptionsService,
  SubscriptionRow,
  PlanType,
  SubscriptionStatus,
  UpdateSubscriptionPayload,
} from '../../core/services/subscriptions.service';

export interface SubscriptionEditData {
  companyId: number;
  companyName: string;
  current: SubscriptionRow;
}

@Component({
  selector: 'app-subscription-edit-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    TranslateModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ 'SUBSCRIPTION.EDIT_TITLE' | translate }} — {{ data.companyName }}</h2>
    <mat-dialog-content>
      <div class="seat-summary">
        <span>{{ 'SUBSCRIPTION.CURRENT_USAGE' | translate }}: <strong>{{ data.current.used_seats }} / {{ data.current.max_seats }}</strong></span>
      </div>

      <mat-form-field appearance="outline" class="full">
        <mat-label>{{ 'SUBSCRIPTION.PLAN' | translate }}</mat-label>
        <mat-select [(ngModel)]="planType">
          <mat-option value="BASIC">BASIC</mat-option>
          <mat-option value="PRO">PRO</mat-option>
          <mat-option value="ENTERPRISE">ENTERPRISE</mat-option>
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full">
        <mat-label>{{ 'SUBSCRIPTION.MAX_SEATS' | translate }}</mat-label>
        <input matInput type="number" min="0" [(ngModel)]="maxSeats">
      </mat-form-field>

      <mat-form-field appearance="outline" class="full">
        <mat-label>{{ 'SUBSCRIPTION.EXPIRES_AT' | translate }}</mat-label>
        <input matInput type="date" [(ngModel)]="expiresAt">
        <button type="button" mat-icon-button matSuffix *ngIf="expiresAt" (click)="expiresAt = ''" [attr.aria-label]="'COMMON.CLEAR' | translate">
          <span aria-hidden="true">×</span>
        </button>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full">
        <mat-label>{{ 'SUBSCRIPTION.STATUS' | translate }}</mat-label>
        <mat-select [(ngModel)]="status">
          <mat-option value="ACTIVE">ACTIVE</mat-option>
          <mat-option value="SUSPENDED">SUSPENDED</mat-option>
          <mat-option value="TRIAL">TRIAL</mat-option>
          <mat-option value="PAST_DUE">PAST_DUE</mat-option>
        </mat-select>
      </mat-form-field>

      <p *ngIf="maxSeats < data.current.used_seats" class="warn">
        {{ 'SUBSCRIPTION.WARN_BELOW_USED' | translate }}
      </p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close(false)">{{ 'COMMON.CANCEL' | translate }}</button>
      <button mat-raised-button color="primary" (click)="save()" [disabled]="saving">{{ 'COMMON.SAVE' | translate }}</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full { width: 100%; display: block; margin-bottom: 8px; }
    .seat-summary { margin-bottom: 16px; padding: 8px 12px; background: #f5f5f5; border-radius: 4px; }
    .warn { color: #f57c00; font-size: 13px; margin: 0; }
  `],
})
export class SubscriptionEditDialogComponent {
  planType: PlanType;
  maxSeats: number;
  expiresAt: string;
  status: SubscriptionStatus;
  saving = false;

  constructor(
    public dialogRef: MatDialogRef<SubscriptionEditDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SubscriptionEditData,
    private subsSvc: SubscriptionsService,
    private snack: MatSnackBar,
  ) {
    this.planType  = data.current.plan_type;
    this.maxSeats  = data.current.max_seats;
    this.expiresAt = data.current.expires_at ? data.current.expires_at.substring(0, 10) : '';
    this.status    = data.current.status;
  }

  save(): void {
    if (this.maxSeats < 0 || !Number.isInteger(this.maxSeats)) {
      this.snack.open('max_seats deve essere un intero >= 0', 'OK', { duration: 4000 });
      return;
    }
    this.saving = true;
    const payload: UpdateSubscriptionPayload = {
      plan_type: this.planType,
      max_seats: this.maxSeats,
      status:    this.status,
      expires_at: this.expiresAt ? new Date(this.expiresAt).toISOString() : null,
    };
    this.subsSvc.update(this.data.companyId, payload).subscribe({
      next: () => { this.snack.open('Licenza aggiornata', 'OK', { duration: 3000 }); this.dialogRef.close(true); },
      error: err => {
        this.saving = false;
        this.snack.open(err.error?.error || 'Errore', 'OK', { duration: 4000 });
      },
    });
  }
}
