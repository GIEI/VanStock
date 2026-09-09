import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { Router } from '@angular/router';
import { CompanyService } from '../../core/services/company.service';
import { AuthService } from '../../core/services/auth.service';
import { SubscriptionsService, SubscriptionRow } from '../../core/services/subscriptions.service';
import { Company, SUPPORTED_CURRENCIES } from '../../core/models/user.model';
import { PhotoUrlPipe } from '../../core/pipes/photo-url.pipe';
import { UserFormDialogComponent, UserDialogData } from '../users/user-form-dialog.component';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { SubscriptionEditDialogComponent, SubscriptionEditData } from './subscription-edit-dialog.component';
import { SmtpConfigDialogComponent, SmtpDialogData } from './smtp-config-dialog.component';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-companies',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatTableModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSnackBarModule, MatTooltipModule,
    MatDialogModule, MatSelectModule, PhotoUrlPipe,
    TranslateModule,
  ],
  templateUrl: './companies.component.html',
  styleUrls: ['./companies.component.scss'],
})
export class CompaniesComponent implements OnInit {
  companies: Company[] = [];
  subscriptions: Record<number, SubscriptionRow> = {};
  displayedColumns = ['logo', 'name', 'currency', 'license', 'created_at', 'template', 'actions', 'adduser'];
  currencies = SUPPORTED_CURRENCIES;
  newName     = '';
  editId: number | null = null;
  editName     = '';
  editCurrency = 'EUR';
  loading      = false;

  constructor(
    private companySvc: CompanyService,
    private auth: AuthService,
    private subsSvc: SubscriptionsService,
    private snack: MatSnackBar,
    private dialog: MatDialog,
    private router: Router,
  ) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.companySvc.list().subscribe({
      next:  c => { this.companies = c; this.loading = false; },
      error: () => { this.loading = false; },
    });
    this.subsSvc.list().subscribe({
      next: rows => {
        this.subscriptions = {};
        for (const r of rows) this.subscriptions[r.company_id] = r;
      },
      error: () => {},
    });
  }

  sub(c: Company): SubscriptionRow | undefined {
    return this.subscriptions[c.id];
  }

  isSeatsFull(c: Company): boolean {
    const s = this.sub(c);
    return !!s && s.used_seats >= s.max_seats;
  }

  configureSmtp(c: Company): void {
    const data: SmtpDialogData = { companyId: c.id, companyName: c.name };
    this.dialog.open(SmtpConfigDialogComponent, { width: '560px', data });
  }

  editSubscription(c: Company): void {
    const current = this.sub(c);
    if (!current) {
      this.snack.open('Nessuna subscription per questa company', 'OK', { duration: 4000 });
      return;
    }
    const data: SubscriptionEditData = { companyId: c.id, companyName: c.name, current };
    const ref = this.dialog.open(SubscriptionEditDialogComponent, { width: '480px', data });
    ref.afterClosed().subscribe(changed => { if (changed) this.load(); });
  }

  create(): void {
    if (!this.newName.trim()) return;
    this.companySvc.create(this.newName.trim()).subscribe({
      next: () => { this.newName = ''; this.snack.open('Società creata', 'OK', { duration: 3000 }); this.load(); },
      error: err => this.snack.open(err.error?.error || 'Errore', 'OK', { duration: 4000 }),
    });
  }

  startEdit(c: Company): void {
    this.editId       = c.id;
    this.editName     = c.name;
    this.editCurrency = c.currency ?? 'EUR';
  }

  saveEdit(c: Company): void {
    if (!this.editName.trim()) return;
    this.companySvc.update(c.id, this.editName.trim(), this.editCurrency).subscribe({
      next: updated => {
        this.editId = null;
        this.snack.open('Salvato', 'OK', { duration: 3000 });
        if (this.auth.currentUser?.company_id === c.id) {
          this.auth.updateCompanyCurrency(updated.currency);
        }
        this.load();
      },
      error: err => this.snack.open(err.error?.error || 'Errore', 'OK', { duration: 4000 }),
    });
  }

  onLogoSelected(event: Event, company: Company): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    input.value = '';
    this.companySvc.uploadLogo(company.id, file).subscribe({
      next: updated => {
        company.logo_url = updated.logo_url;
        this.snack.open('Logo aggiornato', 'OK', { duration: 3000 });
        // If this is the current user's company, update toolbar logo live
        if (this.auth.currentUser?.company_id === company.id) {
          this.auth.updateCompanyLogo(updated.logo_url ?? null);
        }
      },
      error: () => this.snack.open('Errore caricamento logo', 'OK', { duration: 4000 }),
    });
  }

  onTemplateSelected(event: Event, company: Company): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    input.value = '';
    this.companySvc.uploadTemplate(company.id, file).subscribe({
      next: updated => {
        company.word_template_url = updated.word_template_url;
        this.snack.open('Template caricato', 'OK', { duration: 3000 });
      },
      error: () => this.snack.open('Errore caricamento template', 'OK', { duration: 4000 }),
    });
  }

  deleteTemplate(company: Company): void {
    this.companySvc.deleteTemplate(company.id).subscribe({
      next: () => {
        company.word_template_url = null;
        this.snack.open('Template rimosso', 'OK', { duration: 3000 });
      },
      error: () => this.snack.open('Errore rimozione template', 'OK', { duration: 4000 }),
    });
  }

  openAddUser(c: Company): void {
    const data: UserDialogData = {
      user: null,
      companies: this.companies,
      preselectedCompanyId: c.id,
    };
    const ref = this.dialog.open(UserFormDialogComponent, { width: '480px', data });
    ref.afterClosed().subscribe(result => { if (result) this.load(); });
  }

  openFeatures(c: Company): void {
    this.router.navigate(['/features'], { queryParams: { companyId: c.id } });
  }

  delete(c: Company): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title:   'CONFIRM.DELETE_COMPANY_TITLE',
        message: 'CONFIRM.DELETE_COMPANY_MSG',
        messageParams: { name: c.name },
        confirm: 'CONFIRM.DELETE_COMPANY_BTN',
      },
    });
    ref.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.companySvc.delete(c.id).subscribe({
        next: () => { this.snack.open('Società eliminata', 'OK', { duration: 3000 }); this.load(); },
        error: err => this.snack.open(err.error?.error || 'Errore', 'OK', { duration: 4000 }),
      });
    });
  }
}
