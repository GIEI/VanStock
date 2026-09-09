import { Component, OnInit } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  CdkDragDrop,
  CdkDrag,
  CdkDragHandle,
  CdkDropList,
  CdkDropListGroup,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { JobService } from '../../core/services/job.service';
import { UserService } from '../../core/services/user.service';
import { ClientService } from '../../core/services/client.service';
import { UserAbsenceService } from '../../core/services/user-absence.service';
import { Job } from '../../core/models/job.model';
import { Client } from '../../core/models/client.model';

interface CalendarDay {
  date:      Date;
  dateStr:   string;
  label:     string;
  isToday:   boolean;
  isWeekend: boolean;
  jobs:      Job[];
}

@Component({
  selector: 'app-scheduling',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CdkDropListGroup,
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatChipsModule,
    TranslateModule,
  ],
  templateUrl: './scheduling.component.html',
  styleUrls:   ['./scheduling.component.scss'],
})
export class SchedulingComponent implements OnInit {

  loading = false;
  saving  = false;

  weekStart!: Date;
  days:        CalendarDay[] = [];
  unscheduled: Job[]         = [];

  users:        { id: number; name: string }[] = [];
  clients:      Client[]                        = [];
  filterUserId: number | null = null;

  selectedJob:    Job | null = null;
  editAssignedTo: number | null = null;
  editPriority:   string = 'normale';
  editStatus:     string = 'aperto';
  editDate:       Date | null = null;

  // ── New job form ────────────────────────────────────────────────────────────
  newJobMode:           boolean       = false;
  newTitle:             string        = '';
  newClientId:          number | null = null;
  newAssignedTo:        number | null = null;
  newPriority:          string        = 'normale';
  newStatus:            string        = 'aperto';
  newDate:              Date | null   = null;
  newAddress:           string        = '';
  newDescription:       string        = '';
  newScheduledTime:     string        = 'all_day';
  newScheduledTimeCustom: string      = '';

  readonly statusOptions = [
    { value: 'aperto',     color: '#1d4ed8' },
    { value: 'in_corso',   color: '#d97706' },
    { value: 'completato', color: '#16a34a' },
    { value: 'annullato',  color: '#dc2626' },
  ];

  readonly priorityOptions = [
    { value: 'bassa',   color: '#6b7280', icon: 'arrow_downward' },
    { value: 'normale', color: '#1d4ed8', icon: 'remove'         },
    { value: 'alta',    color: '#d97706', icon: 'arrow_upward'   },
    { value: 'urgente', color: '#dc2626', icon: 'priority_high'  },
  ];

  readonly timeOptions = [
    { value: 'all_day',    label: 'JOBS.TIME_ALL_DAY' },
    { value: 'morning',    label: 'JOBS.TIME_MORNING' },
    { value: 'afternoon',  label: 'JOBS.TIME_AFTERNOON' },
    { value: 'custom',     label: 'JOBS.SCHEDULED_TIME_CUSTOM' },
  ];

  constructor(
    private jobService:      JobService,
    private userService:     UserService,
    private clientService:   ClientService,
    private absenceService:  UserAbsenceService,
    private snack:           MatSnackBar,
    private translate:       TranslateService,
  ) {}

  ngOnInit(): void {
    this.weekStart = this.getMonday(new Date());
    this.userService.colleagues().subscribe(u => (this.users = u));
    this.clientService.list().subscribe(c => (this.clients = c));
    this.buildWeek();
    this.load();
  }

  // ── Week navigation ────────────────────────────────────────────────────────

  prevWeek(): void {
    const d = new Date(this.weekStart);
    d.setDate(d.getDate() - 7);
    this.weekStart = d;
    this.buildWeek();
    this.load();
  }

  nextWeek(): void {
    const d = new Date(this.weekStart);
    d.setDate(d.getDate() + 7);
    this.weekStart = d;
    this.buildWeek();
    this.load();
  }

  goToday(): void {
    this.weekStart = this.getMonday(new Date());
    this.buildWeek();
    this.load();
  }

  get weekLabel(): string {
    const end = new Date(this.weekStart);
    end.setDate(end.getDate() + 6);
    return `${this.weekStart.getDate()}/${this.weekStart.getMonth() + 1} – `
         + `${end.getDate()}/${end.getMonth() + 1}/${end.getFullYear()}`;
  }

  // ── Build calendar grid ────────────────────────────────────────────────────

  buildWeek(): void {
    const today = this.toDateStr(new Date());
    this.days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(this.weekStart);
      d.setDate(d.getDate() + i);
      const dateStr = this.toDateStr(d);
      this.days.push({
        date:      d,
        dateStr,
        label:     `${this.dayAbbr(d)} ${d.getDate()}`,
        isToday:   dateStr === today,
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
        jobs:      [],
      });
    }
  }

  load(): void {
    this.loading = true;
    const filters: any = {};
    if (this.filterUserId) filters.assigned_to = this.filterUserId;

    this.jobService.list(filters).subscribe({
      next: jobs => {
        this.days.forEach(d => (d.jobs = []));
        this.unscheduled = [];

        for (const job of jobs) {
          const dateStr = job.scheduled_date ? job.scheduled_date.substring(0, 10) : null;
          if (!dateStr) {
            this.unscheduled.push(job);
            continue;
          }
          const day = this.days.find(d => d.dateStr === dateStr);
          if (day) day.jobs.push(job);
          // jobs outside the current week are not shown
        }
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  // ── Drag & drop ────────────────────────────────────────────────────────────

  drop(event: CdkDragDrop<Job[]>): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      return;
    }

    const job = event.previousContainer.data[event.previousIndex];

    if (this.isLocked(job)) {
      this.snack.open(this.translate.instant('SCHEDULING.LOCKED_JOB'), 'OK', { duration: 3000 });
      return;
    }
    transferArrayItem(
      event.previousContainer.data,
      event.container.data,
      event.previousIndex,
      event.currentIndex,
    );

    const targetId = event.container.id;
    const newDate  = targetId === 'unscheduled' ? null : targetId.replace('day-', '');

    const payload: Partial<Job> = { ...job, scheduled_date: newDate ?? undefined };
    this.jobService.update(job.id, payload).subscribe({
      next: updated => {
        job.scheduled_date = updated.scheduled_date;
        this.snack.open(this.translate.instant('SCHEDULING.DATE_UPDATED'), 'OK', { duration: 2000 });
      },
      error: () => {
        // Revert by reloading
        this.snack.open(this.translate.instant('SCHEDULING.UPDATE_ERROR'), 'OK', { duration: 3000 });
        this.load();
      },
    });
  }

  // ── Job selection & quick edit ─────────────────────────────────────────────

  selectJob(job: Job): void {
    this.newJobMode = false;
    if (this.selectedJob?.id === job.id) {
      this.selectedJob = null;
      return;
    }
    this.selectedJob    = { ...job };
    this.editAssignedTo = job.assigned_to ?? null;
    this.editPriority   = job.priority   ?? 'normale';
    this.editStatus     = job.status;
    this.editDate       = job.scheduled_date
      ? new Date(job.scheduled_date.substring(0, 10) + 'T12:00:00')
      : null;
  }

  closePanel(): void {
    this.selectedJob = null;
  }

  async saveEdit(): Promise<void> {
    if (!this.selectedJob) return;

    let newDateStr: string | undefined;

    // Locked jobs: preserve original date, priority, and assigned_to
    if (this.isLocked(this.selectedJob)) {
      newDateStr = this.selectedJob.scheduled_date ?? undefined;
      this.editPriority   = this.selectedJob.priority   ?? 'normale';
      this.editAssignedTo = this.selectedJob.assigned_to ?? null;
    } else if (this.editDate) {
      const d  = this.editDate as Date;
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      newDateStr = `${d.getFullYear()}-${mm}-${dd}`;
    }

    // Check for user absence if both date and user are selected
    if (this.editAssignedTo && newDateStr) {
      try {
        const absences = await firstValueFrom(this.absenceService.list(this.editAssignedTo, newDateStr, newDateStr));
        if (absences.length > 0) {
          const userName = this.users.find(u => u.id === this.editAssignedTo)?.name ?? 'User';
          this.snack.open(
            this.translate.instant('JOBS.USER_ABSENT', { name: userName, date: newDateStr }),
            'OK',
            { duration: 5000 }
          );
          return;
        }
      } catch {
        // If absence check fails, continue anyway
      }
    }

    this.updateJob(newDateStr);
  }

  private updateJob(newDateStr: string | undefined): void {
    if (!this.selectedJob) return;
    this.saving = true;

    const payload: Partial<Job> = {
      ...this.selectedJob,
      assigned_to:    this.editAssignedTo ?? undefined,
      priority:       this.editPriority as Job['priority'],
      status:         this.editStatus    as Job['status'],
      scheduled_date: newDateStr,
    };

    this.jobService.update(this.selectedJob.id, payload).subscribe({
      next: () => {
        this.saving      = false;
        this.selectedJob = null;
        this.snack.open(this.translate.instant('JOBS.UPDATED'), 'OK', { duration: 2000 });
        this.load();
      },
      error: (err) => {
        this.saving = false;
        if (err.status === 409) {
          const userName = this.users.find(u => u.id === this.editAssignedTo)?.name ?? 'User';
          this.snack.open(
            this.translate.instant('JOBS.USER_ABSENT', { name: userName, date: newDateStr }),
            'OK',
            { duration: 5000 }
          );
        } else {
          this.snack.open(this.translate.instant('JOBS.SAVE_ERROR'), 'OK', { duration: 3000 });
        }
      },
    });
  }

  // ── New job ────────────────────────────────────────────────────────────────

  openNewJob(): void {
    this.selectedJob         = null;
    this.newJobMode          = true;
    this.newTitle            = '';
    this.newClientId         = null;
    this.newAssignedTo       = null;
    this.newPriority         = 'normale';
    this.newStatus           = 'aperto';
    this.newDate             = null;
    this.newAddress          = '';
    this.newDescription      = '';
    this.newScheduledTime    = 'all_day';
    this.newScheduledTimeCustom = '';
  }

  cancelNew(): void {
    this.newJobMode = false;
  }

  async saveNew(): Promise<void> {
    if (!this.newTitle.trim()) {
      this.snack.open(this.translate.instant('SCHEDULING.TITLE_REQUIRED'), 'OK', { duration: 3000 });
      return;
    }

    let newDateStr: string | undefined;
    if (this.newDate) {
      const d  = this.newDate as Date;
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      newDateStr = `${d.getFullYear()}-${mm}-${dd}`;
    }

    // Check for user absence if both date and user are selected
    if (this.newAssignedTo && newDateStr) {
      try {
        const absences = await firstValueFrom(this.absenceService.list(this.newAssignedTo, newDateStr, newDateStr));
        if (absences.length > 0) {
          const userName = this.users.find(u => u.id === this.newAssignedTo)?.name ?? 'User';
          this.snack.open(
            this.translate.instant('JOBS.USER_ABSENT', { name: userName, date: newDateStr }),
            'OK',
            { duration: 5000 }
          );
          return;
        }
      } catch {
        // If absence check fails, continue anyway
      }
    }

    this.createJob(newDateStr);
  }

  private createJob(newDateStr: string | undefined): void {
    this.saving = true;

    const payload: Partial<Job> = {
      title:                 this.newTitle.trim(),
      client_id:             this.newClientId    ?? undefined,
      assigned_to:           this.newAssignedTo  ?? undefined,
      priority:              this.newPriority    as Job['priority'],
      status:                this.newStatus      as Job['status'],
      scheduled_date:        newDateStr,
      scheduled_time:        this.newScheduledTime as Job['scheduled_time'],
      scheduled_time_custom: this.newScheduledTimeCustom.trim() || undefined,
      address:               this.newAddress.trim()     || undefined,
      description:           this.newDescription.trim() || undefined,
    };

    this.jobService.create(payload).subscribe({
      next: () => {
        this.saving     = false;
        this.newJobMode = false;
        this.snack.open(this.translate.instant('JOBS.CREATED'), 'OK', { duration: 2000 });
        this.load();
      },
      error: (err) => {
        this.saving = false;
        if (err.status === 409) {
          const userName = this.users.find(u => u.id === this.newAssignedTo)?.name ?? 'User';
          this.snack.open(
            this.translate.instant('JOBS.USER_ABSENT', { name: userName, date: newDateStr }),
            'OK',
            { duration: 5000 }
          );
        } else {
          this.snack.open(this.translate.instant('JOBS.SAVE_ERROR'), 'OK', { duration: 3000 });
        }
      },
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  isLocked(job: Job): boolean {
    return job.status === 'completato' || job.status === 'annullato';
  }

  priorityInfo(value: string) {
    return this.priorityOptions.find(p => p.value === value) ?? this.priorityOptions[1];
  }

  statusInfo(value: string) {
    return this.statusOptions.find(s => s.value === value) ?? this.statusOptions[0];
  }

  private dayAbbr(d: Date): string {
    const localeMap: Record<string, string> = {
      it: 'it-IT', en: 'en-US', es: 'es-ES', fr: 'fr-FR', ja: 'ja-JP', ru: 'ru-RU', zh: 'zh-CN',
    };
    const locale = localeMap[this.translate.currentLang] ?? 'en-US';
    return d.toLocaleDateString(locale, { weekday: 'short' });
  }

  private getMonday(d: Date): Date {
    const date = new Date(d);
    date.setHours(0, 0, 0, 0);
    const day  = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    return date;
  }

  private toDateStr(d: Date): string {
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  }
}
