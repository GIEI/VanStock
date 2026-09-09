import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule } from '@ngx-translate/core';
import { AttendanceEvent, AttendanceAction } from '../../core/models/attendance.models';

export interface EditEventDialogResult {
  occurred_at: string;
  detected_action: AttendanceAction;
  notes?: string;
  reason: string;
}

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

@Component({
  selector: 'app-edit-event-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    TranslateModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ 'ATTENDANCE.EDIT_EVENT_TITLE' | translate }}</h2>
    <mat-dialog-content>
      <p class="hint">{{ 'ATTENDANCE.EDIT_EVENT_DESC' | translate }}</p>
      <form [formGroup]="form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'ATTENDANCE.OCCURRED_AT' | translate }}</mat-label>
          <input matInput type="datetime-local" formControlName="occurred_at" />
          <mat-error *ngIf="form.get('occurred_at')?.errors?.['required']">
            {{ 'COMMON.REQUIRED' | translate }}
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'ATTENDANCE.ACTION_TYPE' | translate }}</mat-label>
          <mat-select formControlName="detected_action">
            <mat-option value="CHECK_IN">{{ 'ATTENDANCE.ACTION_CHECK_IN' | translate }}</mat-option>
            <mat-option value="CHECK_OUT">{{ 'ATTENDANCE.ACTION_CHECK_OUT' | translate }}</mat-option>
            <mat-option value="BREAK_START">{{ 'ATTENDANCE.ACTION_BREAK_START' | translate }}</mat-option>
            <mat-option value="BREAK_END">{{ 'ATTENDANCE.ACTION_BREAK_END' | translate }}</mat-option>
          </mat-select>
          <mat-error *ngIf="form.get('detected_action')?.errors?.['required']">
            {{ 'COMMON.REQUIRED' | translate }}
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'ATTENDANCE.NOTES' | translate }}</mat-label>
          <textarea matInput formControlName="notes" rows="2"></textarea>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'ATTENDANCE.REASON' | translate }} *</mat-label>
          <textarea
            matInput
            formControlName="reason"
            rows="3"
            [placeholder]="'ATTENDANCE.REASON_PLACEHOLDER' | translate"
          ></textarea>
          <mat-error *ngIf="form.get('reason')?.errors?.['required']">
            {{ 'COMMON.REQUIRED' | translate }}
          </mat-error>
          <mat-error *ngIf="form.get('reason')?.errors?.['minlength']">
            {{ 'ATTENDANCE.REASON_MIN' | translate }}
          </mat-error>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">
        {{ 'COMMON.CANCEL' | translate }}
      </button>
      <button mat-raised-button color="primary" (click)="save()" [disabled]="form.invalid">
        {{ 'COMMON.CONFIRM' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width { width: 100%; margin-bottom: 8px; }
    .hint { color: rgba(0,0,0,0.6); margin: 0 0 12px; font-size: 13px; }
  `],
})
export class EditEventDialogComponent {
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<EditEventDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public event: AttendanceEvent,
  ) {
    this.form = this.fb.group({
      occurred_at: [toDatetimeLocal(event.occurred_at), Validators.required],
      detected_action: [event.detected_action, Validators.required],
      notes: [event.notes || ''],
      reason: ['', [Validators.required, Validators.minLength(10)]],
    });
  }

  save(): void {
    if (this.form.valid) {
      const v = this.form.value;
      const result: EditEventDialogResult = {
        occurred_at: new Date(v.occurred_at as string).toISOString(),
        detected_action: v.detected_action as AttendanceAction,
        notes: (v.notes as string).trim() || undefined,
        reason: (v.reason as string).trim(),
      };
      this.dialogRef.close(result);
    }
  }
}
