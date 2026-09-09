import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-add-absence-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    TranslateModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ 'ABSENCES.ADD_ABSENCE' | translate }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'ABSENCES.DATE' | translate }} *</mat-label>
          <input matInput [matDatepicker]="picker" formControlName="date">
          <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
          <mat-datepicker #picker></mat-datepicker>
          <mat-error>{{ 'COMMON.REQUIRED' | translate }}</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'ABSENCES.REASON' | translate }}</mat-label>
          <mat-select formControlName="reason">
            <mat-option [value]="null">{{ 'COMMON.SELECT' | translate }}</mat-option>
            <mat-option value="vacation">{{ 'ABSENCES.VACATION' | translate }}</mat-option>
            <mat-option value="sick_leave">{{ 'ABSENCES.SICK_LEAVE' | translate }}</mat-option>
            <mat-option value="personal">{{ 'ABSENCES.PERSONAL' | translate }}</mat-option>
            <mat-option value="other">{{ 'ABSENCES.OTHER' | translate }}</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'ABSENCES.NOTES' | translate }}</mat-label>
          <textarea matInput formControlName="notes" rows="3"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">{{ 'COMMON.CANCEL' | translate }}</button>
      <button mat-raised-button color="primary" (click)="save()" [disabled]="form.invalid">
        {{ 'ABSENCES.ADD' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }
  `],
})
export class AddAbsenceDialogComponent {
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<AddAbsenceDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { currentYear: number; currentMonth: number },
  ) {
    const today = new Date();
    this.form = this.fb.group({
      date: [
        new Date(data.currentYear, data.currentMonth, today.getDate()),
        Validators.required,
      ],
      reason: [null],
      notes: [''],
    });
  }

  save(): void {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    }
  }
}
