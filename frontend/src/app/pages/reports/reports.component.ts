import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDividerModule } from '@angular/material/divider';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../core/services/auth.service';
import { ReportService } from '../../core/services/report.service';
import { JobService } from '../../core/services/job.service';
import { MovementService } from '../../core/services/movement.service';
import { DailyReport } from '../../core/models/report.model';
import { Job } from '../../core/models/job.model';
import { Movement } from '../../core/models/product.model';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatExpansionModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatDividerModule,
    TranslateModule,
  ],
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss'],
})
export class ReportsComponent implements OnInit {
  reports: DailyReport[]     = [];
  loading            = false;
  showForm           = false;
  submitting         = false;

  form!: FormGroup;
  todayJobs: Job[]           = [];
  todayMovements: Movement[] = [];
  formLoading        = false;

  selectedReport: DailyReport | null = null;
  detailLoading      = false;

  constructor(
    private fb:            FormBuilder,
    private reportService: ReportService,
    private jobService:    JobService,
    private movementSvc:   MovementService,
    private snack:         MatSnackBar,
    private translate:     TranslateService,
    public  auth:          AuthService,
  ) {}

  get today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  ngOnInit(): void {
    this.form = this.fb.group({ report_date: [new Date()], notes: [''] });
    this.load();
  }

  load(): void {
    this.loading = true;
    this.reportService.list().subscribe({
      next:  r => { this.reports = r; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  openForm(): void {
    this.selectedReport = null;
    this.showForm = true;
    this.form.patchValue({ report_date: new Date(), notes: '' });
    this.loadFormPreview(this.today);
  }

  onDateChange(event: any): void {
    const d: Date = event.value;
    if (!d) return;
    this.form.patchValue({ report_date: d });
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    this.loadFormPreview(dateStr);
  }

  private dateToStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private loadFormPreview(date: string): void {
    this.formLoading = true;
    Promise.all([
      this.jobService.list({ date_from: date, date_to: date }).toPromise(),
      this.movementSvc.list({ from: date, to: date }).toPromise(),
    ]).then(([jobs, movements]) => {
      this.todayJobs      = jobs      ?? [];
      this.todayMovements = movements ?? [];
      this.formLoading = false;
    }).catch(() => { this.formLoading = false; });
  }

  submit(): void {
    this.submitting = true;
    const raw = this.form.value;
    const report_date = raw.report_date instanceof Date ? this.dateToStr(raw.report_date) : (raw.report_date as string);
    const notes = raw.notes as string;
    this.reportService.submit({ report_date, notes }).subscribe({
      next: () => {
        this.snack.open(this.translate.instant('REPORTS.SUBMITTED'), 'OK', { duration: 3000 });
        this.showForm = false;
        this.load();
        this.submitting = false;
      },
      error: () => {
        this.snack.open(this.translate.instant('COMMON.ERROR'), 'OK', { duration: 3000 });
        this.submitting = false;
      },
    });
  }

  cancel(): void {
    this.showForm = false;
    this.selectedReport = null;
  }

  openDetail(report: DailyReport): void {
    if (this.selectedReport?.id === report.id) {
      this.selectedReport = null;
      return;
    }
    this.showForm = false;
    this.detailLoading = true;
    this.reportService.get(report.id).subscribe({
      next: r => { this.selectedReport = r; this.detailLoading = false; },
      error: () => { this.detailLoading = false; },
    });
  }

  deleteReport(report: DailyReport, event: MouseEvent): void {
    event.stopPropagation();
    if (!confirm(`Eliminare il rapporto del ${new Date(report.report_date).toLocaleDateString('it-IT')}?`)) return;
    this.reportService.delete(report.id).subscribe({
      next: () => {
        if (this.selectedReport?.id === report.id) this.selectedReport = null;
        this.load();
        this.snack.open('Rapporto eliminato', 'OK', { duration: 3000 });
      },
      error: () => this.snack.open('Errore durante l\'eliminazione', 'OK', { duration: 3000 }),
    });
  }

  jobStatusColor(status: string): string {
    return ({ aperto: '#1d4ed8', in_corso: '#d97706', completato: '#16a34a', annullato: '#dc2626' } as Record<string, string>)[status] ?? '#6b7280';
  }

  movementColor(type: string): string {
    return ({ carico: '#22c55e', scarico: '#f97316', trasferimento: '#6366f1' } as Record<string, string>)[type] ?? '#6366f1';
  }

  movementIcon(type: string): string {
    return ({ carico: 'add_circle', scarico: 'remove_circle', trasferimento: 'swap_horiz' } as Record<string, string>)[type] ?? 'swap_horiz';
  }
}
