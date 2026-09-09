import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

export interface ConfirmDialogData {
  title:         string;           // translation key
  message:       string;           // translation key
  messageParams?: Record<string, unknown>;  // interpolation params for message
  confirm?:      string;           // translation key (default: COMMON.DELETE or COMMON.CONFIRM)
  cancel?:       string;           // translation key (default: COMMON.CANCEL)
  danger?:       boolean;          // false = primary/confirm style; true (default) = warn/delete style
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, TranslateModule],
  template: `
    <div class="cd">
      <div class="cd-icon" [class.cd-icon--primary]="data.danger === false">
        <mat-icon>{{ data.danger === false ? 'check_circle_outline' : 'warning_amber' }}</mat-icon>
      </div>
      <div class="cd-title">{{ data.title | translate }}</div>
      <div class="cd-message">{{ data.message | translate: (data.messageParams ?? {}) }}</div>
      <div class="cd-actions">
        <button type="button" mat-stroked-button (click)="ref.close(false)">
          {{ (data.cancel ?? 'COMMON.CANCEL') | translate }}
        </button>
        <button *ngIf="data.danger === false"
                type="button" mat-raised-button color="primary" (click)="ref.close(true)">
          <mat-icon>check</mat-icon>
          {{ (data.confirm ?? 'COMMON.CONFIRM') | translate }}
        </button>
        <button *ngIf="data.danger !== false"
                type="button" mat-raised-button color="warn" (click)="ref.close(true)">
          <mat-icon>delete</mat-icon>
          {{ (data.confirm ?? 'COMMON.DELETE') | translate }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .cd { padding: 28px 24px 20px; min-width: 320px; max-width: 400px; display: flex; flex-direction: column; align-items: center; gap: 0; overflow: hidden; }
    .cd-icon mat-icon { font-size: 52px; width: 52px; height: 52px; color: #f97316; display: block; }
    .cd-icon--primary mat-icon { color: var(--c-primary, #2563EB); }
    .cd-title { margin: 14px 0 10px; font-size: 18px; font-weight: 600; text-align: center; color: var(--c-text, #1e293b); }
    .cd-message { font-size: 14px; color: var(--c-text2, #64748b); text-align: center; line-height: 1.5; }
    .cd-actions { display: flex; justify-content: flex-end; gap: 8px; width: 100%; margin-top: 24px; }
  `],
})
export class ConfirmDialogComponent {
  constructor(
    public ref:  MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData,
  ) {}
}
