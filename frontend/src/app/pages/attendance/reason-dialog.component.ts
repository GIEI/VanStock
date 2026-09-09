import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule } from '@ngx-translate/core';

export interface ReasonDialogData {
  title: string;
  description?: string;
  // If provided, also asks for a status pick (for resolving anomalies)
  statusOptions?: { value: string; label: string }[];
  initialStatus?: string;
}

export interface ReasonDialogResult {
  reason: string;
  newStatus?: string;
}

@Component({
  selector: 'app-reason-dialog',
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
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <p *ngIf="data.description" class="hint">{{ data.description }}</p>
      <form [formGroup]="form">
        <mat-form-field
          *ngIf="data.statusOptions && data.statusOptions.length > 0"
          appearance="outline"
          class="full-width"
        >
          <mat-label>{{ 'ATTENDANCE.NEW_STATUS' | translate }}</mat-label>
          <mat-select formControlName="newStatus">
            <mat-option *ngFor="let opt of data.statusOptions" [value]="opt.value">
              {{ opt.label }}
            </mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'ATTENDANCE.REASON' | translate }} *</mat-label>
          <textarea
            matInput
            formControlName="reason"
            rows="4"
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
  styles: [
    `
      .full-width {
        width: 100%;
        margin-bottom: 8px;
      }
      .hint {
        color: rgba(0, 0, 0, 0.6);
        margin: 0 0 12px;
        font-size: 13px;
      }
    `,
  ],
})
export class ReasonDialogComponent {
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<ReasonDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ReasonDialogData,
  ) {
    this.form = this.fb.group({
      reason: ['', [Validators.required, Validators.minLength(10)]],
      newStatus: [data.initialStatus || (data.statusOptions?.[0]?.value ?? null)],
    });
  }

  save(): void {
    if (this.form.valid) {
      const result: ReasonDialogResult = {
        reason: (this.form.value.reason as string).trim(),
        newStatus: this.form.value.newStatus || undefined,
      };
      this.dialogRef.close(result);
    }
  }
}
