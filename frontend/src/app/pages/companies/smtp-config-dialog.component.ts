import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateModule } from '@ngx-translate/core';
import { SmtpSettingsService, SmtpSettings, SmtpSettingsPayload } from '../../core/services/smtp-settings.service';

export interface SmtpDialogData {
  companyId: number;
  companyName: string;
}

@Component({
  selector: 'app-smtp-config-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatButtonModule, MatDialogModule, MatFormFieldModule, MatIconModule,
    MatInputModule, MatSlideToggleModule,
    TranslateModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ 'SMTP.TITLE' | translate }} — {{ data.companyName }}</h2>
    <mat-dialog-content>
      <div class="grid">
        <mat-form-field appearance="outline" class="full">
          <mat-label>{{ 'SMTP.HOST' | translate }}</mat-label>
          <input matInput [(ngModel)]="host" placeholder="smtp.example.com">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ 'SMTP.PORT' | translate }}</mat-label>
          <input matInput type="number" [(ngModel)]="port">
        </mat-form-field>

        <mat-slide-toggle [(ngModel)]="secure" class="secure-toggle">{{ 'SMTP.SECURE' | translate }} (TLS 465)</mat-slide-toggle>

        <mat-form-field appearance="outline" class="full">
          <mat-label>{{ 'SMTP.USERNAME' | translate }}</mat-label>
          <input matInput [(ngModel)]="username" autocomplete="off">
        </mat-form-field>

        <mat-form-field appearance="outline" class="full">
          <mat-label>{{ 'SMTP.PASSWORD' | translate }}</mat-label>
          <input matInput [type]="hidePw ? 'password' : 'text'" [(ngModel)]="password" autocomplete="new-password"
                 [placeholder]="existing?.has_password ? ('SMTP.LEAVE_BLANK_KEEP' | translate) : ''">
          <button mat-icon-button matSuffix type="button" (click)="hidePw = !hidePw">
            <mat-icon>{{hidePw ? 'visibility_off' : 'visibility'}}</mat-icon>
          </button>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full">
          <mat-label>{{ 'SMTP.FROM_EMAIL' | translate }}</mat-label>
          <input matInput type="email" [(ngModel)]="fromEmail" placeholder="noreply@example.com">
        </mat-form-field>

        <mat-form-field appearance="outline" class="full">
          <mat-label>{{ 'SMTP.FROM_NAME' | translate }}</mat-label>
          <input matInput [(ngModel)]="fromName" placeholder="Stock Simple">
        </mat-form-field>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button color="warn" *ngIf="existing" (click)="remove()" [disabled]="saving">
        <mat-icon>delete</mat-icon> {{ 'COMMON.DELETE' | translate }}
      </button>
      <span class="spacer"></span>
      <button mat-button (click)="dialogRef.close(false)">{{ 'COMMON.CANCEL' | translate }}</button>
      <button mat-stroked-button (click)="test()" [disabled]="saving || !canTest()">{{ 'SMTP.TEST' | translate }}</button>
      <button mat-raised-button color="primary" (click)="save()" [disabled]="saving || !canSave()">{{ 'COMMON.SAVE' | translate }}</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .grid { display: grid; grid-template-columns: 1fr 120px; gap: 8px 12px; min-width: 480px; }
    .full { grid-column: 1 / -1; }
    .secure-toggle { grid-column: 1 / -1; padding: 4px 0 8px 0; }
    .spacer { flex: 1; }
  `],
})
export class SmtpConfigDialogComponent implements OnInit {
  existing: SmtpSettings | null = null;
  host = '';
  port = 587;
  secure = false;
  username = '';
  password = '';
  fromEmail = '';
  fromName = '';
  hidePw = true;
  saving = false;

  constructor(
    public dialogRef: MatDialogRef<SmtpConfigDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SmtpDialogData,
    private svc: SmtpSettingsService,
    private snack: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.svc.get(this.data.companyId).subscribe({
      next: s => {
        this.existing  = s;
        this.host      = s.host;
        this.port      = s.port;
        this.secure    = s.secure;
        this.username  = s.username;
        this.fromEmail = s.from_email;
        this.fromName  = s.from_name ?? '';
      },
      error: () => { this.existing = null; },
    });
  }

  canSave(): boolean {
    if (!this.host || !this.username || !this.fromEmail) return false;
    if (!this.existing && !this.password) return false; // first setup requires password
    return true;
  }

  canTest(): boolean {
    return !!this.existing;
  }

  private payload(): SmtpSettingsPayload {
    const p: SmtpSettingsPayload = {
      host: this.host, port: this.port, secure: this.secure,
      username: this.username, from_email: this.fromEmail, from_name: this.fromName || null,
    };
    if (this.password) p.password = this.password;
    return p;
  }

  save(): void {
    this.saving = true;
    this.svc.upsert(this.data.companyId, this.payload()).subscribe({
      next: () => { this.snack.open('SMTP salvato', 'OK', { duration: 3000 }); this.dialogRef.close(true); },
      error: err => { this.saving = false; this.snack.open(err.error?.error || 'Errore', 'OK', { duration: 4000 }); },
    });
  }

  test(): void {
    this.saving = true;
    this.svc.test(this.data.companyId).subscribe({
      next: r => {
        this.saving = false;
        if (r.ok) this.snack.open('Connessione SMTP riuscita', 'OK', { duration: 4000 });
        else this.snack.open(`Test fallito: ${r.error}`, 'OK', { duration: 6000 });
      },
      error: err => {
        this.saving = false;
        this.snack.open(`Test fallito: ${err.error?.error || err.message}`, 'OK', { duration: 6000 });
      },
    });
  }

  remove(): void {
    if (!confirm('Eliminare la configurazione SMTP?')) return;
    this.saving = true;
    this.svc.delete(this.data.companyId).subscribe({
      next: () => { this.snack.open('SMTP rimosso', 'OK', { duration: 3000 }); this.dialogRef.close(true); },
      error: err => { this.saving = false; this.snack.open(err.error?.error || 'Errore', 'OK', { duration: 4000 }); },
    });
  }
}
