import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { UserService } from '../../core/services/user.service';
import { CompanyService } from '../../core/services/company.service';
import { AuthService } from '../../core/services/auth.service';
import { SubscriptionsService, SeatUsage } from '../../core/services/subscriptions.service';
import { Company, User } from '../../core/models/user.model';
import { SmtpConfigDialogComponent, SmtpDialogData } from '../companies/smtp-config-dialog.component';
import { UserFormDialogComponent, UserDialogData } from './user-form-dialog.component';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDialogModule,
    MatSnackBarModule,
    MatChipsModule,
    MatTooltipModule,
    MatSlideToggleModule,
    TranslateModule,
  ],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss'],
})
export class UsersComponent implements OnInit {
  users: User[] = [];
  companies: Company[] = [];
  displayedColumns = ['name', 'email', 'role', 'active', 'actions'];
  loading = false;
  filterCompanyId: number | null = null;
  seatUsage: SeatUsage | null = null;

  constructor(
    public auth:        AuthService,
    private userSvc:    UserService,
    private companySvc: CompanyService,
    private subsSvc:    SubscriptionsService,
    private dialog:     MatDialog,
    private snack:      MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.load();
    this.loadSeatUsage();
    if (this.auth.isSuperAdmin) {
      this.companySvc.list().subscribe({ next: c => (this.companies = c), error: () => {} });
    }
  }

  loadSeatUsage(): void {
    this.subsSvc.me().subscribe({
      next:  usage => { this.seatUsage = usage; },
      error: ()    => { this.seatUsage = null; },
    });
  }

  get seatsFull(): boolean {
    return !!this.seatUsage && this.seatUsage.used_seats >= this.seatUsage.max_seats;
  }

  get seatsWarning(): boolean {
    if (!this.seatUsage || this.seatUsage.max_seats === 0) return false;
    return this.seatUsage.used_seats / this.seatUsage.max_seats >= 0.8 && !this.seatsFull;
  }

  get filteredUsers(): User[] {
    if (!this.filterCompanyId) return this.users;
    return this.users.filter(u => u.company_id === this.filterCompanyId);
  }

  load(): void {
    this.loading = true;
    this.userSvc.list().subscribe({
      next:  users => { this.users = users; this.loading = false; },
      error: ()    => { this.loading = false; },
    });
  }

  openCreate(): void {
    const data: UserDialogData = { user: null, companies: this.companies };
    const ref = this.dialog.open(UserFormDialogComponent, { width: '480px', data });
    ref.afterClosed().subscribe(result => { if (result) { this.load(); this.loadSeatUsage(); } });
  }

  openSmtpConfig(): void {
    const cid = this.auth.currentUser?.company_id;
    const cname = this.auth.currentUser?.company_name ?? '';
    if (!cid) return;
    const data: SmtpDialogData = { companyId: cid, companyName: cname };
    this.dialog.open(SmtpConfigDialogComponent, { width: '560px', data });
  }

  openEdit(user: User): void {
    const data: UserDialogData = { user, companies: this.companies };
    const ref = this.dialog.open(UserFormDialogComponent, { width: '480px', data });
    ref.afterClosed().subscribe(result => { if (result) { this.load(); this.loadSeatUsage(); } });
  }

  resetLink(user: User): void {
    this.userSvc.resetPasswordLink(user.id).subscribe({
      next: res => {
        navigator.clipboard.writeText(res.resetUrl).then(
          () => this.snack.open('Link copiato negli appunti', 'OK', { duration: 4000 }),
          () => this.snack.open(res.resetUrl, 'OK', { duration: 10000 }),
        );
      },
      error: err => this.snack.open(err.error?.error || 'Errore', 'OK', { duration: 4000 }),
    });
  }

  delete(user: User): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'CONFIRM.DELETE_USER_TITLE', message: 'CONFIRM.DELETE_USER_MSG', messageParams: { name: user.name } },
    });
    ref.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.userSvc.delete(user.id).subscribe({
        next:  () => { this.snack.open('Utente eliminato', 'OK', { duration: 3000 }); this.load(); this.loadSeatUsage(); },
        error: err => this.snack.open(err.error?.error || 'Errore', 'OK', { duration: 4000 }),
      });
    });
  }

  roleLabel(role: string): string {
    const map: Record<string, string> = { superadmin: 'Super Admin', admin: 'Admin', user: 'Utente' };
    return map[role] ?? role;
  }

  roleColor(role: string): string {
    const map: Record<string, string> = { superadmin: 'warn', admin: 'accent', user: 'primary' };
    return map[role] ?? 'primary';
  }
}
