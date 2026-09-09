import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { JobService } from '../../core/services/job.service';
import { UserAbsenceService } from '../../core/services/user-absence.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { ClientService } from '../../core/services/client.service';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { AvailabilityCalendarComponent } from './availability-calendar.component';
import { Job } from '../../core/models/job.model';
import { Client } from '../../core/models/client.model';
import { RequiredMaterial, RequiredMaterialsDialogComponent } from './required-materials-dialog.component';

@Component({
  selector: 'app-jobs',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatChipsModule,
    MatTooltipModule,
    MatDialogModule,
    TranslateModule,
    AvailabilityCalendarComponent,
  ],
  templateUrl: './jobs.component.html',
  styleUrls: ['./jobs.component.scss'],
})
export class JobsComponent implements OnInit {
  jobs: Job[] = [];
  clients: Client[] = [];
  users: { id: number; name: string }[] = [];
  loading = false;
  form!: FormGroup;
  editingId?: number;
  showForm = false;
  requiredMaterials: RequiredMaterial[] = [];

  @ViewChild('formCard', { read: ElementRef }) formCardEl?: ElementRef;

  filterStatus = '';
  filterClientId: number | null = null;
  filterProductMissing = false;

  readonly statusOptions = [
    { value: 'aperto',     label: 'JOBS.STATUS_APERTO',    color: '#1d4ed8' },
    { value: 'in_corso',   label: 'JOBS.STATUS_IN_CORSO',  color: '#d97706' },
    { value: 'completato', label: 'JOBS.STATUS_COMPLETATO', color: '#16a34a' },
    { value: 'annullato',  label: 'JOBS.STATUS_ANNULLATO',  color: '#dc2626' },
  ];

  readonly priorityOptions = [
    { value: 'bassa',    label: 'JOBS.PRIORITY_BASSA',    color: '#6b7280', icon: 'arrow_downward' },
    { value: 'normale',  label: 'JOBS.PRIORITY_NORMALE',  color: '#1d4ed8', icon: 'remove' },
    { value: 'alta',     label: 'JOBS.PRIORITY_ALTA',     color: '#d97706', icon: 'arrow_upward' },
    { value: 'urgente',  label: 'JOBS.PRIORITY_URGENTE',  color: '#dc2626', icon: 'priority_high' },
  ];

  readonly timeOptions = [
    { value: 'all_day',    label: 'JOBS.TIME_ALL_DAY' },
    { value: 'morning',    label: 'JOBS.TIME_MORNING' },
    { value: 'afternoon',  label: 'JOBS.TIME_AFTERNOON' },
    { value: 'custom',     label: 'JOBS.SCHEDULED_TIME_CUSTOM' },
  ];

  constructor(
    private fb:              FormBuilder,
    private jobService:      JobService,
    private absenceService:  UserAbsenceService,
    private clientService:   ClientService,
    private userService:     UserService,
    private snack:           MatSnackBar,
    private dialog:          MatDialog,
    private route:           ActivatedRoute,
    public  auth:            AuthService,
    private translate:       TranslateService,
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.clientService.list().subscribe(c => (this.clients = c));
    this.userService.colleagues().subscribe(u => (this.users = u));

    this.route.queryParams.subscribe(params => {
      if (params['client_id'])       this.filterClientId      = +params['client_id'];
      if (params['product_missing']) this.filterProductMissing = params['product_missing'] === 'true';
      this.load();
      if (params['new'] === '1' && this.auth.isAdmin) this.openCreate();
    });
  }

  initForm(): void {
    this.form = this.fb.group({
      title:              ['', Validators.required],
      description:        [''],
      address:            [''],
      client_id:          [null],
      assigned_to:        [null],
      scheduled_date:     [null],
      scheduled_time:     ['all_day'],
      scheduled_time_custom: [''],
      priority:           ['normale'],
      status:             ['aperto'],
    });
  }

  load(): void {
    this.loading = true;
    const filters: any = {};
    if (this.filterStatus)        filters.status          = this.filterStatus;
    if (this.filterClientId)      filters.client_id       = this.filterClientId;
    if (this.filterProductMissing) filters.product_missing = true;

    this.jobService.list(filters).subscribe({
      next:  j => {
        this.jobs = [...j].sort((a, b) => {
          const aTime = new Date(a.created_at).getTime();
          const bTime = new Date(b.created_at).getTime();
          return bTime - aTime;
        });
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  openCreate(): void {
    this.editingId = undefined;
    this.form.reset({ status: 'aperto' });
    this.showForm = true;
    this.requiredMaterials = [];
    setTimeout(() => this.formCardEl?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  openEdit(job: Job): void {
    this.editingId = job.id;
    this.form.patchValue({
      ...job,
      scheduled_date: job.scheduled_date ? new Date(job.scheduled_date) : null,
    });
    this.showForm = true;
    this.jobService.get(job.id).subscribe(detail => this.requiredMaterials = detail.required_materials ?? []);
    setTimeout(() => this.formCardEl?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  cancel(): void {
    this.showForm = false;
    this.editingId = undefined;
    this.requiredMaterials = [];
  }

  openRequiredMaterials(): void {
    const dialog = this.dialog.open(RequiredMaterialsDialogComponent, { width: '850px', maxWidth: '96vw', data: this.requiredMaterials });
    dialog.afterClosed().subscribe((materials?: RequiredMaterial[]) => { if (materials) this.requiredMaterials = materials; });
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snack.open(this.translate.instant('JOBS.FORM_INVALID'), 'OK', { duration: 3000 });
      return;
    }
    const raw = this.form.value;
    const scheduledDate = raw.scheduled_date
      ? (() => {
          const d = raw.scheduled_date as Date;
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          return `${d.getFullYear()}-${mm}-${dd}`;
        })()
      : null;

    // Check for user absence if both assigned_to and scheduled_date are provided
    if (raw.assigned_to && scheduledDate) {
      try {
        const absences = await firstValueFrom(this.absenceService.list(raw.assigned_to, scheduledDate, scheduledDate));
        if (absences.length > 0) {
          const userName = this.users.find(u => u.id === raw.assigned_to)?.name ?? 'User';
          this.snack.open(
            this.translate.instant('JOBS.USER_ABSENT', { name: userName, date: scheduledDate }),
            'OK',
            { duration: 5000 }
          );
          return;
        }
      } catch {
        // If absence check fails, continue anyway
      }
    }

    const data: Partial<Job> = {
      ...raw,
      scheduled_date: scheduledDate,
      required_materials: this.requiredMaterials.map(item => ({ product_id: item.product_id, quantity_required: item.quantity_required })),
    };

    const req = this.editingId
      ? this.jobService.update(this.editingId, data)
      : this.jobService.create(data);

    req.subscribe({
      next: () => {
        this.snack.open(this.translate.instant(this.editingId ? 'JOBS.UPDATED' : 'JOBS.CREATED'), 'OK', { duration: 3000 });
        this.cancel();
        this.load();
      },
      error: (err) => {
        if (err.status === 409) {
          const userName = this.users.find(u => u.id === raw.assigned_to)?.name ?? 'User';
          this.snack.open(
            this.translate.instant('JOBS.USER_ABSENT', { name: userName, date: scheduledDate }),
            'OK',
            { duration: 5000 }
          );
        } else {
          this.snack.open(this.translate.instant('JOBS.SAVE_ERROR'), 'OK', { duration: 3000 });
        }
      },
    });
  }

  delete(job: Job): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: this.translate.instant('JOBS.DELETE_CONFIRM_TITLE'),
        message: this.translate.instant('JOBS.DELETE_CONFIRM_MSG').replace('{title}', job.title),
      },
    });
    ref.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.jobService.delete(job.id).subscribe({
        next:  () => { this.snack.open(this.translate.instant('JOBS.DELETED'), 'OK', { duration: 3000 }); this.load(); },
        error: () => this.snack.open(this.translate.instant('JOBS.DELETE_ERROR'), 'OK', { duration: 3000 }),
      });
    });
  }

  clearProductMissing(job: Job): void {
    this.jobService.clearProductMissing(job.id).subscribe({
      next: () => { job.product_missing = false; job.product_missing_note = null; },
      error: () => this.snack.open(this.translate.instant('COMMON.ERROR'), 'OK', { duration: 3000 }),
    });
  }

  openAvailabilityCalendar(): void {
    const ref = this.dialog.open(AvailabilityCalendarComponent, {
      width: '95vw',
      maxWidth: '1200px',
      maxHeight: '90vh',
    });
    ref.afterClosed().subscribe((result) => {
      if (!result) return;
      // Convert date string (YYYY-MM-DD) to Date object for matDatepicker
      const [year, month, day] = result.date.split('-');
      const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

      this.form.patchValue({
        scheduled_date:        dateObj,
        scheduled_time:        'custom',
        scheduled_time_custom: result.startTime,
        assigned_to:           result.userId,
      });
    });
  }

  openGeolocationMap(job: Job): void {
    // Lazy load the geolocation map component
    import('./job-geolocation-map.component').then(m => {
      this.dialog.open(m.JobGeolocationMapComponent, {
        width: '95vw',
        maxWidth: '1200px',
        height: '90vh',
        maxHeight: '90vh',
        data: { jobId: job.id, jobTitle: job.title },
      });
    });
  }

  statusInfo(value: string) {
    return this.statusOptions.find(s => s.value === value) ?? this.statusOptions[0];
  }

  priorityInfo(value: string) {
    return this.priorityOptions.find(p => p.value === value) ?? this.priorityOptions[1];
  }

  clearClientFilter(): void {
    this.filterClientId = null;
    this.load();
  }
}
