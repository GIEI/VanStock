import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { UserAbsenceService, UserAbsence } from '../../core/services/user-absence.service';
import { AuthService } from '../../core/services/auth.service';
import { AddAbsenceDialogComponent } from './add-absence-dialog.component';

@Component({
  selector: 'app-my-absences',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule,
    MatSnackBarModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    TranslateModule,
  ],
  templateUrl: './my-absences.component.html',
  styleUrls: ['./my-absences.component.scss'],
})
export class MyAbsencesComponent implements OnInit {
  absences: UserAbsence[] = [];
  loading = false;
  currentDate = new Date();
  currentMonth = this.currentDate.getMonth();
  currentYear = this.currentDate.getFullYear();

  isAdmin = false;

  // For template access
  get auth() {
    return this.authService;
  }

  reasonOptions = [
    { value: 'vacation', label: 'Ferie' },
    { value: 'sick_leave', label: 'Malattia' },
    { value: 'personal', label: 'Permesso personale' },
    { value: 'other', label: 'Altro' },
  ];

  constructor(
    private absenceService: UserAbsenceService,
    private authService: AuthService,
    private dialog: MatDialog,
    private snack: MatSnackBar,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.isAdmin = this.authService.isAdmin;
    this.load();
  }

  load(): void {
    this.loading = true;
    const dateFrom = new Date(this.currentYear, this.currentMonth, 1);
    const dateTo = new Date(this.currentYear, this.currentMonth + 1, 0);
    const dateFromStr = this.toDateStr(dateFrom);
    const dateToStr = this.toDateStr(dateTo);

    if (this.isAdmin) {
      // Admin: load all users' absences
      this.absenceService.listAll(dateFromStr, dateToStr).subscribe({
        next: (absences) => {
          console.log('Loaded absences (admin):', absences);
          this.absences = absences;
          this.loading = false;
        },
        error: (err) => {
          console.error('Error loading absences:', err);
          this.loading = false;
          this.snack.open(this.translate.instant('ABSENCES.LOAD_ERROR'), 'OK', { duration: 3000 });
        },
      });
    } else {
      // Regular user: load only their own absences
      this.absenceService.list(this.authService.currentUser!.id, dateFromStr, dateToStr).subscribe({
        next: (absences) => {
          console.log('Loaded absences (user):', absences);
          this.absences = absences;
          this.loading = false;
        },
        error: (err) => {
          console.error('Error loading absences:', err);
          this.loading = false;
          this.snack.open(this.translate.instant('ABSENCES.LOAD_ERROR'), 'OK', { duration: 3000 });
        },
      });
    }
  }

  openAddDialog(): void {
    const ref = this.dialog.open(AddAbsenceDialogComponent, {
      width: '400px',
      data: { currentYear: this.currentYear, currentMonth: this.currentMonth },
    });

    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.createAbsence(result);
      }
    });
  }

  createAbsence(data: { date: Date; reason?: string; notes?: string }): void {
    const dateStr = this.toDateStr(data.date);

    this.absenceService
      .create(this.authService.currentUser!.id, {
        absence_date: dateStr,
        reason: data.reason,
        notes: data.notes,
      })
      .subscribe({
        next: () => {
          this.snack.open(this.translate.instant('ABSENCES.ADDED'), 'OK', { duration: 3000 });
          this.load();
        },
        error: (err) => {
          if (err.status === 409) {
            this.snack.open(this.translate.instant('ABSENCES.ALREADY_EXISTS'), 'OK', { duration: 3000 });
          } else {
            this.snack.open(this.translate.instant('ABSENCES.ADD_ERROR'), 'OK', { duration: 3000 });
          }
        },
      });
  }

  deleteAbsence(absence: UserAbsence): void {
    if (!this.isAdmin && absence.user_id !== this.authService.currentUser!.id) {
      this.snack.open(this.translate.instant('COMMON.UNAUTHORIZED'), 'OK', { duration: 3000 });
      return;
    }

    if (!confirm(this.translate.instant('ABSENCES.CONFIRM_DELETE'))) return;

    this.absenceService.delete(absence.user_id, absence.id).subscribe({
      next: () => {
        this.snack.open(this.translate.instant('ABSENCES.DELETED'), 'OK', { duration: 3000 });
        this.load();
      },
      error: () => {
        this.snack.open(this.translate.instant('ABSENCES.DELETE_ERROR'), 'OK', { duration: 3000 });
      },
    });
  }

  prevMonth(): void {
    this.currentMonth--;
    if (this.currentMonth < 0) {
      this.currentMonth = 11;
      this.currentYear--;
    }
    this.load();
  }

  nextMonth(): void {
    this.currentMonth++;
    if (this.currentMonth > 11) {
      this.currentMonth = 0;
      this.currentYear++;
    }
    this.load();
  }

  isAbsentOn(dateStr: string): boolean {
    return this.absences.some(a => a.absence_date.startsWith(dateStr));
  }

  getAbsencesOn(dateStr: string): UserAbsence[] {
    return this.absences.filter(a => a.absence_date.startsWith(dateStr));
  }

  getReasonLabel(reason?: string): string {
    if (!reason) return '';
    const opt = this.reasonOptions.find(r => r.value === reason);
    return opt ? opt.label : reason;
  }

  getDaysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
  }

  getFirstDayOfMonth(year: number, month: number): number {
    const dayOfWeek = new Date(year, month, 1).getDay();
    return dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  }

  getMonthLabel(): string {
    return new Date(this.currentYear, this.currentMonth).toLocaleDateString('it', {
      month: 'long',
      year: 'numeric',
    });
  }

  getDateForDay(dayNum: number): string {
    const yyyy = this.currentYear;
    const mm = String(this.currentMonth + 1).padStart(2, '0');
    const dd = String(dayNum).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private toDateStr(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
}
